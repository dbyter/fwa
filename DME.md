# The DME FWA Analysis

## What this is

A defensive, hypothesis-generation exercise: given the CMS Medicare Claims Processing Manual,
Chapter 20 (Durable Medical Equipment, Prosthetics, Orthotics, and Supplies — DMEPOS), identify
ways different provider/supplier archetypes could exploit, stretch, or systematically abuse the
billing rules, and translate each into something a payer/CPI/SIU team could actually act on:
detection signals, payer-side controls, and a CMS-source-cited briefing memo.

This is **not** proof of fraud. Every hypothesis is explicitly framed as a testable pattern with
a stated false-positive explanation and the evidence needed to disambiguate it from legitimate
billing. Treat pipeline output as a starting point for analytics/audit work, not a conclusion.

## Source material

`data/source/clm104c20.txt` — plain-text extraction of the CMS manual PDF (`clm104c20.pdf`),
~5,800 lines / ~260K characters. If you need to re-extract from a PDF, any text extraction tool
works; the pipeline just needs a plain `.txt` file with roughly one logical line per manual
sentence/bullet (exact formatting doesn't matter, chunking is line-count-based).

## Pipeline (`pipeline/`)

Each stage writes to `pipeline/output/` and is idempotent — re-running overwrites its own output.
All LLM calls run through `pipeline/lib/llm.py`, using `LLM_MODEL_NAME` (fast/cheap) or
`LLM_MODEL_NAME_REASONING` (higher-quality) from `.env`. All three generation stages parallelize
their LLM calls with a thread pool (`MAX_WORKERS = 32` per script).

### `01_extract_rules.py` → `rules.json`
Chunks the manual (900 lines/chunk, 60-line overlap) and asks the LLM to pull out discrete,
citable billing rules per chunk (section, rule text, tags like `rental`, `modifiers`,
`same_or_similar`, etc). This is the grounding corpus every downstream hypothesis cites back to.

### `02_generate_hypotheses.py` → `hypotheses.json`
The core generation step. Takes the full rule corpus, plus the archetype profiles
(`pipeline/lib/archetypes.py`) and the 8 "collision category" lenses
(`pipeline/lib/archetypes.py::COLLISION_CATEGORIES` — rule collisions, temporal exploitation,
entity arbitrage, code-path arbitrage, distributed/network behavior, low-and-slow behavior,
adaptive behavior, archetype differences), and runs 3 thematic batches in parallel (temporal
exploitation, coding/entity arbitrage, network/adaptive behavior) asking for ~8-10 hypotheses
each. Every hypothesis gets: vulnerability description, which archetypes are relevant and why,
economic incentive, claims manifestation, detection signals, graph/network signals, a
false-positive explanation, disambiguating evidence, a detection-rule pseudocode/SQL sketch,
1-5 severity scores (financial impact / likelihood / detectability / confidence), CMS
citations (explicit vs. inferred), and collision-category tags.

All hypotheses are then scored (`financial_impact * likelihood + confidence - detectability*0.5`)
and ranked; the top 10 are flagged `is_top10` and get the deeper treatment below.

### `03_generate_deepdives.py` → `deepdives.json`
For each top-10 hypothesis, generates:
- **`recommended_actions`** — 4-7 prioritized payer-side actions (`immediate` / `near_term` /
  `structural`), each tied to a rationale and which archetypes it targets. This is the single
  most important output — it's what shows first in the dashboard.
- **`minimum_viable_analytic`** — a concrete, buildable analytic spec (data sources, joins,
  features, scoring) a payer could actually implement against their claims warehouse.
- **`archetype_misuse_ranking`** — for each archetype flagged as relevant to this hypothesis, a
  short (not narrative) ranking: `misuse_potential` (1-5), one-sentence `why` tied to the
  archetype's scored attributes, one-to-two-sentence `how` describing the concrete billing
  behavior. Ranked highest-to-lowest. (An earlier version of this generated full multi-stage
  adaptation timelines per archetype — dropped because it was dense and not actually more useful
  than the short ranked form for a first read.)

### `04_aggregate.py` → `archetype_matrix.json`, `signal_library.json`, `graph_analytics.json`, `rule_collisions.json`, `watchlist.json`, `summary.json`
Pure Python aggregation over `hypotheses.json` — no LLM calls. Cross-tabulates archetypes against
hypotheses, dedupes detection/graph signals with backlinks to which hypotheses use them, groups
by collision category, and flags high-financial-impact / hard-to-detect hypotheses into a
watchlist. Re-run this any time `hypotheses.json` changes.

### `05_generate_briefs.py` → `briefs.json`
For each top-10 hypothesis, drafts a CPI (CMS Center for Program Integrity)-style briefing memo:
issue summary, background, findings, legal/regulatory basis, an executive recommendation
summary, next steps, and references. It's explicitly instructed to keep two kinds of sourcing
distinct: the CMS manual citations already on the hypothesis (`cms_source`), and the real-world
corroborating references in `pipeline/output/web_references.json` (OIG reports, DOJ case
outcomes, MAC guidance) — the latter are framed as "comparable enforcement history / documented
risk category," never as direct proof of this specific hypothesis.

**`web_references.json` is hand-curated, not scraped automatically.** It was built by web-
searching each top-10 hypothesis's theme (e.g. "OIG DME automatic refill fraud", "DOJ Medicare
DME telemedicine kickback case") and hand-picking real, verifiable sources. If you regenerate
`02_generate_hypotheses.py` and get different top-10 IDs, you'll need to redo this research and
update the file (keyed by hypothesis ID) before re-running `05_generate_briefs.py` — otherwise
those hypotheses just won't have references (the pipeline degrades gracefully, it doesn't
invent URLs).

## Archetypes (`pipeline/lib/archetypes.py`)

18 provider/supplier archetypes, each scored 1-5 on 12 behavioral dimensions (financial
pressure, risk tolerance, Medicare dependence, compliance sophistication, coding sophistication,
access to beneficiaries, referral relationships, geographic reach, willingness to exploit
ambiguity, volume-growth objective, audit awareness, coordination with others), plus a
qualitative `notes` field. These profiles are what let the LLM reason about *which* archetypes
would plausibly gravitate toward a given scheme, instead of treating "a DME supplier" as
homogeneous.

**To add a new archetype:** add an entry to the `ARCHETYPES` list with all 12 scored fields
plus `name` and `notes`. It'll automatically be available to `02_generate_hypotheses.py` (which
passes the full list to the LLM) and any hypothesis that names it will show up correctly in
`03_generate_deepdives.py` and the dashboard's archetype matrix/ranking. No other code changes
needed.

## Adding a new source document / expanding scope

1. Extract the new document to plain text and drop it in `data/source/`.
2. Either point `01_extract_rules.py`'s `MANUAL_PATH` at it, or (if you want to combine multiple
   manuals into one corpus) concatenate them into a single `.txt` and re-point `MANUAL_PATH`.
3. Re-run the full pipeline in order (`01` → `05`). Note `02` and `05` cost real LLM tokens on
   the reasoning model — `01` and `03` are the cheaper/faster stages.
4. If new top-10 hypotheses come out of a rerun, redo the `web_references.json` research step
   (see above) before running `05`.

## Dashboard mapping

The frontend (`frontend/src/FwaVulnerabilities.tsx`) has two views, added as a tab in the prior
"Medicare Integrity Monitoring" Figma Make app, under Supplier Analysis:

- **List view** — all hypotheses from `hypotheses.json`, ranked, with severity/category/archetype
  columns.
- **Deep dive** (click a row) — two tabs:
  - *Recommended Actions & Brief* — `recommended_actions` + the full memo from `briefs.json`.
  - *Archetypes & Insights* — just the `archetype_misuse_ranking` list, plus the vulnerability
    summary shown above both tabs.

Everything is served by `backend/main.py`, which just reads the JSON files straight off disk —
there's no database. Regenerating a pipeline stage and refreshing the frontend is the entire
update loop.
