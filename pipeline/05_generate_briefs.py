"""Pass 5: draft a CPI-style briefing memo per top-10 hypothesis, combining the CMS manual
citations already grounding the hypothesis with real-world corroborating references gathered
via web research (pipeline/output/web_references.json). Parallelized."""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from lib.llm import call_json, REASONING_MODEL

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "pipeline" / "output"
HYPOTHESES_PATH = OUT_DIR / "hypotheses.json"
DEEPDIVES_PATH = OUT_DIR / "deepdives.json"
WEB_REFS_PATH = OUT_DIR / "web_references.json"
OUT_PATH = OUT_DIR / "briefs.json"
MAX_WORKERS = 32

SYSTEM_PROMPT = """You are a Medicare program-integrity analyst drafting an internal CPI (CMS Center for
Program Integrity) -style briefing memo for a single suspected DMEPOS fraud/waste/abuse vulnerability.
This is hypothesis generation for internal decision support, NOT proof of fraud — write accordingly
(e.g. "the pattern would indicate", not "this proves").

Ground the memo in TWO kinds of sources, and keep them clearly distinguished:
1. The CMS Medicare Claims Processing Manual citations already identified for this hypothesis.
2. Real-world corroborating references (OIG reports, DOJ case outcomes, MAC guidance) provided to you -
   use these to show the pattern is a documented risk category, not a hypothetical, WITHOUT claiming the
   specific real cases are the same scheme as this hypothesis. Cite them as "comparable enforcement history"
   or "documented risk category", not as direct evidence of this exact pattern.

Produce a memo with these fields:
- "issue_summary": 2-3 sentences, the single most important takeaway a CPI leader needs in 10 seconds
- "background": short paragraph on the billing mechanism/rule context
- "findings": 3-5 bullet points (array of strings) on the specific vulnerability and why it's exploitable
- "legal_regulatory_basis": paragraph distinguishing explicit CMS manual requirements from interpretation,
  and noting relevant real-world enforcement precedent (Anti-Kickback Statute / False Claims Act framing
  where the provided references indicate that framing applies)
- "recommended_action_summary": 2-3 sentences synthesizing the top recommended actions into an executive
  ask (what CPI should decide/approve)
- "next_steps": array of 3-5 concrete next steps (e.g. "refer to UPIC for claims pull", "request CMS
  rule clarification")
- "references": array of {"title": str, "url": str} - only from the provided real-world references list,
  do not invent URLs

Return strict JSON matching exactly those 7 fields."""


def generate_brief(h, deepdive, web_refs):
    recommended_actions = deepdive.get("recommended_actions", []) if deepdive else []
    user_prompt = (
        f"Hypothesis: {h['title']}\n"
        f"Vulnerability: {h['vulnerability_hypothesis']}\n"
        f"Economic incentive: {h['economic_incentive']}\n"
        f"Claims manifestation: {h['claims_manifestation']}\n"
        f"Severity: {json.dumps(h['severity'])}\n"
        f"CMS source (explicit citations + inference): {json.dumps(h['cms_source'])}\n"
        f"Recommended actions already drafted: {json.dumps(recommended_actions)}\n"
        f"Real-world corroborating references available to cite:\n{json.dumps(web_refs, indent=2)}\n"
    )
    result = call_json(SYSTEM_PROMPT, user_prompt, model=REASONING_MODEL)
    return h["id"], result


def main():
    hyps = json.loads(HYPOTHESES_PATH.read_text(encoding="utf-8"))
    deepdives = json.loads(DEEPDIVES_PATH.read_text(encoding="utf-8"))
    web_refs = json.loads(WEB_REFS_PATH.read_text(encoding="utf-8"))
    top = [h for h in hyps if h.get("is_top10")]
    print(f"Generating briefing memos for {len(top)} top hypotheses with {MAX_WORKERS} threads...")

    briefs = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(generate_brief, h, deepdives.get(h["id"]), web_refs.get(h["id"], [])): h
            for h in top
        }
        for future in as_completed(futures):
            hid, result = future.result()
            briefs[hid] = result
            print(f"  {hid}: brief drafted ({len(result.get('references', []))} references)")

    OUT_PATH.write_text(json.dumps(briefs, indent=2), encoding="utf-8")
    print(f"Wrote briefs for {len(briefs)} hypotheses to {OUT_PATH}")


if __name__ == "__main__":
    main()
