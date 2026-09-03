import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "pipeline" / "output"

app = FastAPI(title="DME FWA Vulnerability Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8443", "http://127.0.0.1:8443"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _load(name: str):
    path = OUTPUT_DIR / name
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found - run the pipeline first")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/summary")
def get_summary():
    return _load("summary.json")


@app.get("/api/hypotheses")
def get_hypotheses():
    return _load("hypotheses.json")


@app.get("/api/hypotheses/{hypothesis_id}")
def get_hypothesis(hypothesis_id: str):
    hyps = _load("hypotheses.json")
    for h in hyps:
        if h["id"] == hypothesis_id:
            return h
    raise HTTPException(status_code=404, detail="hypothesis not found")


@app.get("/api/deepdives/{hypothesis_id}")
def get_deepdive(hypothesis_id: str):
    deepdives = _load("deepdives.json")
    if hypothesis_id not in deepdives:
        raise HTTPException(status_code=404, detail="no deep dive for this hypothesis")
    return deepdives[hypothesis_id]


@app.get("/api/briefs/{hypothesis_id}")
def get_brief(hypothesis_id: str):
    briefs = _load("briefs.json")
    if hypothesis_id not in briefs:
        raise HTTPException(status_code=404, detail="no brief for this hypothesis")
    return briefs[hypothesis_id]


@app.get("/api/archetype-matrix")
def get_archetype_matrix():
    return _load("archetype_matrix.json")


@app.get("/api/signal-library")
def get_signal_library():
    return _load("signal_library.json")


@app.get("/api/graph-analytics")
def get_graph_analytics():
    return _load("graph_analytics.json")


@app.get("/api/rule-collisions")
def get_rule_collisions():
    return _load("rule_collisions.json")


@app.get("/api/watchlist")
def get_watchlist():
    return _load("watchlist.json")
