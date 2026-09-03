"""Pass 2: synthesize FWA hypotheses from the extracted rule corpus, in thematic batches. Parallelized."""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from lib.archetypes import ARCHETYPES, COLLISION_CATEGORIES
from lib.llm import call_json, REASONING_MODEL

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "pipeline" / "output" / "rules.json"
OUT_PATH = ROOT / "pipeline" / "output" / "hypotheses.json"
MAX_WORKERS = 32

BATCHES = [
    {
        "name": "temporal_and_lifecycle",
        "focus": "Temporal exploitation and lifecycle arbitrage: rental-vs-purchase, capped rentals, "
                 "replacement/refill intervals, repairs, upgrades, accessories, timing relative to "
                 "eligibility/coverage changes, transitions between inpatient/SNF/home health/hospice/outpatient.",
        "count": 9,
    },
    {
        "name": "coding_and_entity_arbitrage",
        "focus": "Code-path and entity arbitrage: HCPCS selection, modifier combinations, units, "
                 "place-of-service rules, bundling vs separately payable items, same/similar equipment "
                 "rules, differences in how physician practices/HHAs/SNFs vs standalone suppliers can bill "
                 "economically similar items differently.",
        "count": 9,
    },
    {
        "name": "network_and_adaptive",
        "focus": "Distributed/network behavior and adaptive behavior: organized fraud rings, lead-generation "
                 "and telehealth referral concentration, ordering-provider concentration, geographic dispersion, "
                 "low-and-slow patterns below simple thresholds, and how aggressive suppliers shift tactics "
                 "after denials, edits, audits, or enforcement divergence across jurisdictions.",
        "count": 8,
    },
]

SYSTEM_PROMPT = f"""You are simulating an adversarial fraud-risk analysis from the perspective of a \
Medicare health plan / CMS program-integrity / Special Investigations Unit (SIU) team, analyzing the \
CMS Medicare Claims Processing Manual Chapter 20 (DMEPOS) for exploitable rule interactions.

This is a DEFENSIVE exercise: identify vulnerabilities and translate them into detection hypotheses \
and controls. Do NOT produce operational instructions for committing fraud or evading detection - \
describe behavior at a conceptual level and its observable data signature only.

Provider/supplier archetypes to consider (each scored 1-5 low-high across behavioral dimensions -
use these profiles to judge which archetypes would plausibly gravitate toward each scheme, rather
than treating archetypes as interchangeable):
{json.dumps(ARCHETYPES, indent=2)}

When assigning "archetypes" to a hypothesis, only include archetypes whose profile (financial
pressure, risk tolerance, compliance/coding sophistication, coordination, etc) plausibly supports
that behavior, and say why in the "why" field with reference to specific attributes.

Collision categories to actively search for:
{json.dumps(COLLISION_CATEGORIES, indent=2)}

For EACH hypothesis, return an object with exactly these fields:
- "title": short name for the scheme
- "vulnerability_hypothesis": the underlying rule, ambiguity, incentive, or interaction that makes it possible
- "archetypes": array of {{"name": "<must match one of the provided archetype names>", "why": "..."}}
- "economic_incentive": what reimbursement/volume/economic advantage motivates it
- "claims_manifestation": what this looks like in Medicare claims data (HCPCS combos, modifiers, units, \
timing, concentration, place of service, longitudinal patterns, etc.)
- "detection_signals": array of measurable, quantitative indicators a payer could calculate
- "graph_signals": array of relationship/network patterns that could reveal coordination (supplier-beneficiary, \
supplier-ordering provider, supplier-marketer, shared addresses/ownership, etc). Empty array if not applicable.
- "false_positive_explanation": legitimate clinical/operational reasons the same pattern could occur
- "disambiguating_evidence": array of additional info that would distinguish legitimate use from abuse
- "detection_rule": a concrete payer-side analytic in pseudocode or SQL-like logic (detection framing only, \
not evasion optimization)
- "severity": {{"financial_impact": 1-5, "likelihood": 1-5, "detectability": 1-5, "confidence": 1-5}}
- "cms_source": {{"explicit": ["<section/citation if identifiable from the rule corpus>"], \
"inference": "<what part of this hypothesis is your interpretation/assumption vs explicit CMS text>"}}
- "collision_categories": array of category letters (A-H) this hypothesis exemplifies

Prioritize NON-OBVIOUS interactions between rules over simple miscoding. Ground every hypothesis in the \
supplied rule corpus - reference specific rules/sections where possible.

Return strict JSON: {{"hypotheses": [...]}}"""


def generate_batch(batch, rules_corpus):
    user_prompt = (
        f"Rule corpus extracted from the manual (JSON array of rule cards):\n{rules_corpus}\n\n"
        f"Focus area for this batch: {batch['focus']}\n\n"
        f"Generate exactly {batch['count']} distinct, high-value hypotheses for this focus area."
    )
    result = call_json(SYSTEM_PROMPT, user_prompt, model=REASONING_MODEL)
    hyps = result.get("hypotheses", [])
    for h in hyps:
        h["batch"] = batch["name"]
    return batch["name"], hyps


def main():
    rules = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    rules_corpus = json.dumps(rules, indent=None)
    print(f"Loaded {len(rules)} rule cards ({len(rules_corpus)} chars)")
    print(f"Generating {len(BATCHES)} hypothesis batches with {MAX_WORKERS} threads...")

    all_hyps = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(generate_batch, b, rules_corpus): b for b in BATCHES}
        for future in as_completed(futures):
            name, hyps = future.result()
            all_hyps.extend(hyps)
            print(f"  batch '{name}' -> {len(hyps)} hypotheses")

    for i, h in enumerate(all_hyps):
        h["id"] = f"h{i+1:02d}"
        sev = h.get("severity", {})
        h["score"] = (
            sev.get("financial_impact", 0) * sev.get("likelihood", 0)
            + sev.get("confidence", 0)
            - sev.get("detectability", 0) * 0.5
        )

    all_hyps.sort(key=lambda h: h["score"], reverse=True)
    for i, h in enumerate(all_hyps):
        h["rank"] = i + 1
        h["is_top10"] = i < 10

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(all_hyps, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_hyps)} ranked hypotheses to {OUT_PATH}")


if __name__ == "__main__":
    main()
