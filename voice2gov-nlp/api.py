# voice2gov-nlp/api.py
# ─────────────────────────────────────────────────────────────────────────────
# Voice2Gov  —  Python NLP Microservice (FastAPI)
# Node.js backend calls this service via  POST /analyze
# Run:  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import time
import logging

from nlp_engine import Voice2GovNLP

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voice2gov-nlp")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Voice2Gov NLP Microservice",
    description="NLP & ML analysis engine for the Citizen Grievance Intelligence System",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Load NLP engine at startup ────────────────────────────────────────────────
NLP_MODEL = os.getenv("NLP_MODEL", "ensemble")   # rule | naive | svm | ensemble
nlp_engine: Optional[Voice2GovNLP] = None

@app.on_event("startup")
async def load_model():
    global nlp_engine
    logger.info(f"Loading NLP engine (model={NLP_MODEL})...")
    start = time.time()
    nlp_engine = Voice2GovNLP(model=NLP_MODEL)
    logger.info(f"NLP engine ready in {time.time() - start:.2f}s")


# ── Request / Response schemas ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text:  str = Field(..., min_length=3, description="Complaint description")
    title: str = Field("", description="Complaint title (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "text":  "There is a large dangerous pothole on the road near the bus stop",
                "title": "Pothole issue",
            }
        }

class PriorityResult(BaseModel):
    label: str
    score: int

class SentimentScores(BaseModel):
    compound: float
    positive: float
    negative: float
    neutral:  float

class ModelVotes(BaseModel):
    rule:  str
    naive: str
    svm:   str

class AnalyzeResponse(BaseModel):
    success:         bool
    category:        str
    department:      str
    priority:        PriorityResult
    sentiment:       str
    sentimentScores: SentimentScores
    keywords:        List[str]
    summary:         str
    confidence:      float
    processedBy:     str
    modelVotes:      ModelVotes
    processingMs:    float

class BatchAnalyzeRequest(BaseModel):
    complaints: List[AnalyzeRequest] = Field(..., max_items=50)

class HealthResponse(BaseModel):
    status:  str
    model:   str
    version: str


# ── Simple API key guard (optional) ──────────────────────────────────────────

NLP_API_KEY = os.getenv("NLP_API_KEY", "")   # leave empty to disable

async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if NLP_API_KEY and x_api_key != NLP_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return {"status": "ok", "model": NLP_MODEL, "version": "1.0.0"}


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    tags=["NLP"],
    summary="Analyse a single complaint",
)
async def analyze(
    body: AnalyzeRequest,
    _: None = Depends(verify_api_key),
):
    if nlp_engine is None:
        raise HTTPException(status_code=503, detail="NLP engine not loaded yet")

    start  = time.time()
    result = nlp_engine.analyze(body.text, body.title)
    elapsed_ms = round((time.time() - start) * 1000, 1)

    logger.info(
        f"Analyzed: category={result['category']}  priority={result['priority']['label']}"
        f"  confidence={result['confidence']}  ({elapsed_ms}ms)"
    )

    return {
        "success":         True,
        "processingMs":    elapsed_ms,
        **result,
    }


@app.post(
    "/analyze/batch",
    tags=["NLP"],
    summary="Analyse up to 50 complaints in one request",
)
async def analyze_batch(
    body: BatchAnalyzeRequest,
    _: None = Depends(verify_api_key),
):
    if nlp_engine is None:
        raise HTTPException(status_code=503, detail="NLP engine not loaded yet")

    results = []
    for item in body.complaints:
        start  = time.time()
        result = nlp_engine.analyze(item.text, item.title)
        elapsed_ms = round((time.time() - start) * 1000, 1)
        results.append({"success": True, "processingMs": elapsed_ms, **result})

    return {"success": True, "count": len(results), "results": results}
