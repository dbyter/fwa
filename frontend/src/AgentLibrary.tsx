import { useState, useRef, useEffect } from "react"
import type { CSSProperties } from "react"
// v2 — accordion layout

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentInput { label: string; description: string; source: string; url?: string }
interface AgentTool  { name: string; signature: string; description: string }
interface AgentTask  { id: string; label: string; description: string }
interface OutputField { field: string; type: string; description: string }

interface Agent {
  id: string; name: string; shortName: string; tagline: string; objective: string
  color: string; icon: string
  inputs: AgentInput[]; tools: AgentTool[]; tasks: AgentTask[]; outputs: OutputField[]
  memoryType: string; orchestration: string
  outputFrequency?: string; outputRecipients?: string[]
}

interface DAGNode { agentId: string; cx: number; cy: number }
interface DAGEdge { from: string; to: string; style?: "solid" | "dashed" }
interface DAGLayout { nodes: DAGNode[]; edges: DAGEdge[]; width: number; height: number }

// ── Agent Data ─────────────────────────────────────────────────────────────────

const SIGNAL_AGENTS: Agent[] = [
  {
    id: "policy", name: "Policy and Coverage", shortName: "Policy & Coverage",
    tagline: "What are the rules — and where do they break?",
    objective: "Review reimbursement policies, fee schedules, PA requirements, NCDs/LCDs, MAC rules, and claims edits to identify where payment rules, documentation requirements, or reimbursement structures can be manipulated. Convert policy text into machine-testable control logic.",
    color: "#3d4551", icon: "◉",
    inputs: [
      { label: "Medicare Coverage Database", description: "NCDs, LCDs, policy articles per HCPCS code and jurisdiction. Program Integrity Manual Chapter 5 governs coverage determination policy and documentation requirements.", source: "CMS PIM §5", url: "https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/pim83c05.pdf" },
      { label: "HCPCS Fee Schedule", description: "Allowed amounts, modifiers, billing rules, and payment policies per DMEPOS code. Includes fee schedule amounts, coding guidelines, and supplier documentation requirements.", source: "CMS Fee Schedule", url: "https://www.cms.gov/medicare/payment/fee-schedules/durable-medical-equipment-prosthetic-devices-prosthetics-orthotics-supplies/payment-policies-dmepos-items-services" },
      { label: "MAC-specific edits", description: "Jurisdiction-level claim edits, PA rules, and DMEPOS laws and regulations governing supplier obligations, coverage criteria, and compliance requirements.", source: "CMS DMEPOS Regs", url: "https://www.cms.gov/medicare/payment/fee-schedules/durable-medical-equipment-prosthetic-devices-prosthetics-orthotics-supplies/dmepos-laws-regulations" },
      { label: "Prior Authorization lists", description: "Codes subject to prepayment review under the DMEPOS prior authorization program. Updated list of items requiring prior authorization before Medicare payment.", source: "CMS PA Required List", url: "https://www.cms.gov/research-statistics-data-and-systems/monitoring-programs/medicare-ffs-compliance-programs/dmepos/downloads/dmepos_pa_required-prior-authorization-list.pdf" },
      { label: "DMEPOS Frequent Utilization Master List", description: "Final rule master list of DMEPOS items subject to frequent unnecessary utilization. Used to identify high-risk billing codes and calibrate anomaly thresholds.", source: "CMS FU Final Rule", url: "https://www.cms.gov/research-statistics-data-and-systems/monitoring-programs/medicare-ffs-compliance-programs/dmepos/downloads/final-rule-master-list-of-dmepos-subject-to-frequent-unnecessary-utilization-2018-03-30.pdf" },
      { label: "Annual Payment Rate Updates", description: "Calendar year rulemaking updates to DMEPOS-adjacent payment systems including Home Health PPS rates, inflation adjustments, and policy revisions affecting cross-program billing.", source: "Fed. Register 2026", url: "https://www.federalregister.gov/documents/2025/07/02/2025-12347/medicare-and-medicaid-programs-calendar-year-2026-home-health-prospective-payment-system-hh-pps-rate" },
    ],
    tools: [
      { name: "retrieve_lcd_policy", signature: "retrieve_lcd_policy(code: str, mac_id: str, effective_date: str) → LCDDocument", description: "Fetch structured LCD text and extract coverage criteria, documentation requirements, and denial conditions." },
      { name: "build_control_matrix", signature: "build_control_matrix(codes: list[str]) → ControlMatrix", description: "Convert prose policy requirements into a tabular control matrix: control type, evidence required, verification mechanism, weakness class." },
      { name: "compare_code_adjacency", signature: "compare_code_adjacency(base_code: str, radius: int) → list[CodePair]", description: "Identify adjacent HCPCS codes with similar clinical intent but materially different reimbursement — upcoding surface." },
      { name: "score_control_weakness", signature: "score_control_weakness(control: Control) → WeaknessScore", description: "Rate each control on exploitability, detectability, retrospective vs prepayment timing, and reliance on self-reported documentation." },
    ],
    tasks: [
      { id: "T1", label: "Ingest policy corpus", description: "Retrieve all NCDs, LCDs, and policy articles for target HCPCS codes across all MAC jurisdictions." },
      { id: "T2", label: "Extract control requirements", description: "Parse policy text to enumerate diagnosis requirements, documentation thresholds, ordering rules, quantity limits, and replacement criteria." },
      { id: "T3", label: "Build control matrix", description: "Map each requirement to its verification mechanism and classify by weakness type." },
      { id: "T4", label: "Score and rank vulnerabilities", description: "Rank controls by exploitability × financial exposure." },
    ],
    outputs: [
      { field: "control_matrix", type: "ControlMatrix[]", description: "Per-code table of controls, evidence required, verification mechanism, and weakness classification." },
      { field: "vulnerability_ranking", type: "VulnerabilityItem[]", description: "Ordered list of exploitable gaps with code, scheme type, exploitability and detectability scores." },
      { field: "policy_digest", type: "PolicyDigest", description: "Machine-readable summary of active coverage rules consumed by downstream agents." },
    ],
    memoryType: "Episodic + Semantic — persists control matrices across policy update cycles; semantic store for code relationships.",
    orchestration: "Invoked on schedule (policy update cadence) and on-demand when new HCPCS codes are flagged by the Economics Agent.",
  },
  {
    id: "supervised", name: "Supervised Learning", shortName: "Supervised Learning",
    tagline: "What did past fraud look like before it was caught?",
    objective: "Use resolved CMS enforcement actions to build a reliable label hierarchy and extract retrospective signals visible 6–24 months before action was taken.",
    color: "#3d4551", icon: "◎",
    inputs: [
      { label: "CMS Revocation & Suspension records", description: "Supplier revocations, payment suspensions, enrollment bars", source: "Revocation API", url: "https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/revoked-medicare-providers-and-suppliers" },
      { label: "OIG Exclusion database", description: "Excluded entities and individuals", source: "OIG LEIE" },
      { label: "DOJ settlement & conviction data", description: "Healthcare fraud convictions, FCA settlements", source: "DOJ press releases, PACER" },
      { label: "Historical claims for revoked suppliers", description: "Pre-revocation billing history to identify early signals", source: "Claims API", url: "https://www.cms.gov/data-research/cms-data/data-available-researchers/limited-data-set-lds-files" },
    ],
    tools: [
      { name: "query_enforcement_db", signature: "query_enforcement_db(entity_id: str, action_types: list[str], lookback_days: int) → list[EnforcementAction]", description: "Retrieve all resolved enforcement actions for an entity or cohort within the lookback window." },
      { name: "extract_precursor_signals", signature: "extract_precursor_signals(supplier_id: str, months_before_action: int) → SignalSet", description: "For a revoked supplier, return billing patterns and anomaly flags present N months before revocation." },
      { name: "build_typology", signature: "build_typology(cases: list[Case]) → FraudTypology", description: "Cluster resolved cases into scheme typologies with representative signal patterns and temporal trajectories." },
      { name: "label_historical_cohort", signature: "label_historical_cohort(supplier_ids: list[str]) → LabeledDataset", description: "Assign fraud/waste/error labels to historical cohorts for model training and validation." },
    ],
    tasks: [
      { id: "T1", label: "Triangulate revocations against claims history", description: "Join the CMS Revocation & Suspension records against LDS claims data across the full 2019–2025 window. Normalize entity identifiers across PECOS and NPI registries to resolve supplier continuity through ownership changes and reincorporations." },
      { id: "T2", label: "Analyze revocation reasons and extract retrospective signals", description: "Parse the stated revocation basis for each supplier — billing irregularities, credentialing fraud, enrollment violations, OIG exclusions — and cluster by scheme type. For each cluster, retrieve pre-revocation claims and identify which billing patterns were statistically detectable 6–24 months before the action was taken." },
      { id: "T3", label: "Produce labeled training data for proactive fraud detection", description: "Generate a structured label dataset partitioned into confirmed fraud, suspected fraud, documentation error, and clean billing cohorts. Each labeled supplier record includes the earliest detectable signal, lead time to revocation, and a feature vector for downstream model training and validation." },
    ],
    outputs: [
      { field: "revocations_analysis", type: "RevocationRecord[]", description: "Year-over-year billing activity per provider cross-referenced against revocation records. Surfaces anomalous claim volume, procedure diversity, and paid-amount trajectories in the 2019–2025 window." },
      { field: "typology_library", type: "FraudTypology[]", description: "Scheme patterns with signal signatures, temporal trajectories, and representative case citations." },
      { field: "labeled_dataset", type: "LabeledDataset", description: "Training/validation cohort with entity-level fraud labels and feature vectors." },
      { field: "detection_gap_report", type: "DetectionGapReport", description: "Controls that failed to fire pre-revocation — input to System Resilience Agent." },
    ],
    memoryType: "Long-term episodic memory — enforcement case store that grows with each new action. Versioned typology snapshots.",
    orchestration: "Event-driven on new enforcement action publication. Batch retrospective sweep quarterly.",
  },
  {
    id: "utilization", name: "Utilization and Billing Patterns", shortName: "Utilization & Billing",
    tagline: "Who is billing abnormally and how?",
    objective: "Analyze claims across Medicare FFS, Medicare Advantage, and Medicaid T-MSIS to detect velocity anomalies, peer deviation, unusual code mixes, and orderer concentration.",
    color: "#3d4551", icon: "◈",
    inputs: [
      { label: "Medicare FFS Claims (Part B/DMEPOS)", description: "HCPCS codes, modifiers, diagnoses, units, allowed amounts, ordering NPI, supplier NPI", source: "CMS NCH / Shared Systems" },
      { label: "Medicare Advantage Encounter Data", description: "Encounter-level records from MA plans", source: "CMS EDGE / T-MSIS" },
      { label: "Medicaid T-MSIS", description: "State Medicaid claims and encounters", source: "CMS T-MSIS" },
      { label: "Peer reference universe", description: "National and regional billing norms by specialty, geography, code", source: "Derived from claims history" },
    ],
    tools: [
      { name: "compute_peer_deviation", signature: "compute_peer_deviation(supplier_id: str, codes: list[str], period: str) → DeviationReport", description: "Compare supplier billing rates against matched peer group. Return z-scores and percentile ranks." },
      { name: "detect_velocity_spike", signature: "detect_velocity_spike(entity_id: str, lookback_days: int, threshold_sigma: float) → list[VelocityAnomaly]", description: "Flag entities whose claims volume growth exceeds N standard deviations." },
      { name: "analyze_code_migration", signature: "analyze_code_migration(supplier_id: str, from_code: str, adjacent_codes: list[str]) → MigrationPattern", description: "Detect shifts between functionally adjacent codes following a denial surge." },
      { name: "map_orderer_concentration", signature: "map_orderer_concentration(supplier_id: str, period: str) → ConcentrationMetrics", description: "Compute the share of a supplier's volume attributable to top N ordering providers." },
    ],
    tasks: [
      { id: "T1", label: "Establish baseline profiles", description: "For each active supplier, compute 12-month billing baseline by code, geography, and patient population." },
      { id: "T2", label: "Run anomaly detection sweep", description: "Apply velocity, peer deviation, code mix, and orderer concentration detectors across all active entities." },
      { id: "T3", label: "Identify cross-payer patterns", description: "Correlate FFS, MA, and Medicaid signals for the same entities. Flag payer arbitrage." },
      { id: "T4", label: "Score and route findings", description: "Assign risk tiers to anomalous entities. Route high-confidence signals to CRUSH Fraud." },
    ],
    outputs: [
      { field: "anomaly_queue", type: "AnomalyItem[]", description: "Ranked list of entity-level billing anomalies with evidence package, confidence score, and recommended action." },
      { field: "peer_deviation_report", type: "DeviationReport[]", description: "Per-entity deviation from peer benchmarks across key billing dimensions." },
      { field: "migration_alerts", type: "MigrationAlert[]", description: "Code-shift patterns suggestive of evasion following control tightening." },
    ],
    memoryType: "Rolling window episodic memory (24 months). Semantic store for peer group definitions and code relationship graph.",
    orchestration: "Continuous streaming on new claims. Daily batch for peer-deviation sweep. Weekly cross-payer correlation run.",
  },
  {
    id: "provider", name: "Provider and Supplier", shortName: "Provider & Supplier",
    tagline: "Who owns what — and who have they been before?",
    objective: "Build 'Know Your Supplier' profiles by resolving entities across NPIs and ownership records. Identify reincarnated suppliers, shared infrastructure, and implausible operating capacity.",
    color: "#3d4551", icon: "◫",
    inputs: [
      { label: "NPPES enrollment data", description: "NPI, name, specialty, address, authorized officials", source: "CMS NPPES" },
      { label: "PECOS enrollment history", description: "Enrollment, reactivation, ownership changes, reassignments", source: "CMS PECOS" },
      { label: "Ownership & authorized official records", description: "Managing employee disclosures, 5% ownership thresholds", source: "CMS enrollment forms" },
      { label: "Sanctions and adverse actions", description: "Exclusions, revocations, debarments", source: "OIG LEIE, SAM.gov, PECOS" },
    ],
    tools: [
      { name: "resolve_entity_graph", signature: "resolve_entity_graph(seed_npi: str, link_types: list[str], depth: int) → EntityGraph", description: "Build a relationship graph linking the seed entity to affiliates via shared addresses, officials, and beneficiaries." },
      { name: "detect_reincarnation", signature: "detect_reincarnation(supplier_id: str) → list[ReincarnationMatch]", description: "Match current supplier against terminated entities using address, ownership, NPI, code mix, and beneficiary overlap." },
      { name: "assess_capacity_plausibility", signature: "assess_capacity_plausibility(supplier_id: str, claim_volume: int) → CapacityReport", description: "Estimate maximum plausible fulfillment capacity from site size and staffing. Flag billing beyond plausible limits." },
      { name: "score_network_risk", signature: "score_network_risk(entity_graph: EntityGraph) → NetworkRiskScore", description: "Aggregate risk score weighting proximity to revoked entities, ownership complexity, and shared infrastructure." },
    ],
    tasks: [
      { id: "T1", label: "Build entity profiles", description: "For each enrolled supplier, compile identity, ownership structure, enrollment history, and accreditation status." },
      { id: "T2", label: "Run reincarnation detection", description: "Compare newly enrolled entities against terminated supplier database. Flag structural identity matches." },
      { id: "T3", label: "Construct affiliation networks", description: "Resolve shared addresses, officials, and payment destinations into an enterprise network graph." },
      { id: "T4", label: "Capacity plausibility assessment", description: "Cross-reference claim volume against site capacity estimates. Escalate implausible billing volumes." },
    ],
    outputs: [
      { field: "entity_profiles", type: "SupplierProfile[]", description: "Structured KYS/KYP profiles with risk tier, affiliation links, enrollment history, and capacity assessment." },
      { field: "reincarnation_alerts", type: "ReincarnationAlert[]", description: "Newly enrolled entities with high structural similarity to revoked predecessors." },
      { field: "network_graph", type: "EntityGraph", description: "Connected graph of suppliers, officials, clinicians, marketers, and beneficiaries." },
    ],
    memoryType: "Long-term semantic memory for entity resolution. Persistent graph database updated on enrollment events.",
    orchestration: "Event-triggered on new enrollment or ownership change. Nightly graph refresh for affiliation propagation.",
  },
  {
    id: "beneficiary", name: "Beneficiary Identifier", shortName: "Beneficiary ID",
    tagline: "What is the threat before the claim arrives?",
    objective: "Monitor authorized threat-intelligence sources for compromised MBIs, provider credentials, and emerging fraud playbooks. Provide early warning before anomalous claims are visible in billing data.",
    color: "#3d4551", icon: "◎",
    inputs: [
      { label: "CMS authorized threat intel feeds", description: "Compromised MBI/SSN alerts, stolen credential notifications", source: "CMS / HHS threat intel sharing" },
      { label: "Beneficiary complaint records", description: "Reports of unexpected bills, items not received", source: "1-800-MEDICARE, SMP program" },
      { label: "Dark web & OSINT signals", description: "Credential marketplaces, fraud forum discussions (authorized only)", source: "Authorized threat intel vendors" },
      { label: "Cross-program identity signals", description: "SSA, VA, Medicaid identity anomalies", source: "CMS cross-program data sharing" },
    ],
    tools: [
      { name: "query_compromised_identifiers", signature: "query_compromised_identifiers(id_type: str, lookback_days: int) → list[CompromisedID]", description: "Retrieve flagged beneficiary and provider identifiers from authorized threat intel feeds." },
      { name: "match_claims_to_compromised_ids", signature: "match_claims_to_compromised_ids(compromised_ids: list[str], window_days: int) → list[ClaimMatch]", description: "Cross-reference active claims against the compromised identifier watchlist." },
      { name: "detect_synthetic_identity", signature: "detect_synthetic_identity(entity_id: str, id_attributes: dict) → SyntheticIDScore", description: "Score an entity's identity coherence across SSA records, enrollment data, and clinical history." },
      { name: "monitor_emerging_tactics", signature: "monitor_emerging_tactics(product_categories: list[str]) → list[TacticAlert]", description: "Surface intelligence about new fraud schemes targeting specific product categories." },
    ],
    tasks: [
      { id: "T1", label: "Ingest and triage threat intel", description: "Process incoming compromised identity alerts and new tactic intelligence. Prioritize by financial exposure." },
      { id: "T2", label: "Cross-reference active claims", description: "Match compromised identifiers against the current claims processing queue for prepayment hold." },
      { id: "T3", label: "Synthetic identity screening", description: "Score newly enrolled beneficiaries and suppliers against synthetic identity indicators." },
      { id: "T4", label: "Emerging tactic dissemination", description: "Route new tactic alerts to Policy Agent and Trust Defender for control gap assessment." },
    ],
    outputs: [
      { field: "watchlist_matches", type: "ClaimMatch[]", description: "Active claims using compromised identifiers — routed to CRUSH Fraud for prepayment action." },
      { field: "synthetic_id_alerts", type: "SyntheticIDAlert[]", description: "Newly enrolled entities with high synthetic identity scores." },
      { field: "tactic_intelligence", type: "TacticAlert[]", description: "Emerging scheme patterns and product category warnings for downstream scenario planning." },
    ],
    memoryType: "Real-time cache for active watchlist. Persistent episodic store for tactic intelligence history.",
    orchestration: "Continuous streaming for watchlist cross-reference. Event-driven on new intel publication.",
  },
  {
    id: "referral", name: "Referral Integrity", shortName: "Referral Integrity",
    tagline: "Was there a real clinical need — and a real relationship?",
    objective: "Connect ordering-provider encounters, diagnoses, specialty, and order timing to test whether a genuine treating relationship and clinically coherent need exist.",
    color: "#3d4551", icon: "◉",
    inputs: [
      { label: "Claims encounter data", description: "E&M encounters, diagnoses, ordering dates, NPI of ordering vs treating provider", source: "CMS NCH / Part B claims" },
      { label: "Ordering provider specialty profiles", description: "Specialty, typical prescribing patterns, geographic practice area", source: "NPPES, claims history" },
      { label: "Medical record samples", description: "Documentation submitted for ADR, medical review, or audit", source: "MAC medical review" },
      { label: "Telehealth encounter records", description: "Modality, duration, platform, consent", source: "Part B telehealth claims" },
    ],
    tools: [
      { name: "verify_treating_relationship", signature: "verify_treating_relationship(ordering_npi: str, beneficiary_id: str, order_date: str) → RelationshipScore", description: "Check whether the ordering provider had a documented encounter within a clinically appropriate window before the order." },
      { name: "score_documentation_similarity", signature: "score_documentation_similarity(record_ids: list[str]) → SimilarityReport", description: "Detect templated medical records using embedding-based similarity scoring." },
      { name: "assess_specialty_coherence", signature: "assess_specialty_coherence(ordering_npi: str, ordered_codes: list[str]) → CoherenceScore", description: "Flag orders for items outside the ordering provider's specialty scope." },
      { name: "detect_order_velocity_anomaly", signature: "detect_order_velocity_anomaly(ordering_npi: str, code: str, period: str) → VelocityAnomaly", description: "Identify ordering providers whose authorization volume is a statistical outlier vs. specialty peers." },
    ],
    tasks: [
      { id: "T1", label: "Build ordering provider profiles", description: "Compile encounter history, specialty, and typical ordering patterns for each active NPI." },
      { id: "T2", label: "Treating relationship validation", description: "Verify a qualifying encounter predates the order and the diagnosis supports the item." },
      { id: "T3", label: "Documentation similarity screening", description: "Apply embedding similarity to medical records. Flag populations with near-identical documentation." },
      { id: "T4", label: "Near-universal qualification detection", description: "Flag orderers whose beneficiary qualification rate significantly exceeds specialty norms." },
    ],
    outputs: [
      { field: "order_integrity_scores", type: "OrderIntegrityScore[]", description: "Per-order or per-provider scores combining relationship validity, documentation coherence, and specialty alignment." },
      { field: "boilerplate_alerts", type: "DocumentationAlert[]", description: "Providers whose medical records show statistically abnormal template similarity." },
      { field: "rubber_stamp_flags", type: "ProviderFlag[]", description: "Ordering providers with implausibly high qualification approval rates." },
    ],
    memoryType: "Rolling 24-month episodic memory for encounter and ordering history. Semantic store for documentation embeddings.",
    orchestration: "Batch nightly for profile maintenance. Real-time scoring on high-value orders above configurable threshold.",
  },
  {
    id: "auth", name: "Authorization and Records", shortName: "Auth & Records",
    tagline: "Is the authorization real — or a rubber stamp at scale?",
    objective: "Validate prior authorization documentation, certificates of medical necessity, and clinical certifications across DMEPOS and home health. Detect fabricated, templated, or systematically implausible authorizations before payment.",
    color: "#3d4551", icon: "◈",
    inputs: [
      { label: "Prior authorization requests", description: "Submitted PA requests with supporting documentation, denial history, and appeal records", source: "CMS PA Program / MACs" },
      { label: "Certificates of Medical Necessity", description: "CMNs and DIFs submitted by suppliers, ordered by prescribing clinicians", source: "Supplier documentation submissions" },
      { label: "Medical necessity documentation", description: "Clinical notes, face-to-face encounter records, and supporting diagnoses submitted with PA or ADR requests", source: "MAC medical review / ADR responses" },
      { label: "Prescriber certification records", description: "Clinician signatures, attestations, NPI, specialty, and ordering volume history", source: "NPPES, CMS Part B claims" },
    ],
    tools: [
      { name: "validate_cmn_integrity", signature: "validate_cmn_integrity(cmn_id: str, supplier_id: str) → CMNValidation", description: "Cross-reference CMN fields against beneficiary diagnosis history and ordering provider encounter record. Flag mismatched diagnoses, missing face-to-face, or implausible dates." },
      { name: "score_authorization_plausibility", signature: "score_authorization_plausibility(auth_request: PARequest) → PlausibilityScore", description: "Score authorization requests against clinical norms for the product category, beneficiary profile, and ordering provider specialty." },
      { name: "detect_template_signatures", signature: "detect_template_signatures(doc_ids: list[str]) → TemplateReport", description: "Apply embedding-based similarity to CMNs and clinical notes. Surface populations of near-identical documentation." },
      { name: "flag_rubber_stamp_prescribers", signature: "flag_rubber_stamp_prescribers(npi: str, period: str) → RubberStampScore", description: "Identify ordering providers whose authorization approval rate is a statistical outlier versus specialty peers." },
    ],
    tasks: [
      { id: "T1", label: "CMN and PA validation", description: "For every authorization request, verify the supporting CMN against diagnosis history, encounter records, and ordering provider specialty. Flag structural mismatches." },
      { id: "T2", label: "Documentation template detection", description: "Run embedding similarity across CMN and clinical note populations. Flag cohorts with statistically abnormal documentation uniformity." },
      { id: "T3", label: "Prescriber pattern analysis", description: "Score ordering providers against specialty peers on approval rate, co-signature patterns, and geographic reach of authorizations. Escalate statistical outliers for targeted review." },
    ],
    outputs: [
      { field: "cmn_anomalies", type: "CMNAnomaly[]", description: "Authorization records with mismatched diagnoses, missing encounter evidence, or implausible clinical sequences." },
      { field: "template_flags", type: "TemplateFlag[]", description: "CMN and clinical note cohorts with embedding similarity above threshold — indicative of mass fabrication." },
      { field: "rubber_stamp_alerts", type: "ProviderAlert[]", description: "Ordering providers whose authorization approval rates significantly exceed specialty norms." },
    ],
    memoryType: "Episodic memory for authorization and CMN history. Semantic document embedding store for template similarity.",
    orchestration: "Real-time on PA submission for prepayment decision support. Batch nightly for retrospective CMN population analysis.",
  },
  {
    id: "claims", name: "Claims and Payment Systems", shortName: "Claims & Payment",
    tagline: "How is the billing system itself being exploited?",
    objective: "Analyze claims at the payment-processing layer to detect edit bypass patterns, modifier manipulation, remittance anomalies, and systematic exploitation of claims system rules before or after payment.",
    color: "#3d4551", icon: "◉",
    inputs: [
      { label: "Claims - Medicare FFS", description: "Claim-level records including edit codes, denial reasons, resubmission counts, and payment status", source: "API needed" },
      { label: "Encounters - Medicare Advantage", description: "Encounter-level records from MA plans including adjudication and payment status", source: "API needed" },
      { label: "Claims - Medicaid / TMSIS", description: "State Medicaid claims and encounters with remittance and adjustment history", source: "API needed" },
      { label: "HFPP/Commercial", description: "Health care Fraud Prevention Partnership and commercial payer data for cross-payer pattern detection", source: "API needed" },
    ],
    tools: [
      { name: "detect_edit_bypass", signature: "detect_edit_bypass(supplier_id: str, edit_codes: list[str], period: str) → BypassReport", description: "Identify suppliers systematically avoiding NCCI/MUE edits through modifier stacking, split billing, or date-of-service manipulation." },
      { name: "analyze_modifier_patterns", signature: "analyze_modifier_patterns(supplier_id: str, codes: list[str]) → ModifierAnomalyReport", description: "Flag abnormal modifier usage rates, unsupported modifier pairs, and migration patterns following denial surges." },
      { name: "score_remittance_anomalies", signature: "score_remittance_anomalies(provider_id: str, period: str) → RemittanceScore", description: "Identify payment-to-billed ratios, systematic write-off patterns, and unusual contractual adjustment sequences." },
      { name: "flag_resubmission_exploitation", signature: "flag_resubmission_exploitation(supplier_id: str, lookback_days: int) → ResubmissionFlag", description: "Detect suppliers with atypically high resubmission rates, override patterns, or appeals success rates suggesting systematic gaming of adjudication rules." },
    ],
    tasks: [
      { id: "T1", label: "Edit bypass pattern detection", description: "Scan active suppliers for systematic patterns of NCCI/MUE edit avoidance. Identify modifier stacking, split claim strategies, and date-of-service manipulation that circumvent payment controls." },
      { id: "T2", label: "Modifier and code manipulation analysis", description: "Profile modifier usage across suppliers and code groups. Flag migration patterns triggered by denial surges and unsupported modifier combinations." },
      { id: "T3", label: "Remittance and resubmission anomaly detection", description: "Analyze ERA/835 remittance data for abnormal payment ratios and adjustment patterns. Identify suppliers exploiting the appeals and resubmission process to recover denied claims at scale." },
    ],
    outputs: [
      { field: "edit_bypass_alerts", type: "BypassAlert[]", description: "Suppliers with statistically significant patterns of NCCI/MUE edit circumvention." },
      { field: "modifier_anomaly_flags", type: "ModifierAnomaly[]", description: "Abnormal modifier usage and post-denial migration patterns by supplier and code." },
      { field: "remittance_discrepancies", type: "RemittanceAnomaly[]", description: "Payment and adjustment patterns inconsistent with legitimate billing — routed to CRUSH Fraud for case development." },
    ],
    memoryType: "Rolling 24-month claims and remittance history. Persistent edit bypass pattern library for regression monitoring.",
    orchestration: "Real-time on claim receipt for high-risk code cohorts. Nightly batch for retrospective pattern analysis.",
  },
]

const ENTERPRISE_AGENTS: Agent[] = [
  {
    id: "trust_defender", name: "Trust Defender", shortName: "Trust Defender",
    tagline: "What vulnerabilities should shape the next policy cycle?",
    objective: "Synthesize outputs from all Surface/Threat Identification Agents into a biweekly policy vulnerability assessment. Surface emerging attack vectors, coverage gaps, and scheme trajectories relevant to CMS policy leaders and CPI. Maintain a live vulnerability dashboard for the CPI leadership team.",
    color: "#1a4480", icon: "◈",
    inputs: [
      { label: "Policy control matrix & vulnerability ranking", description: "Exploitable coverage gaps, weak documentation controls, and upcoding surfaces by HCPCS code and MAC jurisdiction", source: "control_matrix · vulnerability_ranking" },
      { label: "Fraud typology library & detection gap report", description: "Scheme patterns with retrospective signal signatures and controls that failed to fire pre-revocation", source: "typology_library · detection_gap_report" },
      { label: "Billing anomaly queue & peer deviation report", description: "Entity-level outliers ranked by financial exposure, velocity spikes, and cross-payer arbitrage signals", source: "anomaly_queue · peer_deviation_report" },
      { label: "Tactic intelligence & synthetic identity alerts", description: "Emerging scheme playbooks, compromised MBI signals, and newly enrolled entities with synthetic identity indicators", source: "tactic_intelligence · synthetic_id_alerts" },
      { label: "Entity network graph & reincarnation alerts", description: "Affiliation clusters, shared-infrastructure suppliers, and newly enrolled entities linked to revoked predecessors", source: "network_graph · reincarnation_alerts" },
      { label: "Modifier anomaly flags & remittance discrepancies", description: "Claims-layer exploitation patterns including edit bypass, modifier stacking, and resubmission gaming", source: "modifier_anomaly_flags · remittance_discrepancies" },
    ],
    tools: [
      { name: "synthesize_attack_surface", signature: "synthesize_attack_surface(signal_outputs: list[AgentOutput], period: str) → AttackSurfaceReport", description: "Aggregate and cross-reference outputs from all Signal agents. Identify convergent vulnerabilities where multiple signal types point to the same control gap." },
      { name: "estimate_policy_exposure", signature: "estimate_policy_exposure(vulnerability: VulnerabilityCluster, payment_volume: float) → ExposureEstimate", description: "Project improper payment exposure if the vulnerability is exploited at scale, given current coverage rules and payment volumes." },
      { name: "draft_policy_memo", signature: "draft_policy_memo(vulnerabilities: list[VulnerabilityCluster], recipients: list[str]) → PolicyMemo", description: "Generate a structured biweekly memo with executive summary, ranked vulnerabilities, policy implications, and recommended actions for CM/CMCS/CCIIO audiences." },
      { name: "update_vulnerability_dashboard", signature: "update_vulnerability_dashboard(portfolio: VulnerabilityPortfolio) → DashboardState", description: "Refresh the live CPI vulnerability dashboard with current risk register, trend indicators, and open action items." },
    ],
    tasks: [
      { id: "T1", label: "Ingest and cross-reference signal outputs", description: "Pull the latest outputs from all eight Surface/Threat Identification Agents. Normalize and cross-reference to identify convergent vulnerabilities where billing, policy, identity, and network signals align." },
      { id: "T2", label: "Assess attack surface and estimate exposure", description: "For each emerging vulnerability cluster, estimate financial exposure, scheme scalability, and detection lag. Prioritize by urgency × exposure × current control gap." },
      { id: "T3", label: "Draft biweekly policy vulnerability memo", description: "Produce a structured memo for CM, CMCS, and CCIIO leadership — executive summary, top attack vectors, policy implications, and recommended coverage or documentation rule changes." },
      { id: "T4", label: "Update live CPI vulnerability dashboard", description: "Refresh the real-time dashboard for CPI leadership with the current prioritized risk register, open vulnerabilities, trend indicators, and action ownership." },
    ],
    outputs: [
      { field: "policy_vulnerability_memo", type: "PolicyMemo", description: "Biweekly structured memo for CM, CMCS, and CCIIO — ranked attack vectors, policy exposure estimates, and recommended coverage rule or documentation changes." },
      { field: "vulnerability_dashboard", type: "DashboardState", description: "Live prioritized risk register for CPI leadership — open vulnerabilities, trend indicators, exposure estimates, and action ownership." },
      { field: "attack_surface_report", type: "AttackSurfaceReport", description: "Cross-agent synthesis identifying convergent control gaps where multiple signal types point to the same exploitable weakness." },
    ],
    memoryType: "Long-term strategic memory — versioned vulnerability portfolio with trend tracking across quarters.",
    orchestration: "Continuous ingestion of signal layer outputs. Biweekly memo production cycle. Dashboard updated on each new signal batch.",
    outputFrequency: "Biweekly",
    outputRecipients: ["CM", "CMCS", "CCIIO", "CPI"],
  },
  {
    id: "crush", name: "CRUSH Fraud", shortName: "CRUSH Fraud",
    tagline: "Which schemes and patterns need action before the next payment run?",
    objective: "Triage daily signal outputs from Surface/Threat Identification Agents into prioritized issue briefs for FDOC and CRUSH operations. Generate structured API submissions to the Fraud Prevention System. Route high-confidence claims for prepayment hold.",
    color: "#1a4480", icon: "◎",
    inputs: [
      { label: "Ranked billing anomalies & migration alerts", description: "Entity-level outliers with confidence scores, velocity patterns, and post-denial code-shift signals ready for enforcement triage", source: "anomaly_queue · migration_alerts" },
      { label: "Edit bypass alerts & modifier anomaly flags", description: "Suppliers systematically circumventing NCCI/MUE edits, stacking unsupported modifiers, or exploiting resubmission rules", source: "edit_bypass_alerts · modifier_anomaly_flags" },
      { label: "Reincarnation alerts & entity network graph", description: "Newly enrolled entities linked to revoked predecessors and high-risk affiliation clusters requiring immediate action", source: "reincarnation_alerts · network_graph" },
      { label: "Watchlist matches", description: "Active claims using compromised MBIs or provider credentials flagged for pre-payment intervention", source: "watchlist_matches" },
      { label: "Attack surface report", description: "Cross-agent vulnerability synthesis identifying convergent control gaps that should generate new detection rules", source: "attack_surface_report" },
      { label: "CMN anomalies & rubber stamp alerts", description: "Authorization records with mismatched diagnoses and ordering providers with implausibly high approval rates", source: "cmn_anomalies · rubber_stamp_alerts" },
    ],
    tools: [
      { name: "triage_daily_signal_queue", signature: "triage_daily_signal_queue(signals: list[AgentOutput], date: str) → PrioritizedQueue", description: "Score and rank incoming signals from all surface agents by financial exposure, confidence level, and prepayment intervention window." },
      { name: "generate_issue_brief", signature: "generate_issue_brief(queue: PrioritizedQueue, recipients: list[str]) → IssueBrief", description: "Produce a structured daily issue brief with ranked schemes, supporting evidence, and recommended actions for FDOC and CRUSH operations staff." },
      { name: "submit_fps_alerts", signature: "submit_fps_alerts(signals: list[HighConfidenceSignal]) → FPSSubmissionReceipt", description: "Format and submit prioritized alerts to the Fraud Prevention System and CPI via API. Include evidence package and confidence metadata." },
      { name: "route_prepayment_hold", signature: "route_prepayment_hold(claim_ids: list[str], rationale: str, evidence: Evidence) → HoldDecision", description: "Flag specified claims for prepayment review with structured rationale and evidence package before payment is released." },
    ],
    tasks: [
      { id: "T1", label: "Triage daily signal queue", description: "Pull and score outputs from all Surface/Threat Identification Agents. Rank by financial exposure, confidence, and prepayment intervention window. Separate actionable signals from monitoring queue." },
      { id: "T2", label: "Generate daily issue brief for FDOC & CRUSH", description: "Produce a structured daily issue brief ranking active schemes and patterns by priority. Include supporting evidence, recommended actions, and case-readiness assessment for FDOC operations staff and CRUSH analysts." },
      { id: "T3", label: "Submit prioritized alerts to FPS/CPI via API", description: "Format high-confidence signals as structured API submissions to the Fraud Prevention System. Include evidence package, confidence score, and recommended hold or investigation action." },
      { id: "T4", label: "Route claims for prepayment hold", description: "For signals with sufficient confidence and within the prepayment window, flag specific claims for pre-payment review with rationale and beneficiary safeguard assessment." },
    ],
    outputs: [
      { field: "daily_issue_brief", type: "IssueBrief", description: "Daily ranked list of active schemes and patterns with evidence and recommended actions — distributed to FDOC and CRUSH operations staff." },
      { field: "fps_api_submissions", type: "FPSSubmission[]", description: "Structured alert records submitted to the Fraud Prevention System and CPI via API — includes confidence score, evidence package, and action recommendation." },
      { field: "prepayment_holds", type: "HoldDecision[]", description: "Claims flagged for prepayment review before Medicare payment is released — with rationale and beneficiary safeguard assessment." },
    ],
    memoryType: "Episodic memory for active case queue. Semantic memory for detection rule library and evasion pattern store.",
    orchestration: "Daily batch triage of signal queue. Real-time routing for prepayment holds. API submissions on each triage cycle.",
    outputFrequency: "Daily",
    outputRecipients: ["FDOC", "CRUSH", "FPS/CPI"],
  },
  {
    id: "resilience", name: "System Resilience", shortName: "System Resilience",
    tagline: "Where is the claims technology stack exposed to adversarial exploitation?",
    objective: "Assess the technology attack surface of CMS claims systems and MACs. Identify where adjudication systems, analytic models, and MAC infrastructure can be exploited. Produce monthly memos for OIT on claims technology vulnerabilities and recommended hardening actions.",
    color: "#1a4480", icon: "◫",
    inputs: [
      { label: "Detection gap report", description: "Controls that failed to fire before revocation — indicating systematic adjudication weaknesses exploitable through claims system logic", source: "detection_gap_report" },
      { label: "Edit bypass alerts", description: "Suppliers successfully circumventing NCCI/MUE edits — evidence that claims processing rules have exploitable threshold or sequencing gaps", source: "edit_bypass_alerts" },
      { label: "Remittance discrepancies", description: "Payment and adjustment anomalies revealing adjudication logic gaps and resubmission exploitation patterns in MAC claims systems", source: "remittance_discrepancies" },
      { label: "Attack surface report", description: "Cross-agent convergent vulnerability synthesis identifying where technology controls and analytic models share common exploitable weaknesses", source: "attack_surface_report" },
      { label: "CMS deployed models & claims system configuration", description: "Current ML model registry, claims edit rule sets, prior-authorization system configurations, and MAC-level adjudication parameters", source: "CMS OIT / model registry" },
    ],
    tools: [
      { name: "audit_claims_system_gaps", signature: "audit_claims_system_gaps(edit_bypasses: list[BypassAlert], remittance_anomalies: list[RemittanceAnomaly]) → SystemGapReport", description: "Cross-reference observed edit bypass and remittance patterns against claims adjudication rules. Identify exploitable threshold, sequencing, and modifier logic gaps in MAC systems." },
      { name: "measure_model_drift", signature: "measure_model_drift(model_id: str, ref_period: str, curr_period: str) → DriftReport", description: "Compare deployed model performance metrics across time periods. Flag precision or recall degradation in claims review models." },
      { name: "assess_mac_technology_posture", signature: "assess_mac_technology_posture(mac_ids: list[str], gap_report: SystemGapReport) → MACPostureReport", description: "Evaluate technology and control posture across MAC jurisdictions. Identify inconsistent edit configurations and adjudication logic gaps by jurisdiction." },
      { name: "draft_oit_memo", signature: "draft_oit_memo(gap_report: SystemGapReport, posture_report: MACPostureReport) → OITMemo", description: "Generate a structured monthly memo for OIT leadership covering technology attack surface findings, model drift, MAC posture, and prioritized hardening recommendations." },
    ],
    tasks: [
      { id: "T1", label: "Audit claims system vulnerabilities from signal outputs", description: "Cross-reference edit bypass alerts, remittance discrepancies, and detection gap reports to identify where claims adjudication system logic is being systematically exploited across MACs." },
      { id: "T2", label: "Assess MAC technology posture", description: "Evaluate adjudication rule consistency, edit configuration gaps, and prior-authorization system coverage across MAC jurisdictions. Flag jurisdictions with elevated exploitation exposure." },
      { id: "T3", label: "Monitor deployed model performance", description: "Track precision, recall, and calibration of deployed detection models. Alert on drift beyond operational thresholds and flag retraining needs to CMS model owners." },
      { id: "T4", label: "Draft monthly OIT technology assessment memo", description: "Produce a structured monthly memo for OIT leadership — claims system attack surface, MAC posture findings, model drift summary, and prioritized hardening and remediation actions." },
    ],
    outputs: [
      { field: "oit_technology_memo", type: "OITMemo", description: "Monthly structured memo for OIT leadership — claims technology attack surface, MAC posture assessment, model drift summary, and hardening recommendations." },
      { field: "claims_system_gap_report", type: "SystemGapReport", description: "Identified exploitable gaps in MAC adjudication rules, edit configurations, and resubmission logic — routed to PI Operations for remediation action." },
      { field: "model_drift_alerts", type: "DriftAlert[]", description: "Deployed detection models with performance degradation beyond thresholds — routed to CMS model owners and OIT for retraining." },
    ],
    memoryType: "Versioned model performance history. Persistent evasion pattern library for regression testing.",
    orchestration: "Monthly memo production cycle. Continuous model drift monitoring. Triggered audit on new edit bypass pattern detection.",
    outputFrequency: "Monthly",
    outputRecipients: ["OIT"],
  },
  {
    id: "pi_ops", name: "Program Integrity Operations", shortName: "PI Operations",
    tagline: "What controls need to change — and who in CPI owns them?",
    objective: "Convert outputs from all CMS/CPI Action Agents into operational actions for CPI. Triage findings, assign accountable CPI owners, draft monthly operations briefs, and track implementation of deployed controls. Close the feedback loop back to CRUSH Fraud on control performance.",
    color: "#1a4480", icon: "⬡",
    inputs: [
      { label: "Policy vulnerability memo & attack surface report", description: "Biweekly policy vulnerability assessment with ranked attack vectors, exposure estimates, and recommended coverage or documentation rule changes", source: "policy_vulnerability_memo · attack_surface_report" },
      { label: "Daily issue brief & FPS API submissions", description: "Prioritized scheme and pattern list from CRUSH Fraud with evidence packages and recommended CPI actions", source: "daily_issue_brief · fps_api_submissions" },
      { label: "OIT technology memo & claims system gap report", description: "Monthly technology attack surface findings and MAC adjudication gaps requiring CPI operational response", source: "oit_technology_memo · claims_system_gap_report" },
      { label: "Order integrity scores & rubber stamp flags", description: "Ordering provider anomalies and authorization approval outliers requiring CPI audit or enrollment action", source: "order_integrity_scores · rubber_stamp_flags" },
      { label: "CPI analyst feedback", description: "Case outcome data, false positive reports, and investigation findings from CPI analysts, RACs, and ZPICs", source: "CPI analysts / RAC / ZPIC" },
    ],
    tools: [
      { name: "triage_cpi_action_queue", signature: "triage_cpi_action_queue(inputs: list[AgentOutput]) → CPIActionQueue", description: "Consolidate and deduplicate findings from all Action Agents. Prioritize by financial exposure, implementation feasibility, and CPI operational capacity." },
      { name: "assign_cpi_owner", signature: "assign_cpi_owner(action: CPIAction, org_context: OrgContext) → OwnerAssignment", description: "Route each action to the appropriate CPI division, MAC, or contractor with accountability tracking and implementation timeline." },
      { name: "draft_cpi_operations_brief", signature: "draft_cpi_operations_brief(action_queue: CPIActionQueue, period: str) → CPIBrief", description: "Produce a monthly structured brief for CPI leadership — open actions, ownership assignments, implementation status, and performance metrics." },
      { name: "monitor_control_performance", signature: "monitor_control_performance(control_id: str, period: str) → PerformanceMetrics", description: "Track deployed control performance against baseline — improper payment reduction, false positive rate, and operational burden. Route results back to CRUSH Fraud." },
    ],
    tasks: [
      { id: "T1", label: "Triage and consolidate findings from Action Agents", description: "Pull and consolidate outputs from Trust Defender, CRUSH Fraud, and System Resilience. Deduplicate overlapping findings and prioritize by financial exposure, urgency, and CPI operational capacity." },
      { id: "T2", label: "Assign CPI owners and draft action items", description: "For each prioritized finding, identify the appropriate CPI division, MAC, or contractor. Draft a structured action item with implementation type, timeline, expected benefit, and success metrics." },
      { id: "T3", label: "Produce monthly CPI operations brief", description: "Generate a structured monthly brief for CPI leadership — open action queue, ownership assignments, implementation status, new high-priority findings, and deployed control performance summary." },
      { id: "T4", label: "Monitor controls and close feedback loop", description: "Track performance of deployed controls against baseline metrics. Route performance data back to CRUSH Fraud to refine detection rules and update the FPS submission queue." },
    ],
    outputs: [
      { field: "cpi_operations_brief", type: "CPIBrief", description: "Monthly structured brief for CPI leadership — open action queue, ownership assignments, implementation status, and control performance summary." },
      { field: "cpi_action_assignments", type: "OwnerAssignment[]", description: "Specific operational actions assigned to CPI divisions, MACs, or contractors — with implementation type, timeline, and success metrics." },
      { field: "control_performance_report", type: "PerformanceMetrics[]", description: "Deployed control effectiveness metrics routed back to CRUSH Fraud for detection rule refinement and FPS queue calibration." },
    ],
    memoryType: "Long-term episodic memory for action history and outcome tracking. Semantic memory for policy precedent library.",
    orchestration: "Monthly brief production cycle. Continuous action queue triage. Weekly performance monitoring feedback to CRUSH Fraud.",
    outputFrequency: "Monthly",
    outputRecipients: ["CPI"],
  },
]

// ── DAG Layouts ────────────────────────────────────────────────────────────────

const NODE_W = 154
const NODE_H = 52

// Two-layer DAG:
// Layer 1 (y=80):  policy, supervised, utilization, referral, auth, claims  ← signal sources
// Layer 2 (y=220): provider, beneficiary                                     ← identification targets
const SIGNAL_LAYOUT: DAGLayout = {
  width: 1060, height: 300,
  nodes: [
    { agentId: "policy",      cx: 117, cy: 80  },
    { agentId: "supervised",  cx: 309, cy: 80  },
    { agentId: "utilization", cx: 501, cy: 80  },
    { agentId: "referral",    cx: 693, cy: 80  },
    { agentId: "auth",        cx: 885, cy: 80  },
    { agentId: "claims",      cx: 1040,cy: 80  },
    { agentId: "provider",    cx: 350, cy: 220 },
    { agentId: "beneficiary", cx: 710, cy: 220 },
  ],
  edges: [
    // Layer 1 → provider (solid)
    { from: "policy",      to: "provider"    },
    { from: "supervised",  to: "provider"    },
    { from: "utilization", to: "provider"    },
    { from: "referral",    to: "provider"    },
    { from: "auth",        to: "provider"    },
    { from: "claims",      to: "provider"    },
    // Layer 1 → beneficiary (dashed)
    { from: "policy",      to: "beneficiary", style: "dashed" },
    { from: "supervised",  to: "beneficiary", style: "dashed" },
    { from: "utilization", to: "beneficiary", style: "dashed" },
    { from: "auth",        to: "beneficiary", style: "dashed" },
    { from: "claims",      to: "beneficiary", style: "dashed" },
  ],
}

const ENTERPRISE_LAYOUT: DAGLayout = {
  width: 700, height: 260,
  nodes: [
    { agentId: "trust_defender", cx: 110, cy: 130 },
    { agentId: "crush",          cx: 360, cy: 75  },
    { agentId: "resilience",     cx: 360, cy: 195 },
    { agentId: "pi_ops",         cx: 590, cy: 130 },
  ],
  edges: [
    { from: "trust_defender", to: "crush"      },
    { from: "trust_defender", to: "resilience" },
    { from: "crush",          to: "pi_ops"     },
    { from: "resilience",     to: "pi_ops"     },
    { from: "crush",          to: "resilience", style: "dashed" },
  ],
}

// ── WorkflowDAG ────────────────────────────────────────────────────────────────

function WorkflowDAG({
  layout, agents, selectedId, onSelect,
}: {
  layout: DAGLayout
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isZoomed, setIsZoomed] = useState(false)

  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]))
  const nodeMap  = Object.fromEntries(layout.nodes.map(n => [n.agentId, n]))

  useEffect(() => {
    if (!selectedId || !containerRef.current) return
    const node = nodeMap[selectedId]
    if (!node) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const scale = 2.0
    const tx = cw / 2 - node.cx * scale
    const ty = ch / 2 - node.cy * scale
    setTransform({ scale, tx, ty })
    setIsZoomed(true)
  }, [selectedId])

  function handleReset() {
    setTransform({ scale: 1, tx: 0, ty: 0 })
    setIsZoomed(false)
  }

  function edgePath(from: DAGNode, to: DAGNode): string {
    const x1 = from.cx + NODE_W / 2
    const y1 = from.cy
    const x2 = to.cx - NODE_W / 2
    const y2 = to.cy
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }

  const svgStyle: CSSProperties = {
    transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
    transformOrigin: "0 0",
    transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{ height: 280, overflow: "hidden", position: "relative", background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)", borderRadius: 4 }}
      >
        {/* Grid bg */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,94,162,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,94,162,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        <svg
          style={{ ...svgStyle, display: "block", overflow: "visible" }}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,94,162,0.4)" />
            </marker>
            <marker id="arrow-accent" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,94,162,0.7)" />
            </marker>
            {agents.map(a => (
              <filter key={a.id} id={`glow-${a.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>

          {/* Edges */}
          {layout.edges.map((edge, i) => {
            const from = nodeMap[edge.from]
            const to   = nodeMap[edge.to]
            if (!from || !to) return null
            const isActive = selectedId === edge.from || selectedId === edge.to
            return (
              <path
                key={i}
                d={edgePath(from, to)}
                fill="none"
                stroke={isActive ? "rgba(0,94,162,0.7)" : "rgba(0,94,162,0.22)"}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={edge.style === "dashed" ? "5 4" : undefined}
                markerEnd={isActive ? "url(#arrow-accent)" : "url(#arrow)"}
                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
              />
            )
          })}

          {/* Nodes */}
          {layout.nodes.map((node, nodeIdx) => {
            const agent = agentMap[node.agentId]
            if (!agent) return null
            const agentNum = agents.findIndex(a => a.id === agent.id) + 1
            const sel = selectedId === agent.id
            const x = node.cx - NODE_W / 2
            const y = node.cy - NODE_H / 2

            return (
              <g
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                style={{ cursor: "pointer" }}
                filter={sel ? `url(#glow-${agent.id})` : undefined}
              >
                {/* Selection ring */}
                {sel && (
                  <rect x={x - 4} y={y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={6}
                    fill="none" stroke={agent.color} strokeWidth={1} opacity={0.35} />
                )}
                {/* Node body */}
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={3}
                  fill={sel ? `${agent.color}1a` : "rgba(245,246,247,0.95)"}
                  stroke={agent.color}
                  strokeWidth={sel ? 1.5 : 0.7}
                  strokeOpacity={sel ? 0.9 : 0.4}
                  style={{ transition: "fill 0.3s, stroke-opacity 0.3s" }}
                />
                {/* Left accent bar */}
                <rect x={x} y={y + 6} width={3} height={NODE_H - 12} rx={1.5}
                  fill={agent.color} opacity={sel ? 0.9 : 0.4}
                  style={{ transition: "opacity 0.3s" }}
                />
                {/* Number badge */}
                <rect x={x + 6} y={y + 6} width={14} height={14} rx={3}
                  fill={`${agent.color}22`} stroke={agent.color} strokeWidth={0.6} strokeOpacity={0.5} />
                <text x={x + 13} y={y + 16} textAnchor="middle"
                  fill={agent.color} fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight="700">
                  {agentNum}
                </text>
                {/* Icon */}
                <text x={x + 32} y={node.cy + 1} textAnchor="middle"
                  fill={agent.color} fontSize={11} opacity={sel ? 1 : 0.7}
                  style={{ fontFamily: "sans-serif", transition: "opacity 0.3s" }}>
                  {agent.icon}
                </text>
                {/* Name line 1 */}
                <text x={x + 44} y={node.cy - 7} textAnchor="start"
                  fill={sel ? agent.color : "#1b1b1b"}
                  fontSize={8.5}
                  fontFamily="Orbitron, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.04em"
                  style={{ transition: "fill 0.3s" }}>
                  {agent.shortName.split(" ").slice(0, 2).join(" ")}
                </text>
                {/* Name line 2 */}
                <text x={x + 44} y={node.cy + 7} textAnchor="start"
                  fill={sel ? `${agent.color}cc` : "#757575"}
                  fontSize={7.5}
                  fontFamily="JetBrains Mono, monospace"
                  style={{ transition: "fill 0.3s" }}>
                  {agent.shortName.split(" ").slice(2).join(" ")}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Controls */}
      <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
        {isZoomed && (
          <button
            onClick={handleReset}
            className="font-mono text-sm px-2 py-1 rounded transition-colors"
            style={{ background: "rgba(22,46,81,0.9)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2", fontSize: "18", backdropFilter: "blur(4px)" }}
          >
            ← ZOOM OUT
          </button>
        )}
      </div>
    </div>
  )
}

// ── Agent Accordion Card ───────────────────────────────────────────────────────

type SectionId = "objective" | "inputs" | "tools" | "tasks" | "outputs"

const SECTIONS: { id: SectionId; label: string; icon: string; countKey?: keyof Agent }[] = [
  { id: "objective", label: "Objective",     icon: "◎" },
  { id: "inputs",    label: "Inputs",        icon: "◈", countKey: "inputs"  },
  { id: "tools",     label: "Tools",         icon: "◉", countKey: "tools"   },
  { id: "tasks",     label: "Tasks",         icon: "◫", countKey: "tasks"   },
  { id: "outputs",   label: "Output Schema", icon: "⬡", countKey: "outputs" },
]

function AgentAccordionCard({ agent, index, isHighlighted, onHeaderClick, onOpenDb }: {
  agent: Agent
  index: number
  isHighlighted: boolean
  onHeaderClick: () => void
  onOpenDb: (agentId: string, section: "inputs" | "outputs" | "billing" | "gap") => void
}) {
  const [open, setOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(["objective"]))

  useEffect(() => {
    if (isHighlighted) setOpen(true)
  }, [isHighlighted])

  function toggleSection(id: SectionId) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function sectionCount(s: typeof SECTIONS[number]): number | null {
    if (!s.countKey) return null
    const val = agent[s.countKey]
    return Array.isArray(val) ? val.length : null
  }

  return (
    <div
      className="rounded overflow-hidden transition-all duration-200"
      style={{
        border: isHighlighted ? `1px solid ${agent.color}55` : "1px solid rgba(0,94,162,0.12)",
        background: "var(--card)",
        boxShadow: isHighlighted ? `0 0 20px ${agent.color}12` : "none",
      }}
    >
      {/* ── Agent header row ── */}
      <button
        onClick={() => { setOpen(o => !o); onHeaderClick() }}
        className="w-full text-left transition-colors"
        style={{ background: open ? `linear-gradient(90deg, ${agent.color}0d 0%, transparent 55%)` : "transparent" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Number badge */}
          <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-mono font-bold"
            style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}44`, color: agent.color, fontSize: "15" }}>
            {index + 1}
          </div>

          {/* Icon */}
          <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}33` }}>
            <span style={{ color: agent.color, fontSize: "16" }}>{agent.icon}</span>
          </div>

          {/* Name + tagline */}
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold tracking-widest" style={{ color: open ? agent.color : "#162e51", fontSize: "15" }}>
              {agent.name.toUpperCase()}
            </div>
            <div className="font-mono mt-0.5 italic truncate" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>
              "{agent.tagline}"
            </div>
          </div>

          {/* Frequency + recipients badges (enterprise) or memory badge (signal) */}
          {agent.outputFrequency ? (
            <div className="flex items-center gap-1.5 flex-shrink-0 hidden sm:flex flex-wrap justify-end" style={{ maxWidth: 220 }}>
              <span className="font-mono px-2 py-0.5 rounded"
                style={{ background: `${agent.color}14`, border: `1px solid ${agent.color}35`, color: agent.color, fontSize: "12", whiteSpace: "nowrap" }}>
                ↻ {agent.outputFrequency.toUpperCase()}
              </span>
              {agent.outputRecipients?.map(r => (
                <span key={r} className="font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted-foreground)", fontSize: "11", whiteSpace: "nowrap" }}>
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <span className="font-mono px-2 py-0.5 rounded flex-shrink-0 hidden sm:block"
              style={{ background: `${agent.color}10`, border: `1px solid ${agent.color}28`, color: agent.color, fontSize: "12" }}>
              {agent.memoryType.split(" — ")[0].toUpperCase()}
            </span>
          )}

          {/* Chevron */}
          <span style={{
            color: open ? agent.color : "#3d4551",
            fontSize: "16",
            transition: "transform 0.25s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}>▾</span>
        </div>
      </button>

      {/* ── Expanded: stacked sections ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${agent.color}18` }}>
          {SECTIONS.map((sec, si) => {
            const isOpen = openSections.has(sec.id)
            const count = sectionCount(sec)
            return (
              <div key={sec.id} style={{ borderTop: si > 0 ? "1px solid rgba(0,94,162,0.07)" : "none" }}>

                {/* Section header */}
                <div className="flex items-center" style={{ background: isOpen ? "rgba(0,94,162,0.04)" : "transparent" }}>
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="flex items-center gap-2 flex-1 px-5 py-2.5 transition-colors text-left"
                  >
                    <span style={{ color: isOpen ? agent.color : "#3d4551", fontSize: "14" }}>{sec.icon}</span>
                    <span className="font-mono font-semibold tracking-widest flex-1"
                      style={{ color: isOpen ? agent.color : "#757575", fontSize: "13", letterSpacing: "0.1em" }}>
                      {sec.label.toUpperCase()}
                    </span>
                    {count !== null && (
                      <span className="font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${agent.color}10`, color: agent.color, fontSize: "12" }}>
                        {count}
                      </span>
                    )}
                    <span style={{ color: isOpen ? agent.color : "#3d4551", fontSize: "13", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </button>
                </div>

                {/* Section body */}
                {isOpen && (
                  <div className="px-5 pb-4" style={{ borderTop: "1px solid rgba(0,94,162,0.06)" }}>

                    {sec.id === "objective" && (
                      <div className="pt-3">
                        <p className="font-mono leading-relaxed" style={{ color: "#1b1b1b", fontSize: "16" }}>{agent.objective}</p>
                      </div>
                    )}

                    {sec.id === "inputs" && (
                      <div className="flex flex-col gap-2 pt-3">
                        {agent.inputs.map((inp, i) => (
                          <div key={i} className="rounded p-3" style={{ background: "rgba(0,94,162,0.03)", border: "1px solid rgba(0,94,162,0.09)" }}>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <span className="font-mono font-semibold" style={{ color: agent.color, fontSize: "14" }}>{inp.label}</span>
                              {inp.url ? (
                                <a href={inp.url} target="_blank" rel="noopener noreferrer"
                                  className="font-mono px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                                  style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2", fontSize: "12", textDecoration: "none" }}>
                                  {inp.source} ↗
                                </a>
                              ) : (
                                <span className="font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.15)", color: "#3d4551", fontSize: "12" }}>
                                  {inp.source}
                                </span>
                              )}
                            </div>
                            <p className="font-mono" style={{ color: "#757575", lineHeight: 1.6, fontSize: "16" }}>{inp.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {sec.id === "tools" && (
                      <div className="flex flex-col gap-2 pt-3">
                        {agent.tools.map((tool, i) => (
                          <div key={i} className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.14)" }}>
                            <div className="px-3 py-2 flex items-start gap-2 flex-wrap"
                              style={{ background: "rgba(0,94,162,0.05)", borderBottom: "1px solid rgba(0,94,162,0.09)" }}>
                              <span className="font-mono font-bold" style={{ color: "#005ea2", fontSize: "14" }}>{tool.name}</span>
                              <span className="font-mono" style={{ color: "#3d4551", fontSize: "13", wordBreak: "break-all" }}>
                                {tool.signature.replace(tool.name, "")}
                              </span>
                            </div>
                            <div className="px-3 py-2.5" style={{ background: "rgba(22,46,81,0.5)" }}>
                              <p className="font-mono" style={{ color: "#00a91c", lineHeight: 1.6, fontSize: "16" }}>{tool.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sec.id === "tasks" && (
                      <div className="flex flex-col gap-3 pt-3">
                        {agent.tasks.map((task, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono font-bold mt-0.5"
                              style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}44`, color: agent.color, fontSize: "13" }}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-mono font-semibold mb-0.5" style={{ color: "#1b1b1b", fontSize: "15" }}>{task.label}</div>
                              <p className="font-mono" style={{ color: "#757575", lineHeight: 1.6, fontSize: "16" }}>{task.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sec.id === "outputs" && (
                      <div className="rounded overflow-hidden mt-3" style={{ border: "1px solid rgba(0,94,162,0.14)" }}>
                        <div className="grid px-4 py-2 font-mono"
                          style={{ gridTemplateColumns: "160px 180px 1fr", background: "rgba(0,94,162,0.06)", borderBottom: "1px solid rgba(0,94,162,0.09)", color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.1em" }}>
                          <span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
                        </div>
                        {agent.outputs.map((out, i) => {
                          const isDrillable = out.field === "revocations_analysis"
                          const isGap       = out.field === "detection_gap_report"
                          return (
                            <div key={i} className="grid px-4 py-3 font-mono"
                              style={{ gridTemplateColumns: "160px 180px 1fr", borderBottom: i < agent.outputs.length - 1 ? "1px solid rgba(0,94,162,0.06)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.02)" : "transparent" }}>
                              <span style={{ color: agent.color, fontSize: "14" }}>{out.field}</span>
                              {isDrillable ? (
                                <button onClick={() => onOpenDb(agent.id, "billing")}
                                  className="font-mono px-1.5 py-0.5 rounded text-left transition-all self-start"
                                  style={{ background: "rgba(107,70,193,0.15)", border: "1px solid rgba(107,70,193,0.35)", color: "#6b46c1", fontSize: "13", textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}>
                                  {out.type} ↗
                                </button>
                              ) : isGap ? (
                                <button onClick={() => onOpenDb(agent.id, "gap")}
                                  className="font-mono px-1.5 py-0.5 rounded text-left transition-all self-start"
                                  style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2", fontSize: "13", textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}>
                                  {out.type} ↗
                                </button>
                              ) : (
                                <span style={{ color: "#6b46c1", fontSize: "13" }}>{out.type}</span>
                              )}
                              <span style={{ color: "#757575", lineHeight: 1.6, fontSize: "16" }}>{out.description}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── DetectionGapView ──────────────────────────────────────────────────────────

type GapSeverity = "CRITICAL" | "HIGH" | "MODERATE"
type GapCategory = "Persistent Billing" | "Dollar Concentration" | "Pre-Revocation Velocity" | "Zero-Dollar Clustering" | "Identity Signal" | "Field Validation"

interface GapInsight {
  id: string
  severity: GapSeverity
  category: GapCategory
  title: string
  npi?: string
  providerName?: string
  revocationCodes?: string[]
  evidence: string[]
  implication: string
  recommendation: string
  signals: string[]
  validationNotes?: string[]
  featured?: boolean
}

const GAP_INSIGHTS: GapInsight[] = [
  {
    id: "g1",
    featured: true,
    severity: "CRITICAL",
    category: "Persistent Billing",
    title: "Billing activity persists years after revocation event",
    npi: "1003888298",
    providerName: "George Vito",
    revocationCodes: ["424.535(a)(4) — False or Misleading Information", "424.535(a)(9) — Failure to Report", "424.535(a)(3) — Felonies"],
    evidence: [
      "37 claim lines across 2022–2023 despite revocation dating to 2014",
      "$1,133,586 in allowed dollars recorded in 2022",
      "$118,227 in allowed dollars recorded in 2023",
      "Approximately $1.25M total — roughly $33,800 per claim line on average",
    ],
    signals: [
      "Allowed or billed dollars per claim line far exceed peer norms",
      "Dollars per beneficiary likely extreme if beneficiary count is low",
      "Peer-percentile comparison would place this at 99th+ percentile",
      "Concentration in a small number of high-value claims or codes",
    ],
    implication: "A provider carrying three revocation bases — including felonies and deliberate misrepresentation — generated over $1.25M in claims years after adverse enrollment action. This represents either a control failure in the enrollment-to-claims linkage, an identity/NPI mapping issue, or active billing through a successor entity.",
    recommendation: "Cross-reference NPI 1003888298 against PECOS enrollment status at time of each 2022–2023 claim. Verify whether revocation applied to the specific practice location or program that generated these claims. Escalate to ZPIC/RAC if billing confirmed post-revocation.",
    validationNotes: [
      "Dollar amounts may reflect submitted charges rather than Medicare-paid amounts — field definition requires validation before enforcement referral",
      "If this is the same provider on the revocation list since 2014, persistent billing across 6+ years warrants immediate enrollment investigation",
      "NPI reuse or inaccurate identifier mapping could explain the apparent gap — verify identity match between revocation record and claims NPI",
    ],
  },
  {
    id: "g2",
    severity: "CRITICAL",
    category: "Pre-Revocation Velocity",
    title: "Extreme billing concentration in final active year before apparent wind-down",
    npi: "1467811331",
    evidence: [
      "1 claim line in 2025 ($23 paid)",
      "34 claim lines in 2024 ($1,241,092 paid) — 3 unique procedure codes",
      "$36,503 average per claim line in 2024",
      "Sharp collapse to minimal activity in 2025",
    ],
    signals: [
      "Rapid ramp-up followed by abrupt cessation matches pre-revocation velocity pattern",
      "3 procedure codes across 34 lines suggests narrow code concentration",
      "$/claim line ratio of $36,503 is extreme for DMEPOS recurring supply categories",
    ],
    implication: "The billing profile — peak volume in 2024 followed by near-zero 2025 activity — is consistent with a supplier extracting maximum reimbursement before an expected enforcement action, enrollment termination, or voluntary wind-down. This pattern was detectable from velocity and $/line metrics alone.",
    recommendation: "Flag for retrospective billing audit covering 2023–2024. Review procedure code mix to determine whether billing concentration matches allowed clinical indications. Check PECOS enrollment status and whether this NPI is linked to a successor entity.",
  },
  {
    id: "g3",
    severity: "CRITICAL",
    category: "Dollar Concentration",
    title: "Sustained high-volume high-dollar billing across multiple years",
    npi: "1992071476",
    evidence: [
      "269 claim lines in 2018 ($388,088) — 3 procedure codes",
      "190 claim lines in 2019 ($141,116)",
      "243 claim lines in 2020 ($186,886)",
      "Consistent 3-procedure-code concentration across all years",
      "Total 2017–2021 activity: ~$810K across 780+ claim lines",
    ],
    signals: [
      "Narrow procedure code concentration (3 codes) maintained across 5 years at high volume",
      "Volume and dollar pattern consistent with recurring DMEPOS supply billing",
      "Year-over-year persistence without meaningful code diversification",
    ],
    implication: "Multi-year high-concentration billing in 3 procedure codes is a documented pattern in DMEPOS fraud typologies, particularly for recurring supplies. The consistency of the code mix across years suggests systematic rather than medically driven billing. Pre-revocation signals were present well before any enforcement action.",
    recommendation: "Apply peer-deviation analysis against NPI specialty and jurisdiction cohort. Compute beneficiary-to-claim-line ratio to test for duplicate or phantom billing. Route to Utilization and Billing Patterns agent for longitudinal scoring.",
  },
  {
    id: "g4",
    severity: "HIGH",
    category: "Zero-Dollar Clustering",
    title: "Systematic zero-paid activity across large provider cohort",
    evidence: [
      "67 of 224 total records (29.9%) show $0 in paid amounts",
      "Zero-dollar records span all years 2016–2025 and multiple procedure codes",
      "Some NPIs show years of $0 activity interspersed with high-dollar years",
      "NPI 1528203338 shows $0 in some years alongside consistent 72–104 claim lines annually",
    ],
    signals: [
      "Zero-dollar paid may indicate: non-covered services billed, duplicate claim suppression, denied claims not appealed, or test/probe billing",
      "High claim-line counts with $0 paid warrant investigation for billing system probe patterns",
      "Interspersed $0 and high-dollar years could reflect selective service billing or strategic code rotation",
    ],
    implication: "A 30% zero-dollar rate in a revoked-supplier cohort is anomalously high. Probe billing — submitting claims to test adjudication logic without expecting payment — is a documented precursor to large-scale fraud. Zero-dollar records should not be filtered from analysis as they may contain the earliest detectable signals.",
    recommendation: "Retain zero-dollar records in model training cohort with distinct label. Analyze claim edit codes on denied zero-dollar claims to surface systematic adjudication bypass attempts. Flag high-line-count $0 suppliers for manual review.",
  },
  {
    id: "g5",
    severity: "HIGH",
    category: "Identity Signal",
    title: "NPI persistence across long time windows inconsistent with single-entity lifecycle",
    npi: "1528203338",
    evidence: [
      "Active billing every year from 2016 through 2024 — 9 consecutive years",
      "72–104 claim lines per year, 5–7 procedure codes consistently",
      "Paid amounts: $8K (2016) → $7.5K (2017–2019 range) → $9.8K (2022)",
      "Unusually stable billing pattern over 9 years suggests institutional or recurring-supply account",
    ],
    signals: [
      "9-year continuity with stable code mix is atypical for individual DMEPOS suppliers",
      "Could indicate a large institutional supplier, a shared NPI for a DME network, or persistent identity reuse",
      "Stability itself is a signal — most legitimate small suppliers show year-to-year variation",
    ],
    implication: "The unusually stable multi-year profile warrants entity resolution to determine whether this NPI represents a single enrolled supplier or has been shared, reassigned, or reused across multiple entities. If this NPI appears on the revocation list, the continued billing raises serious questions about enrollment control effectiveness.",
    recommendation: "Run entity resolution via PECOS ownership history. Verify authorized officials and practice locations across all 9 years. Check for reincarnation matches against terminated supplier database.",
  },
  {
    id: "g6",
    severity: "MODERATE",
    category: "Field Validation",
    title: "Dollar field definition requires validation before enforcement use",
    evidence: [
      "NPI 1003888298: $1.13M across 28 claim lines in 2022 = $40,485/line",
      "NPI 1447996996: $1.06M across 31 claim lines in 2024 = $34,329/line",
      "NPI 1467811331: $1.24M across 34 claim lines in 2024 = $36,503/line",
      "These per-line figures exceed typical Medicare allowed amounts for DMEPOS categories",
    ],
    signals: [
      "Sum of paid amounts field (dtl_paidamount) may reflect submitted charges, not Medicare-paid amounts",
      "Aggregation at claim-line level may obscure unit counts and modifier effects",
      "Unusually high $/line values are a signal — but must be validated against fee schedule before referral",
    ],
    implication: "If dtl_paidamount reflects submitted rather than allowed/paid amounts, dollar figures may significantly overstate Medicare exposure. Enforcement referrals based on overstated dollar values undermine case credibility. Field definition must be validated against CMS payment records before use in case packages.",
    recommendation: "Cross-reference dtl_paidamount against Medicare remittance data (ERA/835) for a sample of high-value claim lines. Confirm field represents paid amounts, not billed charges. Update data dictionary and flag enforcement cases for revalidation if discrepancy confirmed.",
  },
]

function DetectionGapView({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>("g1")
  const active = GAP_INSIGHTS.find(g => g.id === selected) ?? GAP_INSIGHTS[0]

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono transition-all"
          style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#757575", fontSize: "14" }}>
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold tracking-widest" style={{ color: "#005ea2", fontSize: "14" }}>SUPERVISED LEARNING</span>
          <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "14" }}>·</span>
          <span className="font-mono tracking-widest" style={{ color: "#162e51", fontSize: "14" }}>DETECTION GAP REPORT</span>
        </div>
        <span className="font-mono ml-auto" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>
          RETROSPECTIVE ANALYSIS · 2016–2025
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Gaps Identified",   value: GAP_INSIGHTS.length },
          { label: "Critical / High",   value: `${GAP_INSIGHTS.filter(g => g.severity === "CRITICAL").length} / ${GAP_INSIGHTS.filter(g => g.severity === "HIGH").length}` },
          { label: "Providers Flagged", value: GAP_INSIGHTS.filter(g => g.npi).length },
        ].map(k => (
          <div key={k.label} className="rounded p-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="font-mono mb-1" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.1em" }}>{k.label.toUpperCase()}</div>
            <div className="font-display font-bold" style={{ color: "#162e51", fontSize: "22px" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-3" style={{ minHeight: 480 }}>
        {/* Left: gap list */}
        <div className="flex flex-col gap-1" style={{ width: 260, flexShrink: 0 }}>
          {GAP_INSIGHTS.map(g => (
            <button key={g.id} onClick={() => setSelected(g.id)}
              className="text-left rounded px-3 py-2.5 transition-all"
              style={{
                background: selected === g.id ? "rgba(0,94,162,0.07)" : "transparent",
                border: selected === g.id ? "1px solid rgba(0,94,162,0.22)" : "1px solid transparent",
              }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "9px", letterSpacing: "0.08em" }}>{g.severity}</span>
                {g.featured && <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>· FEATURED</span>}
              </div>
              <div className="font-mono font-semibold" style={{ color: selected === g.id ? "#005ea2" : "#1b1b1b", fontSize: "13", lineHeight: 1.4 }}>{g.title}</div>
              {g.npi && (
                <div className="font-mono mt-1" style={{ color: "var(--muted-foreground)", fontSize: "12" }}>
                  NPI {g.npi}{g.providerName ? ` · ${g.providerName}` : ""}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.12)", background: "var(--card)" }}>
          {/* Header */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(0,94,162,0.08)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.08em" }}>{active.severity}</span>
              <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "12" }}>· {active.category}</span>
            </div>
            <h2 className="font-display font-bold tracking-wide" style={{ color: "#162e51", fontSize: "16" }}>{active.title}</h2>
            {active.npi && (
              <div className="font-mono mt-1.5 flex items-center gap-2 flex-wrap">
                <span style={{ color: "#005ea2", fontSize: "14", fontFamily: "JetBrains Mono, monospace" }}>NPI {active.npi}</span>
                {active.providerName && <span style={{ color: "#1b1b1b", fontSize: "14" }}>— {active.providerName}</span>}
              </div>
            )}
            {active.revocationCodes && (
              <div className="flex flex-col gap-0.5 mt-2">
                {active.revocationCodes.map(c => (
                  <span key={c} className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>{c}</span>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: 520 }}>
            {/* Evidence */}
            <div>
              <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>EVIDENCE FROM CLAIMS DATA</div>
              <div className="flex flex-col gap-1.5">
                {active.evidence.map((e, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span style={{ color: "#3d4551", fontSize: "12", flexShrink: 0, marginTop: 3 }}>—</span>
                    <span className="font-mono" style={{ color: "#1b1b1b", fontSize: "14", lineHeight: 1.6 }}>{e}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signals */}
            <div>
              <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>POTENTIALLY RELEVANT SIGNALS</div>
              <div className="flex flex-col gap-1.5">
                {active.signals.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span style={{ color: "#3d4551", fontSize: "12", flexShrink: 0, marginTop: 3 }}>—</span>
                    <span className="font-mono" style={{ color: "#757575", fontSize: "14", lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Implication — the key insight, gets the only background box */}
            <div className="rounded p-4" style={{ background: "rgba(0,94,162,0.05)", border: "1px solid rgba(0,94,162,0.15)" }}>
              <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "#005ea2", fontSize: "12", letterSpacing: "0.12em" }}>KEY IMPLICATION</div>
              <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "14", lineHeight: 1.75 }}>{active.implication}</p>
            </div>

            {/* Recommendation */}
            <div>
              <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>RECOMMENDED ACTION</div>
              <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "14", lineHeight: 1.75 }}>{active.recommendation}</p>
            </div>

            {/* Validation notes */}
            {active.validationNotes && (
              <div>
                <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>VALIDATION NOTES</div>
                <div className="flex flex-col gap-1.5">
                  {active.validationNotes.map((n, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span style={{ color: "#3d4551", fontSize: "12", flexShrink: 0, marginTop: 3 }}>—</span>
                      <span className="font-mono" style={{ color: "#757575", fontSize: "14", lineHeight: 1.65 }}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Billing data (revocations_analysis output) ───────────────────────────────

const BILLING_DATA = [
  { year: 2025, npi: "1023101060", claimLines: 4,   procedures: 1, paidAmount: 89        },
  { year: 2025, npi: "1376573113", claimLines: 2,   procedures: 1, paidAmount: 36        },
  { year: 2025, npi: "1467811331", claimLines: 1,   procedures: 1, paidAmount: 23        },
  { year: 2025, npi: "1851056204", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1467811331", claimLines: 34,  procedures: 3, paidAmount: 1241092   },
  { year: 2024, npi: "1447996996", claimLines: 31,  procedures: 1, paidAmount: 1064210   },
  { year: 2024, npi: "1366750325", claimLines: 3,   procedures: 1, paidAmount: 36823     },
  { year: 2024, npi: "1104818418", claimLines: 1,   procedures: 1, paidAmount: 10255     },
  { year: 2024, npi: "1578008827", claimLines: 1,   procedures: 1, paidAmount: 4704      },
  { year: 2024, npi: "1528203338", claimLines: 10,  procedures: 4, paidAmount: 591       },
  { year: 2024, npi: "1376573113", claimLines: 2,   procedures: 1, paidAmount: 70        },
  { year: 2024, npi: "1306846654", claimLines: 6,   procedures: 3, paidAmount: 54        },
  { year: 2024, npi: "1669993218", claimLines: 1,   procedures: 1, paidAmount: 37        },
  { year: 2024, npi: "1023101060", claimLines: 1,   procedures: 1, paidAmount: 26        },
  { year: 2024, npi: "1710295639", claimLines: 1,   procedures: 1, paidAmount: 18        },
  { year: 2024, npi: "1285734418", claimLines: 1,   procedures: 1, paidAmount: 8         },
  { year: 2024, npi: "1952471807", claimLines: 5,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1225158470", claimLines: 3,   procedures: 3, paidAmount: 0         },
  { year: 2024, npi: "1790215192", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1013557727", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1235674912", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1619175031", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2024, npi: "1629174446", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2023, npi: "1003888298", claimLines: 9,   procedures: 2, paidAmount: 118227    },
  { year: 2023, npi: "1851915623", claimLines: 9,   procedures: 1, paidAmount: 77459     },
  { year: 2023, npi: "1578008827", claimLines: 4,   procedures: 1, paidAmount: 18816     },
  { year: 2023, npi: "1730363748", claimLines: 10,  procedures: 1, paidAmount: 11562     },
  { year: 2023, npi: "1528203338", claimLines: 80,  procedures: 6, paidAmount: 6386      },
  { year: 2023, npi: "1366750325", claimLines: 1,   procedures: 1, paidAmount: 2459      },
  { year: 2023, npi: "1689106767", claimLines: 5,   procedures: 3, paidAmount: 116       },
  { year: 2023, npi: "1306846654", claimLines: 23,  procedures: 4, paidAmount: 113       },
  { year: 2023, npi: "1376506691", claimLines: 5,   procedures: 3, paidAmount: 46        },
  { year: 2023, npi: "1003164211", claimLines: 2,   procedures: 3, paidAmount: 21        },
  { year: 2023, npi: "1326211509", claimLines: 1,   procedures: 1, paidAmount: 18        },
  { year: 2023, npi: "1164432746", claimLines: 1,   procedures: 1, paidAmount: 17        },
  { year: 2023, npi: "1700821618", claimLines: 1,   procedures: 1, paidAmount: 13        },
  { year: 2023, npi: "1780016774", claimLines: 1,   procedures: 1, paidAmount: 11        },
  { year: 2023, npi: "1285734418", claimLines: 2,   procedures: 1, paidAmount: 8         },
  { year: 2023, npi: "1952471807", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2023, npi: "1851056204", claimLines: 3,   procedures: 4, paidAmount: 0         },
  { year: 2023, npi: "1689343600", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2023, npi: "1235674912", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2022, npi: "1003888298", claimLines: 28,  procedures: 1, paidAmount: 1133586   },
  { year: 2022, npi: "1104440981", claimLines: 13,  procedures: 7, paidAmount: 211440    },
  { year: 2022, npi: "1407812993", claimLines: 6,   procedures: 2, paidAmount: 30182     },
  { year: 2022, npi: "1720541402", claimLines: 9,   procedures: 3, paidAmount: 20026     },
  { year: 2022, npi: "1851915623", claimLines: 1,   procedures: 1, paidAmount: 11917     },
  { year: 2022, npi: "1528203338", claimLines: 104, procedures: 5, paidAmount: 9784      },
  { year: 2022, npi: "1619175031", claimLines: 2,   procedures: 1, paidAmount: 1975      },
  { year: 2022, npi: "1689106767", claimLines: 3,   procedures: 2, paidAmount: 184       },
  { year: 2022, npi: "1306846654", claimLines: 15,  procedures: 5, paidAmount: 118       },
  { year: 2022, npi: "1548305923", claimLines: 1,   procedures: 1, paidAmount: 36        },
  { year: 2022, npi: "1285734418", claimLines: 2,   procedures: 1, paidAmount: 15        },
  { year: 2022, npi: "1710295639", claimLines: 1,   procedures: 1, paidAmount: 11        },
  { year: 2022, npi: "1225158470", claimLines: 3,   procedures: 4, paidAmount: 0         },
  { year: 2022, npi: "1992071476", claimLines: 7,   procedures: 1, paidAmount: 0         },
  { year: 2022, npi: "1578008827", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2022, npi: "1265665681", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2022, npi: "1023101060", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1265665681", claimLines: 32,  procedures: 3, paidAmount: 98908     },
  { year: 2021, npi: "1205345485", claimLines: 12,  procedures: 3, paidAmount: 46891     },
  { year: 2021, npi: "1982264339", claimLines: 8,   procedures: 2, paidAmount: 19776     },
  { year: 2021, npi: "1336400704", claimLines: 3,   procedures: 1, paidAmount: 13500     },
  { year: 2021, npi: "1235445073", claimLines: 3,   procedures: 1, paidAmount: 9888      },
  { year: 2021, npi: "1528203338", claimLines: 93,  procedures: 6, paidAmount: 9077      },
  { year: 2021, npi: "1154732907", claimLines: 4,   procedures: 1, paidAmount: 8240      },
  { year: 2021, npi: "1649471467", claimLines: 1,   procedures: 1, paidAmount: 4784      },
  { year: 2021, npi: "1578008827", claimLines: 3,   procedures: 2, paidAmount: 4245      },
  { year: 2021, npi: "1992071476", claimLines: 12,  procedures: 4, paidAmount: 4123      },
  { year: 2021, npi: "1720541402", claimLines: 6,   procedures: 2, paidAmount: 3943      },
  { year: 2021, npi: "1013394766", claimLines: 1,   procedures: 1, paidAmount: 3053      },
  { year: 2021, npi: "1689106767", claimLines: 7,   procedures: 1, paidAmount: 255       },
  { year: 2021, npi: "1669993218", claimLines: 24,  procedures: 5, paidAmount: 184       },
  { year: 2021, npi: "1306846654", claimLines: 17,  procedures: 4, paidAmount: 176       },
  { year: 2021, npi: "1518943364", claimLines: 2,   procedures: 1, paidAmount: 52        },
  { year: 2021, npi: "1285734418", claimLines: 4,   procedures: 1, paidAmount: 14        },
  { year: 2021, npi: "1225158470", claimLines: 2,   procedures: 2, paidAmount: 12        },
  { year: 2021, npi: "1164432746", claimLines: 3,   procedures: 3, paidAmount: 12        },
  { year: 2021, npi: "1326211509", claimLines: 1,   procedures: 1, paidAmount: 7         },
  { year: 2021, npi: "1629174446", claimLines: 3,   procedures: 2, paidAmount: 0         },
  { year: 2021, npi: "1326074055", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1003888298", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1114386174", claimLines: 9,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1225260334", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1558706549", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1588992853", claimLines: 6,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1235674912", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1710036496", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1790881746", claimLines: 3,   procedures: 2, paidAmount: 0         },
  { year: 2021, npi: "1568743375", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1003164211", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2021, npi: "1033475330", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1992071476", claimLines: 243, procedures: 3, paidAmount: 186886    },
  { year: 2020, npi: "1730363748", claimLines: 4,   procedures: 1, paidAmount: 12211     },
  { year: 2020, npi: "1528203338", claimLines: 92,  procedures: 6, paidAmount: 7906      },
  { year: 2020, npi: "1982264339", claimLines: 2,   procedures: 1, paidAmount: 6592      },
  { year: 2020, npi: "1720541402", claimLines: 2,   procedures: 1, paidAmount: 5040      },
  { year: 2020, npi: "1578008827", claimLines: 1,   procedures: 1, paidAmount: 4236      },
  { year: 2020, npi: "1518943364", claimLines: 5,   procedures: 2, paidAmount: 3101      },
  { year: 2020, npi: "1205345485", claimLines: 1,   procedures: 1, paidAmount: 1271      },
  { year: 2020, npi: "1689106767", claimLines: 5,   procedures: 2, paidAmount: 232       },
  { year: 2020, npi: "1811088578", claimLines: 1,   procedures: 1, paidAmount: 153       },
  { year: 2020, npi: "1306846654", claimLines: 12,  procedures: 4, paidAmount: 99        },
  { year: 2020, npi: "1093742389", claimLines: 1,   procedures: 1, paidAmount: 67        },
  { year: 2020, npi: "1164432746", claimLines: 3,   procedures: 1, paidAmount: 46        },
  { year: 2020, npi: "1457752610", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1558706549", claimLines: 8,   procedures: 2, paidAmount: 0         },
  { year: 2020, npi: "1346507514", claimLines: 2,   procedures: 4, paidAmount: 0         },
  { year: 2020, npi: "1669993218", claimLines: 18,  procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1548722127", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1003888298", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1518176916", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1508879941", claimLines: 4,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1033475330", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1790881746", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1235674912", claimLines: 6,   procedures: 2, paidAmount: 0         },
  { year: 2020, npi: "1629174446", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1235445073", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1720090525", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1659392736", claimLines: 4,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1609224161", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1366750325", claimLines: 1,   procedures: 2, paidAmount: 0         },
  { year: 2020, npi: "1023101060", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1508297854", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2020, npi: "1073707048", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1992071476", claimLines: 190, procedures: 3, paidAmount: 141116    },
  { year: 2019, npi: "1528578499", claimLines: 7,   procedures: 1, paidAmount: 45798     },
  { year: 2019, npi: "1578008827", claimLines: 4,   procedures: 2, paidAmount: 12344     },
  { year: 2019, npi: "1528203338", claimLines: 104, procedures: 6, paidAmount: 7953      },
  { year: 2019, npi: "1619175031", claimLines: 2,   procedures: 1, paidAmount: 1255      },
  { year: 2019, npi: "1306846654", claimLines: 27,  procedures: 6, paidAmount: 360       },
  { year: 2019, npi: "1689106767", claimLines: 8,   procedures: 3, paidAmount: 325       },
  { year: 2019, npi: "1093742389", claimLines: 5,   procedures: 2, paidAmount: 133       },
  { year: 2019, npi: "1518943364", claimLines: 4,   procedures: 2, paidAmount: 100       },
  { year: 2019, npi: "1285734418", claimLines: 3,   procedures: 1, paidAmount: 21        },
  { year: 2019, npi: "1780016774", claimLines: 2,   procedures: 2, paidAmount: 12        },
  { year: 2019, npi: "1225158470", claimLines: 2,   procedures: 3, paidAmount: 10        },
  { year: 2019, npi: "1164432746", claimLines: 1,   procedures: 1, paidAmount: 10        },
  { year: 2019, npi: "1376506691", claimLines: 1,   procedures: 1, paidAmount: 3         },
  { year: 2019, npi: "1003164211", claimLines: 1,   procedures: 1, paidAmount: 2         },
  { year: 2019, npi: "1558706549", claimLines: 1,   procedures: 1, paidAmount: 2         },
  { year: 2019, npi: "1326074055", claimLines: 3,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1669993218", claimLines: 9,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1942227632", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1629174446", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1649471467", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1003888298", claimLines: 5,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1790839140", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2019, npi: "1194778373", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1992071476", claimLines: 269, procedures: 3, paidAmount: 388088    },
  { year: 2018, npi: "1528578499", claimLines: 2,   procedures: 1, paidAmount: 12791     },
  { year: 2018, npi: "1578008827", claimLines: 2,   procedures: 1, paidAmount: 9139      },
  { year: 2018, npi: "1528203338", claimLines: 102, procedures: 6, paidAmount: 7460      },
  { year: 2018, npi: "1093069601", claimLines: 1,   procedures: 1, paidAmount: 1568      },
  { year: 2018, npi: "1306846654", claimLines: 18,  procedures: 5, paidAmount: 235       },
  { year: 2018, npi: "1558897439", claimLines: 2,   procedures: 1, paidAmount: 130       },
  { year: 2018, npi: "1689106767", claimLines: 2,   procedures: 2, paidAmount: 101       },
  { year: 2018, npi: "1093742389", claimLines: 3,   procedures: 1, paidAmount: 97        },
  { year: 2018, npi: "1205345485", claimLines: 1,   procedures: 1, paidAmount: 32        },
  { year: 2018, npi: "1265665681", claimLines: 2,   procedures: 1, paidAmount: 31        },
  { year: 2018, npi: "1326211509", claimLines: 1,   procedures: 1, paidAmount: 15        },
  { year: 2018, npi: "1225158470", claimLines: 2,   procedures: 3, paidAmount: 15        },
  { year: 2018, npi: "1376506691", claimLines: 4,   procedures: 3, paidAmount: 13        },
  { year: 2018, npi: "1710295639", claimLines: 1,   procedures: 1, paidAmount: 7         },
  { year: 2018, npi: "1558706549", claimLines: 5,   procedures: 3, paidAmount: 2         },
  { year: 2018, npi: "1518943364", claimLines: 1,   procedures: 1, paidAmount: 1         },
  { year: 2018, npi: "1164432746", claimLines: 3,   procedures: 2, paidAmount: 0         },
  { year: 2018, npi: "1235445073", claimLines: 10,  procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1174818314", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1790881746", claimLines: 4,   procedures: 3, paidAmount: 0         },
  { year: 2018, npi: "1508297854", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1942227632", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1669993218", claimLines: 3,   procedures: 1, paidAmount: 0         },
  { year: 2018, npi: "1629174446", claimLines: 2,   procedures: 3, paidAmount: 0         },
  { year: 2017, npi: "1992071476", claimLines: 75,  procedures: 1, paidAmount: 76620     },
  { year: 2017, npi: "1528203338", claimLines: 103, procedures: 7, paidAmount: 7354      },
  { year: 2017, npi: "1457752610", claimLines: 1,   procedures: 1, paidAmount: 5841      },
  { year: 2017, npi: "1689106767", claimLines: 10,  procedures: 5, paidAmount: 382       },
  { year: 2017, npi: "1093742389", claimLines: 5,   procedures: 1, paidAmount: 262       },
  { year: 2017, npi: "1306846654", claimLines: 17,  procedures: 10, paidAmount: 233      },
  { year: 2017, npi: "1104958933", claimLines: 3,   procedures: 1, paidAmount: 97        },
  { year: 2017, npi: "1619175031", claimLines: 1,   procedures: 1, paidAmount: 64        },
  { year: 2017, npi: "1518943364", claimLines: 5,   procedures: 2, paidAmount: 30        },
  { year: 2017, npi: "1285734418", claimLines: 5,   procedures: 2, paidAmount: 27        },
  { year: 2017, npi: "1225158470", claimLines: 2,   procedures: 6, paidAmount: 20        },
  { year: 2017, npi: "1265665681", claimLines: 1,   procedures: 1, paidAmount: 15        },
  { year: 2017, npi: "1558706549", claimLines: 6,   procedures: 4, paidAmount: 7         },
  { year: 2017, npi: "1447244256", claimLines: 8,   procedures: 2, paidAmount: 0         },
  { year: 2017, npi: "1174818314", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1629174446", claimLines: 1,   procedures: 3, paidAmount: 0         },
  { year: 2017, npi: "1003164211", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1790881746", claimLines: 4,   procedures: 2, paidAmount: 0         },
  { year: 2017, npi: "1780016774", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1316031933", claimLines: 3,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1710295639", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1942410907", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1730270224", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1942227632", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1326230830", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1750435905", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2017, npi: "1508297854", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1528203338", claimLines: 72,  procedures: 6, paidAmount: 8051      },
  { year: 2016, npi: "1538417001", claimLines: 1,   procedures: 1, paidAmount: 6282      },
  { year: 2016, npi: "1730363748", claimLines: 2,   procedures: 1, paidAmount: 2153      },
  { year: 2016, npi: "1093742389", claimLines: 10,  procedures: 1, paidAmount: 638       },
  { year: 2016, npi: "1306846654", claimLines: 31,  procedures: 9, paidAmount: 629       },
  { year: 2016, npi: "1992071476", claimLines: 2,   procedures: 2, paidAmount: 92        },
  { year: 2016, npi: "1518943364", claimLines: 13,  procedures: 3, paidAmount: 41        },
  { year: 2016, npi: "1225260334", claimLines: 1,   procedures: 1, paidAmount: 19        },
  { year: 2016, npi: "1326211509", claimLines: 1,   procedures: 1, paidAmount: 15        },
  { year: 2016, npi: "1265665681", claimLines: 1,   procedures: 1, paidAmount: 11        },
  { year: 2016, npi: "1225158470", claimLines: 7,   procedures: 5, paidAmount: 8         },
  { year: 2016, npi: "1376573113", claimLines: 1,   procedures: 1, paidAmount: 8         },
  { year: 2016, npi: "1194778373", claimLines: 2,   procedures: 2, paidAmount: 0         },
  { year: 2016, npi: "1558706549", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1790881746", claimLines: 3,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1841694577", claimLines: 2,   procedures: 4, paidAmount: 0         },
  { year: 2016, npi: "1538343439", claimLines: 11,  procedures: 3, paidAmount: 0         },
  { year: 2016, npi: "1447244256", claimLines: 10,  procedures: 4, paidAmount: 0         },
  { year: 2016, npi: "1174818314", claimLines: 4,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1750435905", claimLines: 2,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1780016774", claimLines: 2,   procedures: 2, paidAmount: 0         },
  { year: 2016, npi: "1154732907", claimLines: 1,   procedures: 1, paidAmount: 0         },
  { year: 2016, npi: "1235445073", claimLines: 1,   procedures: 1, paidAmount: 0         },
]

type SortKey = "year" | "npi" | "claimLines" | "procedures" | "paidAmount"

function BillingDataView({ onClose }: { onClose: () => void }) {
  const [yearFilter, setYearFilter] = useState<number | "all">("all")
  const [sortKey, setSortKey]       = useState<SortKey>("paidAmount")
  const [sortDir, setSortDir]       = useState<"desc" | "asc">("desc")

  const years = [2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const filtered = BILLING_DATA
    .filter(r => yearFilter === "all" || r.year === yearFilter)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv)
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })

  const totalPaid   = filtered.reduce((s, r) => s + r.paidAmount, 0)
  const totalClaims = filtered.reduce((s, r) => s + r.claimLines, 0)
  const uniqueNPIs  = new Set(filtered.map(r => r.npi)).size

  const maxPaid = Math.max(...filtered.map(r => r.paidAmount), 1)

  function fmt$(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toLocaleString()}`
  }

  function paidColor(n: number) {
    if (n > 0) return "#005ea2"
    return "#3d4551"
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span style={{ opacity: sortKey === k ? 1 : 0.3, fontSize: "9px", marginLeft: 3 }}>
      {sortKey === k ? (sortDir === "desc" ? "▾" : "▴") : "▾"}
    </span>
  )

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono transition-all"
          style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#757575", fontSize: "14" }}>
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "#005ea2" }} />
          <span className="font-display font-bold tracking-widest" style={{ color: "#005ea2", fontSize: "14" }}>ENFORCEMENT LEARNING</span>
          <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "14" }}>·</span>
          <span className="font-mono tracking-widest" style={{ color: "#162e51", fontSize: "14" }}>REVOCATIONS ANALYSIS</span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Unique Providers",   value: uniqueNPIs.toLocaleString(),   color: "#005ea2" },
          { label: "Total Claim Lines",  value: totalClaims.toLocaleString(),  color: "#005ea2" },
          { label: "Total Paid Amount",  value: fmt$(totalPaid),               color: "#005ea2" },
        ].map(k => (
          <div key={k.label} className="rounded p-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="font-mono mb-1" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.1em" }}>{k.label}</div>
            <div className="font-display font-bold" style={{ color: k.color, fontSize: "20px" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Year filter pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {(["all", ...years] as (number | "all")[]).map(y => (
          <button key={y} onClick={() => setYearFilter(y)}
            className="font-mono px-2.5 py-1 rounded transition-all"
            style={{
              background: yearFilter === y ? "rgba(0,94,162,0.12)" : "rgba(0,94,162,0.04)",
              border: yearFilter === y ? "1px solid rgba(0,94,162,0.4)" : "1px solid rgba(0,94,162,0.12)",
              color: yearFilter === y ? "#005ea2" : "var(--muted-foreground)",
              fontSize: "13",
            }}>
            {y === "all" ? "ALL YEARS" : y}
          </button>
        ))}
        <span className="font-mono ml-auto" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>
          {filtered.length} records
        </span>
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.15)" }}>
        <div className="grid font-mono px-4 py-2.5"
          style={{ gridTemplateColumns: "56px 56px 150px 140px 140px 1fr", background: "rgba(0,94,162,0.07)", borderBottom: "1px solid rgba(0,94,162,0.12)", color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.1em", gap: "12px" }}>
          {([
            ["#",        null           ],
            ["YEAR",     "year"         ],
            ["PROVIDER NPI", "npi"      ],
            ["CLAIM LINES",  "claimLines"],
            ["PROCEDURES",   "procedures"],
            ["TOTAL PAID",   "paidAmount"],
          ] as [string, SortKey | null][]).map(([label, key]) => (
            <button key={label} onClick={() => key && toggleSort(key)}
              className="text-left flex items-center"
              style={{ cursor: key ? "pointer" : "default", color: key && sortKey === key ? "#005ea2" : "var(--muted-foreground)" }}>
              {label}{key && <SortIcon k={key} />}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
          {filtered.map((row, i) => (
            <div key={`${row.year}-${row.npi}`} className="grid items-center px-4 py-2.5 font-mono"
              style={{ gridTemplateColumns: "56px 56px 150px 140px 140px 1fr", gap: "12px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,94,162,0.06)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.015)" : "transparent" }}>
              <span style={{ color: "#1a4480", fontSize: "13" }}>{String(i + 1).padStart(3, "0")}</span>
              <span className="px-1.5 py-0.5 rounded text-center" style={{ background: "rgba(0,94,162,0.07)", color: "#757575", fontSize: "12" }}>{row.year}</span>
              <span style={{ color: "#005ea2", fontSize: "14", fontFamily: "JetBrains Mono, monospace" }}>{row.npi}</span>
              <span style={{ color: "#1b1b1b", fontSize: "14" }}>{row.claimLines.toLocaleString()}</span>
              <span style={{ color: "#00a91c", fontSize: "14" }}>{row.procedures}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 rounded-full flex-shrink-0" style={{ width: 60, background: "rgba(0,94,162,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((row.paidAmount / maxPaid) * 100, 100)}%`, background: paidColor(row.paidAmount) }} />
                </div>
                <span style={{ color: paidColor(row.paidAmount), fontSize: "14", fontWeight: row.paidAmount > 100000 ? 700 : 400 }}>
                  {row.paidAmount === 0 ? "—" : fmt$(row.paidAmount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── DatabaseTableView ─────────────────────────────────────────────────────────

function DatabaseTableView({ agent, section, onClose, onDrilldown }: {
  agent: Agent
  section: "inputs" | "outputs"
  onClose: () => void
  onDrilldown?: (field: string) => void
}) {
  const isInputs = section === "inputs"

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono transition-all"
          style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#757575", fontSize: "14" }}
        >
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
          <span className="font-display font-bold tracking-widest" style={{ color: agent.color, fontSize: "14" }}>{agent.shortName.toUpperCase()}</span>
          <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "14" }}>·</span>
          <span className="font-mono tracking-widest" style={{ color: "#162e51", fontSize: "14" }}>{isInputs ? "INPUTS" : "OUTPUTS"} DATABASE</span>
        </div>
        <span className="font-mono px-2 py-0.5 rounded ml-auto"
          style={{ background: `${agent.color}10`, border: `1px solid ${agent.color}28`, color: agent.color, fontSize: "13" }}>
          {isInputs ? agent.inputs.length : agent.outputs.length} RECORDS
        </span>
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.15)" }}>
        {/* Column headers */}
        {isInputs ? (
          <>
            <div className="grid font-mono px-4 py-2.5"
              style={{ gridTemplateColumns: "32px 220px 1fr 160px", background: "rgba(0,94,162,0.07)", borderBottom: "1px solid rgba(0,94,162,0.12)", color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em", gap: "16px" }}>
              <span>#</span><span>DATA SOURCE</span><span>DESCRIPTION</span><span>DOCUMENTATION</span>
            </div>
            {agent.inputs.map((inp, i) => (
              <div key={i} className="grid items-start px-4 py-3.5 font-mono"
                style={{ gridTemplateColumns: "32px 220px 1fr 160px", gap: "16px", borderBottom: i < agent.inputs.length - 1 ? "1px solid rgba(0,94,162,0.07)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.02)" : "transparent" }}>
                <span style={{ color: "#3d4551", fontSize: "13" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ color: agent.color, fontSize: "14", fontWeight: 600, lineHeight: 1.5 }}>{inp.label}</span>
                <span style={{ color: "#757575", fontSize: "14", lineHeight: 1.65 }}>{inp.description}</span>
                <div>
                  {inp.url ? (
                    <a href={inp.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded transition-colors"
                      style={{ background: "rgba(0,94,162,0.07)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2", fontSize: "12", textDecoration: "none", lineHeight: 1.4 }}>
                      {inp.source} ↗
                    </a>
                  ) : (
                    <span className="px-2 py-1 rounded" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.12)", color: "#3d4551", fontSize: "12" }}>
                      {inp.source}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="grid font-mono px-4 py-2.5"
              style={{ gridTemplateColumns: "32px 200px 200px 1fr", background: "rgba(0,94,162,0.07)", borderBottom: "1px solid rgba(0,94,162,0.12)", color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em", gap: "16px" }}>
              <span>#</span><span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
            </div>
            {agent.outputs.map((out, i) => {
              const hasDrilldown = out.field === "revocations_analysis" && !!onDrilldown
              return (
                <div key={i}
                  onClick={() => hasDrilldown && onDrilldown!(out.field)}
                  className="grid items-start px-4 py-3.5 font-mono transition-colors"
                  style={{ gridTemplateColumns: "32px 200px 200px 1fr", gap: "16px", borderBottom: i < agent.outputs.length - 1 ? "1px solid rgba(0,94,162,0.07)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.02)" : "transparent", cursor: hasDrilldown ? "pointer" : "default" }}
                  onMouseEnter={e => { if (hasDrilldown) (e.currentTarget as HTMLElement).style.background = "rgba(0,94,162,0.06)" }}
                  onMouseLeave={e => { if (hasDrilldown) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(0,94,162,0.02)" : "transparent" }}
                >
                  <span style={{ color: "#3d4551", fontSize: "13" }}>{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: agent.color, fontSize: "14", fontWeight: 600 }}>{out.field}</span>
                    {hasDrilldown && <span style={{ color: "#005ea2", fontSize: "12" }}>↗</span>}
                  </div>
                  <span className="px-2 py-0.5 rounded self-start" style={{ background: "rgba(107,70,193,0.1)", border: "1px solid rgba(107,70,193,0.2)", color: "#6b46c1", fontSize: "13" }}>{out.type}</span>
                  <span style={{ color: "#757575", fontSize: "14", lineHeight: 1.65 }}>{out.description}</span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AgentLibrary({ initialAgentId }: { initialAgentId?: string | null } = {}) {
  const isSignal = !initialAgentId || SIGNAL_AGENTS.some(a => a.id === initialAgentId)
  const [activeWorkflow, setActiveWorkflow] = useState<"signal" | "enterprise">(isSignal ? "signal" : "enterprise")
  const [highlightedId, setHighlightedId]   = useState<string>(initialAgentId ?? SIGNAL_AGENTS[0].id)
  const [dbView, setDbView]           = useState<{ agentId: string; section: "inputs" | "outputs" } | null>(null)
  const [billingView, setBillingView] = useState(false)
  const [gapView, setGapView]         = useState(false)

  const agents = activeWorkflow === "signal" ? SIGNAL_AGENTS : ENTERPRISE_AGENTS
  const layout = activeWorkflow === "signal" ? SIGNAL_LAYOUT : ENTERPRISE_LAYOUT
  const allAgents = [...SIGNAL_AGENTS, ...ENTERPRISE_AGENTS]
  const dbAgent = dbView ? allAgents.find(a => a.id === dbView.agentId) ?? null : null

  function handleWorkflowSwitch(wf: "signal" | "enterprise") {
    setActiveWorkflow(wf)
    setHighlightedId(wf === "signal" ? SIGNAL_AGENTS[0].id : ENTERPRISE_AGENTS[0].id)
  }

  if (gapView) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>AGENT LIBRARY</h1>
        <DetectionGapView onClose={() => setGapView(false)} />
      </div>
    )
  }

  if (billingView) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>AGENT LIBRARY</h1>
        <BillingDataView onClose={() => setBillingView(false)} />
      </div>
    )
  }

  if (dbView && dbAgent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>AGENT LIBRARY</h1>
        <DatabaseTableView
          agent={dbAgent}
          section={dbView.section}
          onClose={() => setDbView(null)}
          onDrilldown={() => setBillingView(true)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>AGENT LIBRARY</h1>

      {/* Workflow selector */}
      <div className="flex gap-2">
        {[
          { id: "signal" as const,     label: "SURFACE/THREAT IDENTIFICATION AGENTS", count: SIGNAL_AGENTS.length,     color: "#3d4551" },
          { id: "enterprise" as const, label: "CMS/CPI ACTION AGENTS",             count: ENTERPRISE_AGENTS.length, color: "#1a4480" },
        ].map(wf => (
          <button
            key={wf.id}
            onClick={() => handleWorkflowSwitch(wf.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded transition-all"
            style={{
              background: activeWorkflow === wf.id ? `${wf.color}12` : "var(--card)",
              border: `1px solid ${activeWorkflow === wf.id ? wf.color + "44" : "rgba(0,94,162,0.12)"}`,
              boxShadow: activeWorkflow === wf.id ? `0 0 16px ${wf.color}18` : "none",
            }}
          >
            <span className="font-display text-sm font-bold tracking-widest" style={{ color: activeWorkflow === wf.id ? wf.color : "var(--muted-foreground)", fontSize: "16" }}>
              {wf.label}
            </span>
            <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: `${wf.color}18`, color: wf.color, fontSize: "15" }}>
              {wf.count}
            </span>
          </button>
        ))}
      </div>

      {/* DAG — only shown for Surface/Threat Identification workflow */}
      {activeWorkflow === "signal" && (
        <WorkflowDAG
          layout={layout}
          agents={agents}
          selectedId={highlightedId}
          onSelect={id => setHighlightedId(id)}
        />
      )}

      {/* Agent list — all agents as numbered accordion cards */}
      <div className="flex flex-col gap-2">
        {agents.map((agent, i) => (
          <AgentAccordionCard
            key={agent.id}
            agent={agent}
            index={i}
            isHighlighted={agent.id === highlightedId}
            onHeaderClick={() => setHighlightedId(agent.id)}
            onOpenDb={(agentId, section) => {
              if (section === "billing") setBillingView(true)
              else if (section === "gap") setGapView(true)
              else setDbView({ agentId, section })
            }}
          />
        ))}
      </div>
    </div>
  )
}
