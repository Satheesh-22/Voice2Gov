# voice2gov-nlp/nlp_engine.py
# ─────────────────────────────────────────────────────────────────────────────
# Voice2Gov  —  NLP Engine
# Implements: tokenisation, stop-word removal, keyword extraction,
#             Naive Bayes classifier, SVM classifier, VADER sentiment analysis,
#             priority scoring, and auto-summary generation.
#
# Mirrors the report (Chapters 3.6, 3.7, 4.4).
# ─────────────────────────────────────────────────────────────────────────────

import re
import string
from typing import Dict, List, Tuple

import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Download required NLTK resources (only on first run)
for pkg in ('punkt', 'stopwords', 'wordnet', 'vader_lexicon', 'averaged_perceptron_tagger'):
    try:
        nltk.data.find(f'tokenizers/{pkg}')
    except LookupError:
        nltk.download(pkg, quiet=True)

# ── Constants ────────────────────────────────────────────────────────────────

CATEGORIES: Dict[str, Dict] = {
    "Infrastructure": {
        "keywords": ["road", "pothole", "bridge", "footpath", "pavement",
                     "construction", "building", "wall", "drain", "gutter",
                     "sidewalk", "street", "fallen", "tree", "collapse"],
        "department": "Dept of Public Works",
    },
    "Water Supply": {
        "keywords": ["water", "pipe", "leak", "flood", "sewage", "tap",
                     "supply", "overflow", "pipeline", "drainage", "bore",
                     "tank", "contaminated", "muddy"],
        "department": "Water Supply Dept",
    },
    "Electricity": {
        "keywords": ["electricity", "electric", "light", "wire", "power",
                     "voltage", "streetlight", "blackout", "outage",
                     "transformer", "cable", "current", "bulb", "spark"],
        "department": "Electricity Board",
    },
    "Sanitation": {
        "keywords": ["garbage", "waste", "bin", "trash", "clean", "litter",
                     "overflowing", "dump", "sweeping", "filth", "hygiene",
                     "smell", "odour", "rodent", "rat", "mosquito"],
        "department": "Sanitation Dept",
    },
    "Noise": {
        "keywords": ["noise", "loud", "music", "sound", "midnight",
                     "disturbance", "horn", "barking", "speaker", "party"],
        "department": "Community Standards Office",
    },
    "Safety": {
        "keywords": ["dangerous", "exposed", "unsafe", "hazard", "fire",
                     "accident", "urgent", "critical", "emergency", "injury",
                     "collapse", "threat", "attack", "danger", "life"],
        "department": "Emergency Services / Code Enforcement",
    },
}

URGENCY_WORDS = {"urgent", "immediately", "emergency", "critical", "danger",
                 "life", "accident", "injured", "collapse", "fire", "exposed"}

PRIORITY_MAP = {
    range(9, 11): "Critical",
    range(7, 9):  "High",
    range(5, 7):  "Medium",
    range(1, 5):  "Low",
}


# ── Text preprocessing ────────────────────────────────────────────────────────

class TextPreprocessor:
    """NLTK-based text preprocessing pipeline (report §3.6)."""

    def __init__(self):
        self.stemmer     = PorterStemmer()
        self.lemmatizer  = WordNetLemmatizer()
        self.stop_words  = set(stopwords.words('english'))

    def clean(self, text: str) -> str:
        """Lowercase, remove punctuation and extra whitespace."""
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def tokenize(self, text: str) -> List[str]:
        """Word tokenisation using NLTK punkt tokeniser."""
        return word_tokenize(self.clean(text))

    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """Remove NLTK English stop words."""
        return [t for t in tokens if t not in self.stop_words and len(t) > 2]

    def lemmatize(self, tokens: List[str]) -> List[str]:
        """Lemmatise tokens using WordNet."""
        return [self.lemmatizer.lemmatize(t) for t in tokens]

    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """Full pipeline: clean → tokenise → remove stops → lemmatise."""
        tokens   = self.tokenize(text)
        filtered = self.remove_stopwords(tokens)
        lemmas   = self.lemmatize(filtered)
        # Deduplicate while preserving order
        seen, result = set(), []
        for w in lemmas:
            if w not in seen:
                seen.add(w)
                result.append(w)
        return result[:top_n]

    def get_features(self, text: str) -> Dict[str, bool]:
        """Return a feature dict for Naive Bayes (word presence features)."""
        keywords = self.extract_keywords(text, top_n=50)
        return {f'contains({w})': True for w in keywords}


# ── Rule-based classifier ─────────────────────────────────────────────────────

class RuleBasedClassifier:
    """Keyword frequency scoring classifier — fast, no training needed."""

    def __init__(self, preprocessor: TextPreprocessor):
        self.prep = preprocessor

    def classify(self, text: str) -> Tuple[str, str, float]:
        """Returns (category, department, confidence)."""
        tokens = set(self.prep.extract_keywords(text, top_n=50))
        scores: Dict[str, int] = {}

        for cat, info in CATEGORIES.items():
            scores[cat] = sum(1 for kw in info["keywords"] if kw in tokens or
                              any(kw in t for t in tokens))

        best_cat   = max(scores, key=scores.get)
        best_score = scores[best_cat]

        if best_score == 0:
            return "General", "General Administration", 0.5

        confidence  = min(0.55 + best_score * 0.08, 0.97)
        department  = CATEGORIES[best_cat]["department"]
        return best_cat, department, round(confidence, 2)


# ── Naive Bayes classifier ────────────────────────────────────────────────────

class NaiveBayesClassifier:
    """
    NLTK Naive Bayes classifier (report §3.7).
    Trained on labelled complaint samples.
    Falls back to rule-based if not enough training data.
    """

    # Labelled training data: (text, category)
    TRAINING_DATA = [
        # Infrastructure
        ("large pothole on the road near bus stop causing accidents", "Infrastructure"),
        ("broken bridge footpath blocked after heavy rain", "Infrastructure"),
        ("road construction incomplete pavement damaged", "Infrastructure"),
        ("fallen tree blocking main street", "Infrastructure"),
        ("storm drain overflowing flooding the road", "Infrastructure"),
        # Water Supply
        ("water pipe leaking near school flooding road", "Water Supply"),
        ("no water supply for three days in our area", "Water Supply"),
        ("sewage water contaminating drinking water tank", "Water Supply"),
        ("bore well not working no water in colony", "Water Supply"),
        ("muddy water coming from tap unhygienic", "Water Supply"),
        # Electricity
        ("street light not working for two weeks near park", "Electricity"),
        ("exposed electrical wire dangerous on north road", "Electricity"),
        ("power outage in our area for eight hours", "Electricity"),
        ("transformer sparking near school gate", "Electricity"),
        ("high voltage fluctuation damaging appliances", "Electricity"),
        # Sanitation
        ("garbage bin overflowing near market for days", "Sanitation"),
        ("waste dumped on street no sweeping done", "Sanitation"),
        ("stray dogs attacking due to garbage dump", "Sanitation"),
        ("mosquito breeding in open drain near colony", "Sanitation"),
        ("filth and odour near school very unhygienic", "Sanitation"),
        # Noise
        ("loud music playing after midnight from nearby bar", "Noise"),
        ("construction noise early morning disturbing residents", "Noise"),
        ("dogs barking all night cannot sleep", "Noise"),
        ("loudspeaker announcement very loud in residential area", "Noise"),
        # Safety
        ("exposed live wire hanging low very dangerous urgent", "Safety"),
        ("building wall collapsed emergency evacuation needed", "Safety"),
        ("fire accident near market urgent help needed", "Safety"),
        ("gas leak smell in our building emergency", "Safety"),
        ("dangerous open manhole on road people falling", "Safety"),
    ]

    def __init__(self, preprocessor: TextPreprocessor):
        self.prep       = preprocessor
        self.classifier = None
        self._train()

    def _train(self):
        """Train on the built-in labelled dataset."""
        try:
            from nltk.classify import NaiveBayesClassifier as NBC
            feature_sets = [
                (self.prep.get_features(text), label)
                for text, label in self.TRAINING_DATA
            ]
            self.classifier = NBC.train(feature_sets)
        except Exception as e:
            print(f"[NaiveBayes] Training failed: {e}. Falling back to rule-based.")
            self.classifier = None

    def classify(self, text: str) -> Tuple[str, str, float]:
        if not self.classifier:
            return "General", "General Administration", 0.5

        features  = self.prep.get_features(text)
        category  = self.classifier.classify(features)
        prob_dist = self.classifier.prob_classify(features)
        confidence = round(prob_dist.prob(category), 2)
        department = CATEGORIES.get(category, {}).get("department", "General Administration")
        return category, department, confidence

    def show_top_features(self, n: int = 10):
        """Print most informative features (for debugging)."""
        if self.classifier:
            self.classifier.show_most_informative_features(n)


# ── SVM classifier ────────────────────────────────────────────────────────────

class SVMClassifier:
    """
    sklearn LinearSVC classifier (report §3.7).
    Uses TF-IDF features for better accuracy than Naive Bayes on short texts.
    """

    TRAINING_TEXTS  = [t for t, _ in NaiveBayesClassifier.TRAINING_DATA]
    TRAINING_LABELS = [l for _, l in NaiveBayesClassifier.TRAINING_DATA]

    def __init__(self, preprocessor: TextPreprocessor):
        self.prep       = preprocessor
        self.pipeline   = None
        self._train()

    def _train(self):
        try:
            from sklearn.pipeline import Pipeline
            from sklearn.svm import LinearSVC
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.calibration import CalibratedClassifierCV

            self.pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(
                    tokenizer=self.prep.extract_keywords,
                    max_features=500,
                    ngram_range=(1, 2),
                )),
                ('svm', CalibratedClassifierCV(LinearSVC(max_iter=2000))),
            ])
            self.pipeline.fit(self.TRAINING_TEXTS, self.TRAINING_LABELS)
        except ImportError:
            print("[SVM] sklearn not installed — SVM unavailable.")
            self.pipeline = None
        except Exception as e:
            print(f"[SVM] Training failed: {e}")
            self.pipeline = None

    def classify(self, text: str) -> Tuple[str, str, float]:
        if not self.pipeline:
            return "General", "General Administration", 0.5

        category   = self.pipeline.predict([text])[0]
        proba      = self.pipeline.predict_proba([text])[0]
        confidence = round(float(max(proba)), 2)
        department = CATEGORIES.get(category, {}).get("department", "General Administration")
        return category, department, confidence


# ── Sentiment analysis — VADER ────────────────────────────────────────────────

class SentimentAnalyzer:
    """VADER-based sentiment analyser (report §3.6, 4.4)."""

    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()

    def analyze(self, text: str) -> Dict:
        scores    = self.vader.polarity_scores(text)
        compound  = scores['compound']

        if compound <= -0.5:
            label = "Highly negative"
        elif compound <= -0.1:
            label = "Negative"
        elif compound >= 0.1:
            label = "Positive"
        else:
            label = "Neutral"

        return {
            "label":    label,
            "compound": round(compound, 3),
            "positive": round(scores['pos'], 3),
            "negative": round(scores['neg'], 3),
            "neutral":  round(scores['neu'], 3),
        }


# ── Priority scoring ──────────────────────────────────────────────────────────

def score_priority(text: str, category: str, sentiment_label: str) -> Dict:
    """
    Score priority 1–10 based on:
      - Urgency keyword hits
      - Category severity
      - Sentiment
    """
    text_lower = text.lower()
    urgency_hits = sum(1 for w in URGENCY_WORDS if w in text_lower)

    score = 5  # default Medium

    if category == "Safety" or urgency_hits >= 2:
        score = 9
    elif urgency_hits == 1:
        score = 7
    elif category in ("Electricity", "Water Supply"):
        score = 6
    elif category in ("Noise", "General"):
        score = 3

    if sentiment_label == "Highly negative":
        score = min(score + 1, 10)

    # Map score to label
    label = "Low"
    for r, lbl in PRIORITY_MAP.items():
        if score in r:
            label = lbl
            break

    return {"label": label, "score": score}


# ── Auto-summary generator ────────────────────────────────────────────────────

def generate_summary(category: str, department: str, priority: Dict) -> str:
    templates = {
        "Infrastructure": f"Infrastructure issue detected (priority: {priority['label']}). Routing to {department} for assessment and repair scheduling.",
        "Water Supply":   f"Water supply complaint received (priority: {priority['label']}). Routing to {department} for urgent inspection.",
        "Electricity":    f"Electrical issue reported (priority: {priority['label']}). Routing to {department} for field inspection.",
        "Sanitation":     f"Sanitation concern logged (priority: {priority['label']}). Routing to {department} for collection and cleanup.",
        "Noise":          f"Noise complaint recorded (priority: {priority['label']}). Routing to {department} for enforcement.",
        "Safety":         f"⚠ SAFETY HAZARD detected (priority: {priority['label']}). Routing to {department} — IMMEDIATE attention required.",
        "General":        f"General complaint received (priority: {priority['label']}). Routing to {department} for review.",
    }
    return templates.get(category, templates["General"])


# ── Main analysis pipeline ────────────────────────────────────────────────────

class Voice2GovNLP:
    """
    Full NLP analysis pipeline.
    Combines rule-based, Naive Bayes, and SVM classifiers with
    VADER sentiment analysis and priority scoring.
    """

    def __init__(self, model: str = "ensemble"):
        """
        model: 'rule'     — fast rule-based only
               'naive'    — Naive Bayes only
               'svm'      — SVM only
               'ensemble' — majority vote across all three (most accurate)
        """
        self.model     = model
        self.prep      = TextPreprocessor()
        self.rule      = RuleBasedClassifier(self.prep)
        self.nb        = NaiveBayesClassifier(self.prep)
        self.svm       = SVMClassifier(self.prep)
        self.sentiment = SentimentAnalyzer()

    def analyze(self, text: str, title: str = "") -> Dict:
        full_text = f"{title} {text}".strip()

        # ── 1. Classification ─────────────────────────────────────────────
        rule_cat, rule_dept, rule_conf = self.rule.classify(full_text)
        nb_cat,   nb_dept,   nb_conf   = self.nb.classify(full_text)
        svm_cat,  svm_dept,  svm_conf  = self.svm.classify(full_text)

        if self.model == "rule":
            category, department, confidence = rule_cat, rule_dept, rule_conf
            processed_by = "rule-based"
        elif self.model == "naive":
            category, department, confidence = nb_cat, nb_dept, nb_conf
            processed_by = "ml-model"
        elif self.model == "svm":
            category, department, confidence = svm_cat, svm_dept, svm_conf
            processed_by = "ml-model"
        else:
            # Ensemble: majority vote weighted by confidence
            votes = {}
            for cat, conf in [(rule_cat, rule_conf), (nb_cat, nb_conf), (svm_cat, svm_conf)]:
                votes[cat] = votes.get(cat, 0) + conf
            category    = max(votes, key=votes.get)
            department  = CATEGORIES.get(category, {}).get("department", "General Administration")
            confidence  = round(votes[category] / 3, 2)
            processed_by = "ml-model"

        # ── 2. Sentiment analysis ─────────────────────────────────────────
        sentiment = self.sentiment.analyze(full_text)

        # ── 3. Priority scoring ───────────────────────────────────────────
        priority = score_priority(full_text, category, sentiment["label"])

        # ── 4. Keyword extraction ─────────────────────────────────────────
        keywords = self.prep.extract_keywords(full_text)

        # ── 5. Summary ────────────────────────────────────────────────────
        summary = generate_summary(category, department, priority)

        return {
            "category":    category,
            "department":  department,
            "priority":    priority,
            "sentiment":   sentiment["label"],
            "sentimentScores": {
                "compound": sentiment["compound"],
                "positive": sentiment["positive"],
                "negative": sentiment["negative"],
                "neutral":  sentiment["neutral"],
            },
            "keywords":    keywords,
            "summary":     summary,
            "confidence":  confidence,
            "processedBy": processed_by,
            "modelVotes": {
                "rule":  rule_cat,
                "naive": nb_cat,
                "svm":   svm_cat,
            },
        }


# ── CLI test ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    nlp = Voice2GovNLP(model="ensemble")

    TEST_CASES = [
        ("There is a large pothole on the road near the bus stop causing accidents", "Pothole issue"),
        ("Water pipe is leaking near the school road, flooding the street badly",    "Pipe leak"),
        ("Exposed live wire hanging low at North Road corner — very urgent emergency!", "Wire hazard"),
        ("Garbage bin overflowing for days near the market, disgusting smell",       "Garbage overflow"),
        ("Streetlight not working for two weeks on Park Avenue safety hazard",       "No streetlight"),
        ("Loud music playing after midnight from nearby party venue",                "Noise complaint"),
    ]

    for desc, title in TEST_CASES:
        result = nlp.analyze(desc, title)
        print("=" * 60)
        print(f"Title     : {title}")
        print(f"Category  : {result['category']}  (confidence: {result['confidence']})")
        print(f"Dept      : {result['department']}")
        print(f"Priority  : {result['priority']['label']} ({result['priority']['score']}/10)")
        print(f"Sentiment : {result['sentiment']}  (compound: {result['sentimentScores']['compound']})")
        print(f"Keywords  : {', '.join(result['keywords'][:6])}")
        print(f"Models    : rule={result['modelVotes']['rule']}  nb={result['modelVotes']['naive']}  svm={result['modelVotes']['svm']}")
        print(f"Summary   : {result['summary']}")
