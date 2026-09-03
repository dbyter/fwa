const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://localhost:8000";

export type Severity = {
  financial_impact: number;
  likelihood: number;
  detectability: number;
  confidence: number;
};

export type ArchetypeRef = { name: string; why: string };
export type CmsSource = { explicit: string[]; inference: string };

export type Hypothesis = {
  id: string;
  rank: number;
  title: string;
  vulnerability_hypothesis: string;
  archetypes: ArchetypeRef[];
  economic_incentive: string;
  claims_manifestation: string;
  detection_signals: string[];
  graph_signals: string[];
  false_positive_explanation: string;
  disambiguating_evidence: string[];
  detection_rule: string;
  severity: Severity;
  cms_source: CmsSource;
  collision_categories: string[];
  is_top10: boolean;
};

export type ArchetypeMisuseRanking = {
  archetype: string;
  misuse_potential: number;
  why: string;
  how: string;
};

export type RecommendedAction = {
  action: string;
  rationale: string;
  priority: "immediate" | "near_term" | "structural" | string;
  addresses_archetypes: string[];
};

export type DeepDive = {
  recommended_actions: RecommendedAction[];
  minimum_viable_analytic: string;
  archetype_misuse_ranking: ArchetypeMisuseRanking[];
};

export type BriefReference = { title: string; url: string };

export type Brief = {
  issue_summary: string;
  background: string;
  findings: string[];
  legal_regulatory_basis: string;
  recommended_action_summary: string;
  next_steps: string[];
  references: BriefReference[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request to ${path} failed: ${res.status}`);
  return res.json();
}

export const fwaApi = {
  hypotheses: () => getJson<Hypothesis[]>("/api/hypotheses"),
  hypothesis: (id: string) => getJson<Hypothesis>(`/api/hypotheses/${id}`),
  deepdive: (id: string) => getJson<DeepDive>(`/api/deepdives/${id}`),
  brief: (id: string) => getJson<Brief>(`/api/briefs/${id}`),
};
