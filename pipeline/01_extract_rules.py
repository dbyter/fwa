"""Pass 1: chunk the CMS DMEPOS manual and extract structured, citable rule cards. Parallelized."""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from lib.chunking import chunk_lines, load_manual_lines
from lib.llm import call_json, FAST_MODEL

ROOT = Path(__file__).resolve().parents[1]
MANUAL_PATH = ROOT / "data" / "source" / "clm104c20.txt"
OUT_PATH = ROOT / "pipeline" / "output" / "rules.json"
MAX_WORKERS = 32

SYSTEM_PROMPT = """You are a Medicare program-integrity analyst extracting structured, citable rule \
cards from the CMS Medicare Claims Processing Manual, Chapter 20 (DMEPOS billing).

For the given excerpt, extract every distinct billing rule, requirement, definition, or \
instruction that could plausibly interact with billing behavior (payment rules, documentation \
requirements, modifiers, HCPCS usage, frequency/replacement/refill limits, rental vs purchase, \
POS rules, supplier enrollment requirements, capped rental rules, same/similar equipment rules, \
etc). Skip pure boilerplate/formatting text.

Return strict JSON: {"rules": [{"section": "<section number/heading if visible, else best guess \
like 'unlabeled'>", "rule_text": "<concise paraphrase of the rule, 1-3 sentences>", \
"tags": ["<relevant tags from: hcpcs, modifiers, units, frequency, recurring_supplies, refills, \
replacement, repairs, rental, capped_rental, purchase_vs_rental, upgrades, accessories, \
eligibility, ordering_provider, place_of_service, dates_of_service, geographic, enrollment, \
same_or_similar, coordination, bundling, duplicate_claims, medical_necessity, timing, other>"]}]}
If the excerpt contains no extractable rules, return {"rules": []}."""


def extract_chunk(c):
    result = call_json(
        SYSTEM_PROMPT,
        f"Excerpt (lines {c['start_line']}-{c['end_line']}):\n\n{c['text']}",
        model=FAST_MODEL,
    )
    rules = result.get("rules", [])
    for r in rules:
        r["chunk_index"] = c["chunk_index"]
        r["source_lines"] = [c["start_line"], c["end_line"]]
    return c["chunk_index"], rules


def main():
    lines = load_manual_lines(MANUAL_PATH)
    chunks = chunk_lines(lines, chunk_size=900, overlap=60)
    print(f"Manual split into {len(chunks)} chunks, extracting with {MAX_WORKERS} threads...")

    results_by_index = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(extract_chunk, c): c for c in chunks}
        for future in as_completed(futures):
            c = futures[future]
            idx, rules = future.result()
            results_by_index[idx] = rules
            print(f"  chunk {idx+1}/{len(chunks)} (lines {c['start_line']}-{c['end_line']}) -> {len(rules)} rule(s)")

    all_rules = []
    for idx in sorted(results_by_index):
        all_rules.extend(results_by_index[idx])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(all_rules, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_rules)} total rules to {OUT_PATH}")


if __name__ == "__main__":
    main()
