// src/utils/nlpEngine.js
// Rule-based NLP engine for complaint classification, sentiment analysis,
// priority scoring, and keyword extraction.
// This mirrors the Python NLTK logic described in the report and can be
// replaced by a call to the Python microservice (see nlpService.js).

// ── Category keyword map ─────────────────────────────────────────────────────
const CATEGORY_RULES = {
  Infrastructure: {
    keywords: ['road', 'pothole', 'bridge', 'footpath', 'pavement', 'construction',
               'building', 'wall', 'drain', 'gutter', 'sidewalk', 'street', 'fallen tree'],
    department: 'Dept of Public Works',
  },
  'Water Supply': {
    keywords: ['water', 'pipe', 'leak', 'flood', 'sewage', 'tap', 'supply', 'overflow',
               'pipeline', 'drainage', 'bore', 'tank', 'contaminated'],
    department: 'Water Supply Dept',
  },
  Electricity: {
    keywords: ['electricity', 'electric', 'light', 'wire', 'power', 'voltage', 'streetlight',
               'blackout', 'outage', 'transformer', 'cable', 'current', 'bulb'],
    department: 'Electricity Board',
  },
  Sanitation: {
    keywords: ['garbage', 'waste', 'bin', 'trash', 'clean', 'litter', 'overflowing',
               'dump', 'sweeping', 'filth', 'hygiene', 'smell', 'odour', 'rodent'],
    department: 'Sanitation Dept',
  },
  Noise: {
    keywords: ['noise', 'loud', 'music', 'sound', 'midnight', 'disturbance', 'horn',
               'barking', 'speaker', 'party', 'construction noise'],
    department: 'Community Standards Office',
  },
  Safety: {
    keywords: ['dangerous', 'exposed', 'unsafe', 'hazard', 'fire', 'accident', 'urgent',
               'critical', 'emergency', 'injury', 'collapse', 'threat', 'attack'],
    department: 'Emergency Services / Code Enforcement',
  },
};

// ── Sentiment keyword lists ──────────────────────────────────────────────────
const NEGATIVE_STRONG = ['terrible', 'horrible', 'worst', 'dangerous', 'disgusting',
  'outrageous', 'unacceptable', 'pathetic', 'shameful', 'disgraceful', 'angry', 'furious'];
const NEGATIVE_MILD = ['bad', 'poor', 'broken', 'missing', 'delayed', 'frustrated',
  'disappointed', 'concern', 'problem', 'issue', 'fail', 'failed'];
const POSITIVE = ['thank', 'please', 'kindly', 'request', 'appreciate', 'grateful', 'good'];

// ── Urgency boost words ──────────────────────────────────────────────────────
const URGENCY_WORDS = ['urgent', 'immediately', 'emergency', 'critical', 'danger',
  'life', 'accident', 'injured', 'collapse', 'fire', 'exposed'];

// ── Tokenizer (simple whitespace + punctuation split) ───────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// ── Stop words (NLTK-style minimal set) ─────────────────────────────────────
const STOP_WORDS = new Set([
  'i','me','my','myself','we','our','you','your','he','she','it','they','them',
  'what','which','who','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might','shall',
  'a','an','the','and','but','or','nor','for','yet','so','in','on','at','to',
  'of','up','by','as','if','no','not','also','very','just','this','that','with',
  'from','there','here','then','than','so','about','after','before','its',
]);

// ── Keyword extraction ───────────────────────────────────────────────────────
function extractKeywords(text) {
  return tokenize(text)
    .filter((w) => !STOP_WORDS.has(w) && w.length > 3)
    .slice(0, 10);
}

// ── Classification ───────────────────────────────────────────────────────────
function classifyComplaint(text) {
  const tokens = tokenize(text);
  const scores = {};

  for (const [category, { keywords }] of Object.entries(CATEGORY_RULES)) {
    scores[category] = keywords.filter((kw) =>
      tokens.some((t) => t.includes(kw.replace(' ', '')) || kw.includes(t))
    ).length;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const category = best[1] > 0 ? best[0] : 'General';
  const department =
    CATEGORY_RULES[category]?.department || 'General Administration';
  const confidence = best[1] > 0 ? Math.min(0.6 + best[1] * 0.1, 0.98) : 0.5;

  return { category, department, confidence };
}

// ── Sentiment analysis ───────────────────────────────────────────────────────
function analyzeSentiment(text) {
  const t = text.toLowerCase();
  const strongNeg = NEGATIVE_STRONG.filter((w) => t.includes(w)).length;
  const mildNeg   = NEGATIVE_MILD.filter((w) => t.includes(w)).length;
  const pos        = POSITIVE.filter((w) => t.includes(w)).length;

  if (strongNeg >= 2 || (strongNeg >= 1 && mildNeg >= 2))
    return 'Highly negative';
  if (strongNeg >= 1) return 'Negative';

  // If polite/positive language is present, treat as Neutral even when
  // there's a mild negative token (e.g. "Please fix the issue kindly").
  if (pos >= 1) return 'Neutral';

  if (mildNeg >= 2) return 'Negative';
  if (mildNeg >= 1) return 'Negative';

  return 'Neutral';
}

// ── Priority scoring ─────────────────────────────────────────────────────────
function scorePriority(text, category) {
  const t = text.toLowerCase();
  const urgencyHits = URGENCY_WORDS.filter((w) => t.includes(w)).length;
  let score = 5; // default Medium

  if (urgencyHits >= 2 || category === 'Safety')   score = 9;
  else if (urgencyHits === 1)                       score = 7;
  else if (category === 'Electricity' || category === 'Water Supply') score = 6;
  else if (category === 'Noise' || category === 'General')             score = 3;

  // Boost for strong negative words
  const sentiment = analyzeSentiment(text);
  if (sentiment === 'Highly negative') score = Math.min(score + 1, 10);

  const label =
    score >= 9 ? 'Critical' :
    score >= 7 ? 'High'     :
    score >= 5 ? 'Medium'   : 'Low';

  return { label, score };
}

// ── Auto-generate summary ────────────────────────────────────────────────────
function generateSummary(text, category, department, priority) {
  const summaries = {
    Infrastructure: `Infrastructure issue detected (priority: ${priority.label}). Routing to ${department} for assessment and repair scheduling.`,
    'Water Supply':  `Water supply complaint received (priority: ${priority.label}). Routing to ${department} for urgent inspection.`,
    Electricity:     `Electrical issue reported (priority: ${priority.label}). Routing to ${department} for inspection.`,
    Sanitation:      `Sanitation concern logged (priority: ${priority.label}). Routing to ${department} for collection and cleanup.`,
    Noise:           `Noise complaint recorded (priority: ${priority.label}). Routing to ${department} for enforcement action.`,
    Safety:          `⚠️ SAFETY HAZARD detected (priority: ${priority.label}). Routing to ${department} — immediate attention required.`,
    General:         `General complaint received (priority: ${priority.label}). Routing to ${department} for review.`,
  };
  return summaries[category] || summaries.General;
}

// ── Main export: full analysis pipeline ─────────────────────────────────────
function analyzeComplaint(text, title = '') {
  const fullText = `${title} ${text}`.trim();

  const { category, department, confidence } = classifyComplaint(fullText);
  const sentiment  = analyzeSentiment(fullText);
  const priority   = scorePriority(fullText, category);
  const keywords   = extractKeywords(fullText);
  const summary    = generateSummary(fullText, category, department, priority);

  return {
    category,
    department,
    priority,
    sentiment,
    keywords,
    summary,
    confidence,
    processedBy: 'rule-based',
  };
}

module.exports = { analyzeComplaint, classifyComplaint, analyzeSentiment,
                   scorePriority, extractKeywords };
