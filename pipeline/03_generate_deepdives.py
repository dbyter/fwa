"""Pass 3: for the top-ranked hypotheses, simulate archetype-specific behavior/adaptation and
produce prioritized payer-side recommended actions. Parallelized."""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from lib.archetypes import ARCHETYPES
from lib.llm import call_json, REASONING_MODEL

ROOT = Path(__file__).resolve().parents[1]
HYPOTHESES_PATH = ROOT / "pipeline" / "output" / "hypotheses.json"
OUT_PATH = ROOT / "pipeline" / "output" / "deepdives.json"
MAX_WORKERS = 32

ARCHETYPES_BY_NAME = {a["name"]: a for a in ARCHETYPES}

SYSTEM_PROMPT = """You are supporting a Medicare program-integrity team with a defensive, conceptual \
adversarial simulation. You are given one FWA hypothesis and structured profiles (1-5 scored behavioral \
attributes) for the archetypes flagged as relevant to it.

Do NOT provide operational instructions for committing fraud or evading detection. Describe behavior at \
the level of: what claims pattern would emerge, and how it changes after payer feedback. Every adaptation \
must be described as an observable, higher-level behavioral shift plus its resulting data signature - \
never as a step-by-step evasion procedure.

Produce, in this order of importance:

1. "recommended_actions": THE MOST IMPORTANT OUTPUT. An array of 4-7 concrete, prioritized actions a \
payer/SIU/CMS program-integrity team should take in response to this specific vulnerability, each: \
{"action": "<specific control, edit, policy change, audit trigger, or analytic to deploy>", \
"rationale": "<why this addresses the vulnerability, tied to the mechanism>", \
"priority": "immediate" | "near_term" | "structural", \
"addresses_archetypes": ["<archetype names this control is most effective against>"]}. \
Cover a mix of: claims-system edits, documentation/prior-auth requirements, analytics/monitoring to \
deploy, and policy/rule-clarification recommendations to CMS itself where the vulnerability stems from \
rule ambiguity.

2. "minimum_viable_analytic": a concrete, buildable payer-side analytic (data sources, join logic, \
feature computation, anomaly scoring approach) that would let a health plan test for this pattern in its \
own claims warehouse, at an engineering-spec level.

3. "archetype_misuse_ranking": for each archetype profile given, a SHORT, SCANNABLE assessment - NOT a \
multi-stage narrative. Rank archetypes from highest to lowest potential to misuse this specific \
vulnerability. Each entry:
   - "archetype": the archetype name (must match input)
   - "misuse_potential": integer 1-5 (5 = most likely/severe misuse of this specific vulnerability)
   - "why": ONE sentence - which of the archetype's scored attributes drive this (e.g. "High willingness \
to exploit ambiguity (5) and high volume-growth objective (4).")
   - "how": ONE to two sentences - the concrete billing behavior this archetype would exhibit for THIS \
vulnerability. Plain, concrete, no jargon-stacking.
Order the array from highest misuse_potential to lowest.

Return strict JSON: {"recommended_actions": [...], "minimum_viable_analytic": "...", "archetype_misuse_ranking": [...]}"""


def generate_deepdive(h):
    archetype_names = [a["name"] for a in h.get("archetypes", [])]
    archetype_profiles = [ARCHETYPES_BY_NAME[n] for n in archetype_names if n in ARCHETYPES_BY_NAME]
    user_prompt = (
        f"Hypothesis: {h['title']}\n"
        f"Vulnerability: {h['vulnerability_hypothesis']}\n"
        f"Economic incentive: {h['economic_incentive']}\n"
        f"Claims manifestation: {h['claims_manifestation']}\n"
        f"Detection signals already identified: {json.dumps(h.get('detection_signals', []))}\n"
        f"Relevant archetype profiles:\n{json.dumps(archetype_profiles, indent=2)}\n"
    )
    result = call_json(SYSTEM_PROMPT, user_prompt, model=REASONING_MODEL)
    return h["id"], h["title"], result


def main():
    hyps = json.loads(HYPOTHESES_PATH.read_text(encoding="utf-8"))
    top = [h for h in hyps if h.get("is_top10")]
    print(f"Generating deep dives for {len(top)} top hypotheses with {MAX_WORKERS} threads...")

    deepdives = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(generate_deepdive, h): h for h in top}
        for future in as_completed(futures):
            hid, title, result = future.result()
            deepdives[hid] = result
            print(f"  {hid}: {title} -> {len(result.get('recommended_actions', []))} recommended actions, "
                  f"{len(result.get('archetype_misuse_ranking', []))} archetypes ranked")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(deepdives, indent=2), encoding="utf-8")
    print(f"Wrote deep dives for {len(deepdives)} hypotheses to {OUT_PATH}")


if __name__ == "__main__":
    main()
