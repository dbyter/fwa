"""Pass 4: derive the archetype matrix, signal library, graph analytics, and watchlist views
from the generated hypotheses via plain aggregation (no extra LLM calls needed)."""
import json
from collections import defaultdict
from pathlib import Path

from lib.archetypes import ARCHETYPE_NAMES

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "pipeline" / "output"
HYPOTHESES_PATH = OUT_DIR / "hypotheses.json"


def main():
    hyps = json.loads(HYPOTHESES_PATH.read_text(encoding="utf-8"))

    matrix = {name: [] for name in ARCHETYPE_NAMES}
    for h in hyps:
        for a in h.get("archetypes", []):
            if a["name"] in matrix:
                matrix[a["name"]].append({
                    "hypothesis_id": h["id"],
                    "title": h["title"],
                    "why": a.get("why", ""),
                    "rank": h["rank"],
                })
    for name in matrix:
        matrix[name].sort(key=lambda x: x["rank"])
    (OUT_DIR / "archetype_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")

    signal_map = defaultdict(list)
    for h in hyps:
        for s in h.get("detection_signals", []):
            signal_map[s].append(h["id"])
    signal_library = [{"signal": s, "used_in": ids} for s, ids in signal_map.items()]
    (OUT_DIR / "signal_library.json").write_text(json.dumps(signal_library, indent=2), encoding="utf-8")

    graph_map = defaultdict(list)
    for h in hyps:
        for g in h.get("graph_signals", []):
            graph_map[g].append(h["id"])
    graph_analytics = [{"signal": g, "used_in": ids} for g, ids in graph_map.items()]
    (OUT_DIR / "graph_analytics.json").write_text(json.dumps(graph_analytics, indent=2), encoding="utf-8")

    collision_map = defaultdict(list)
    for h in hyps:
        for c in h.get("collision_categories", []):
            collision_map[c].append({"id": h["id"], "title": h["title"], "rank": h["rank"]})
    for c in collision_map:
        collision_map[c].sort(key=lambda x: x["rank"])
    (OUT_DIR / "rule_collisions.json").write_text(json.dumps(collision_map, indent=2), encoding="utf-8")

    top10 = [h for h in hyps if h.get("is_top10")]
    watchlist = {
        "hcpcs_note": "See individual hypotheses' claims_manifestation for specific HCPCS families flagged.",
        "top_hypotheses_by_category": {
            c: [h["title"] for h in items] for c, items in collision_map.items()
        },
        "high_financial_impact": sorted(
            [h for h in hyps if h.get("severity", {}).get("financial_impact", 0) >= 4],
            key=lambda h: h["rank"],
        ),
        "hardest_to_detect": sorted(
            [h for h in hyps if h.get("severity", {}).get("detectability", 5) <= 2],
            key=lambda h: h["rank"],
        ),
    }
    (OUT_DIR / "watchlist.json").write_text(json.dumps(watchlist, indent=2), encoding="utf-8")

    summary = {
        "total_hypotheses": len(hyps),
        "top10_ids": [h["id"] for h in top10],
        "archetype_count": len(ARCHETYPE_NAMES),
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Aggregated views written to {OUT_DIR}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
