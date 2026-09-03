# DME FWA Vulnerability Dashboard

Internal analysis tool that reads the CMS Medicare Claims Processing Manual (Chapter 20 —
DMEPOS) and generates fraud/waste/abuse (FWA) vulnerability hypotheses, ranked and simulated
against a set of provider/supplier archetypes.

See [`DME.md`](./DME.md) for what the analysis actually does, how it's structured, and how to
extend it with new source documents or archetypes.

## Project layout

```
data/source/       Source documents (extracted manual text)
pipeline/          Python scripts that generate the analysis (01-05, run in order)
pipeline/output/   Generated JSON artifacts the dashboard reads (committed, since they ARE the analysis)
backend/           FastAPI server that serves pipeline/output/*.json to the frontend
frontend/          React/Vite app (forked from a prior Figma Make project), CMS-themed UI
```

## Prerequisites

- Python 3.11+ with `uv` or `pip`
- Node.js 18+ with `pnpm` (or `npm`)
- An OpenAI-compatible LLM API key (only needed to *regenerate* the analysis — not needed to
  just run the dashboard against the already-committed `pipeline/output/*.json`)

## 1. Configure environment

```bash
cp .env.example .env
# fill in LLM_API_KEY (and optionally LLM_BASE_URL / LLM_MODEL_NAME / LLM_MODEL_NAME_REASONING)
```

Only required if you intend to re-run the pipeline. Running the backend/frontend against the
already-generated `pipeline/output/*.json` does not require an API key.

## 2. Run the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt -r pipeline/requirements.txt
uvicorn backend.main:app --port 8000
```

Backend serves `http://localhost:8000`, reading directly from `pipeline/output/*.json`.

## 3. Run the frontend

```bash
cd frontend
npm install --legacy-peer-deps  # react-simple-maps' peer-dep range predates React 19
npm run dev
```

Frontend serves `http://localhost:8443` (Vite's configured port for this project). The
dashboard lives in the sidebar under **Signal Workflows → DME Vulnerabilities**.

Frontend expects the backend at `http://localhost:8000` by default (see `VITE_API_BASE` if you
need to point it elsewhere — set it in `frontend/.env.local`).

## 4. (Optional) Regenerate the analysis

Only needed if you've changed the source manual, the archetype list, or want to redo the
LLM-generated hypotheses/briefs. Requires `.env` to be configured with a working API key. See
[`DME.md`](./DME.md) for the full pipeline explanation.

```bash
source .venv/bin/activate
python pipeline/01_extract_rules.py
python pipeline/02_generate_hypotheses.py
python pipeline/03_generate_deepdives.py
python pipeline/04_aggregate.py
python pipeline/05_generate_briefs.py
```

Each script writes to `pipeline/output/`; the backend picks up changes on next request (no
restart needed — it reads the JSON files fresh each call).
