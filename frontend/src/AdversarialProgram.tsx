import { useState, useEffect, useRef } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

type AgentId = "economics" | "policy" | "adversarial" | "claims"
type StepKind = "thinking" | "tool_call" | "tool_result" | "message" | "handoff"

interface Step {
  agent: AgentId
  kind: StepKind
  text: string
  tool?: string
  args?: string
  result?: string
  delay: number
}

// ── Agent Definitions ──────────────────────────────────────────────────────────

const AGENTS: {
  id: AgentId
  name: string
  tagline: string
  goal: string
  tools: string[]
  color: string
  glow: string
  icon: string
}[] = [
  {
    id: "economics",
    name: "ECONOMICS AGENT",
    tagline: "Where is the money?",
    goal: "Identify HCPCS codes with high reimbursement, recurring billing potential, geographic rate differentials, and rapidly growing aggregate expenditure.",
    tools: ["query_hcpcs_schedule", "compare_reimbursement_rates", "scan_claim_volume", "identify_recurring_codes"],
    color: "#ffbe2e",
    glow: "rgba(255,190,46,0.2)",
    icon: "◈",
  },
  {
    id: "policy",
    name: "POLICY AGENT",
    tagline: "What must a supplier prove?",
    goal: "Read NCDs, LCDs and policy articles to extract coverage controls, documentation requirements, eligibility thresholds, and supplier enrollment rules per code.",
    tools: ["retrieve_lcd_policy", "parse_ncd_controls", "extract_coverage_criteria", "build_control_matrix"],
    color: "#005ea2",
    glow: "rgba(0,94,162,0.2)",
    icon: "◉",
  },
  {
    id: "adversarial",
    name: "ADVERSARIAL AGENT",
    tagline: "How might someone exploit this?",
    goal: "Construct hypothetical abuse cases by mapping exploitable gaps in coverage qualification, ordering verification, delivery confirmation, and recurring billing controls.",
    tools: ["model_exploitation_path", "score_control_weakness", "generate_scheme_patterns", "map_attack_surface"],
    color: "#b50909",
    glow: "rgba(181,9,9,0.2)",
    icon: "◎",
  },
  {
    id: "claims",
    name: "CLAIMS AGENT",
    tagline: "Does the vulnerability appear in real activity?",
    goal: "Use LDS claims data to test hypothesized fraud patterns — supplier concentration, units per beneficiary, geographic hot spots, new-entrant growth, and referral network overlap.",
    tools: ["query_lds_claims", "compute_supplier_concentration", "detect_billing_anomalies", "build_provider_graph"],
    color: "#6b46c1",
    glow: "rgba(107,70,193,0.2)",
    icon: "◫",
  },
]

// ── Simulation Script ──────────────────────────────────────────────────────────

const SIMULATION: Step[] = [
  // Economics Agent
  { agent: "economics", kind: "thinking", text: "Scanning DMEPOS HCPCS fee schedule for high-value targets...", delay: 600 },
  { agent: "economics", kind: "tool_call", tool: "query_hcpcs_schedule", args: '{ "category": "DMEPOS", "min_reimbursement": 500, "payment_type": ["lump_sum", "recurring"] }', text: "", delay: 900 },
  { agent: "economics", kind: "tool_result", text: "", result: "Returned 847 codes. Top clusters: CPAP supplies (E0601–E0602), power wheelchairs (K0800–K0899), wound care (A6xxx), CGM (K0553). 23 codes with monthly recurring ≥ $180.", delay: 700 },
  { agent: "economics", kind: "tool_call", tool: "compare_reimbursement_rates", args: '{ "codes": ["E0601", "K0553", "K0856"], "by": "geography" }', text: "", delay: 800 },
  { agent: "economics", kind: "tool_result", text: "", result: "E0601 varies $142–$289/month across MAC jurisdictions. K0856 (power wheelchair) shows $6,800–$9,200 lump sum variance. Geographic arbitrage risk: HIGH.", delay: 600 },
  { agent: "economics", kind: "message", text: "25 HCPCS codes flagged — high unit reimbursement, recurring billing, broad eligibility, and material claims volume. Passing to Policy Agent.", delay: 700 },

  // Handoff
  { agent: "economics", kind: "handoff", text: "→ Routing findings to POLICY AGENT", delay: 500 },

  // Policy Agent
  { agent: "policy", kind: "thinking", text: "Retrieving coverage controls for top-flagged codes via Medicare Coverage Database...", delay: 700 },
  { agent: "policy", kind: "tool_call", tool: "retrieve_lcd_policy", args: '{ "codes": ["E0601", "K0553", "K0856"], "jurisdiction": "all", "include_articles": true }', text: "", delay: 900 },
  { agent: "policy", kind: "tool_result", text: "", result: "LCD L33718 (CPAP): requires face-to-face sleep study, AHI ≥ 15, 90-day compliance trial. LCD L33854 (CGM): physician order + Type 1/2 diagnosis + 4x/day testing. K0856: physician prescription + functional mobility assessment.", delay: 800 },
  { agent: "policy", kind: "tool_call", tool: "build_control_matrix", args: '{ "codes": ["E0601", "K0553", "K0856"], "controls": ["diagnosis", "physician_order", "testing", "delivery", "refill_need", "frequency_limit"] }', text: "", delay: 850 },
  { agent: "policy", kind: "tool_result", text: "", result: "Control matrix built. Key weakness: refill need for CPAP supplies relies on supplier-maintained documentation — no independent CMS verification mechanism. CGM refill: beneficiary phone confirmation only.", delay: 700 },
  { agent: "policy", kind: "message", text: "Control matrix complete. Identified 8 weak controls across 3 high-value code families. Recurring supply billing and physician-order verification are lowest-assurance checkpoints.", delay: 700 },
  { agent: "policy", kind: "handoff", text: "→ Routing to ADVERSARIAL AGENT", delay: 500 },

  // Adversarial Agent
  { agent: "adversarial", kind: "thinking", text: "Modeling potential exploitation paths against identified control weaknesses...", delay: 700 },
  { agent: "adversarial", kind: "tool_call", tool: "model_exploitation_path", args: '{ "code": "E0601", "weak_control": "refill_documentation", "method": "supplier_fabrication" }', text: "", delay: 900 },
  { agent: "adversarial", kind: "tool_result", text: "", result: "Scheme: Supplier generates templated refill records without beneficiary contact. Recurring $289/month per beneficiary. No automated CMS check for record authenticity. Detectable only via manual audit.", delay: 800 },
  { agent: "adversarial", kind: "tool_call", tool: "map_attack_surface", args: '{ "target": "K0856", "vectors": ["upcoding", "medically_unnecessary", "phantom_delivery"] }', text: "", delay: 850 },
  { agent: "adversarial", kind: "tool_result", text: "", result: "K0856 upcoding path: downgrade item delivered (K0800, $2,100) while billing K0856 ($8,900). Spread across newly enrolled entities to avoid concentration flags. Mobility assessment often performed by ordering clinician — conflict of interest unverified.", delay: 750 },
  { agent: "adversarial", kind: "tool_call", tool: "score_control_weakness", args: '{ "schemes": ["cpap_refill_fabrication", "wheelchair_upcoding", "cgm_phantom_billing"] }', text: "", delay: 800 },
  { agent: "adversarial", kind: "tool_result", text: "", result: "Scores: CPAP refill fabrication — Exploitability: 9/10, Detectability: 2/10. Wheelchair upcoding — Exploitability: 7/10, Detectability: 4/10. CGM phantom billing — Exploitability: 8/10, Detectability: 3/10.", delay: 700 },
  { agent: "adversarial", kind: "message", text: "3 high-confidence exploitation paths modeled. Passing evidence hypotheses to Claims Agent for empirical validation.", delay: 700 },
  { agent: "adversarial", kind: "handoff", text: "→ Routing to CLAIMS AGENT", delay: 500 },

  // Claims Agent
  { agent: "claims", kind: "thinking", text: "Loading LDS claims — testing whether hypothesized patterns appear in real activity...", delay: 700 },
  { agent: "claims", kind: "tool_call", tool: "query_lds_claims", args: '{ "codes": ["E0601", "K0856", "K0553"], "period": "2022-2024", "metrics": ["units_per_beneficiary", "supplier_growth", "referral_concentration"] }', text: "", delay: 1000 },
  { agent: "claims", kind: "tool_result", text: "", result: "E0601: 94 recently enrolled suppliers in FL/TX/LA showing >8x national avg units per beneficiary. K0856: 12 supplier clusters with shared ordering physicians — 3 clinicians responsible for 41% of high-value authorizations. K0553: 6 new entrants with >300% YoY growth, avg tenure 8 months.", delay: 900 },
  { agent: "claims", kind: "tool_call", tool: "build_provider_graph", args: '{ "code": "K0856", "link_by": ["ordering_npi", "beneficiary_overlap", "address_proximity"] }', text: "", delay: 900 },
  { agent: "claims", kind: "tool_result", text: "", result: "Graph reveals 2 connected supplier clusters (FL: 8 entities, LA: 6 entities) with shared beneficial ownership signature — identical billing addresses and overlapping NPIs across enrollment periods.", delay: 800 },
  { agent: "claims", kind: "tool_call", tool: "detect_billing_anomalies", args: '{ "codes": ["E0601", "K0856", "K0553"], "flags": ["rapid_growth", "geographic_cluster", "ordering_concentration"] }', text: "", delay: 850 },
  { agent: "claims", kind: "tool_result", text: "", result: "Confirmed: all 3 hypothesized patterns present in claims data. Estimated improper payment exposure: $28–42M/yr for flagged supplier cohort. Anomaly confidence: HIGH (p < 0.001).", delay: 700 },
  { agent: "claims", kind: "message", text: "Empirical validation complete. Evidence-based fraud risk hypotheses confirmed for 3 vulnerability clusters. Generating final report.", delay: 800 },
]

// ── Vulnerability Table Data ───────────────────────────────────────────────────

const VULNERABILITIES = [
  {
    id: "VUL-001",
    code: "E0601",
    product: "CPAP / Respiratory Supplies",
    scheme: "Refill Fabrication",
    attackSurface: "Recurring billing — supplier-maintained documentation",
    exploitability: 9,
    detectability: 2,
    exposure: "$18–24M/yr",
    controlGap: "No independent CMS verification of refill need",
    recommendation: "Beneficiary outreach verification + prepayment audit for new suppliers",
    confirmed: true,
  },
  {
    id: "VUL-002",
    code: "K0856",
    product: "Power Wheelchair (Group 3)",
    scheme: "Upcoding + Phantom Delivery",
    attackSurface: "Code selection ambiguity + delivery confirmation gap",
    exploitability: 7,
    detectability: 4,
    exposure: "$12–16M/yr",
    controlGap: "Mobility assessment performed by ordering clinician — conflict of interest",
    recommendation: "Independent functional assessment requirement + delivery receipt verification",
    confirmed: true,
  },
  {
    id: "VUL-003",
    code: "K0553",
    product: "CGM Supplies",
    scheme: "Phantom Billing + Beneficiary Recruitment",
    attackSurface: "Beneficiary phone confirmation for refills — easily bypassed",
    exploitability: 8,
    detectability: 3,
    exposure: "$8–12M/yr",
    controlGap: "No cross-check of beneficiary confirmation against medical record",
    recommendation: "Real-time eligibility confirmation + ordering NPI concentration alerts",
    confirmed: true,
  },
  {
    id: "VUL-004",
    code: "A6xxx",
    product: "Wound Care Supplies",
    scheme: "Quantity Inflation",
    attackSurface: "Frequency limits — automated edits check presence, not clinical truth",
    exploitability: 6,
    detectability: 5,
    exposure: "$4–7M/yr",
    controlGap: "Claim edit passes correct diagnosis code regardless of wound severity",
    recommendation: "Clinical severity field requirement + post-payment review sampling",
    confirmed: false,
  },
]

// ── Components ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, active }: { agent: typeof AGENTS[0]; active: boolean }) {
  return (
    <div
      className="rounded p-4 flex flex-col gap-2 transition-all duration-300"
      style={{
        background: active ? `rgba(${agent.color === "#ffbe2e" ? "255,190,46" : agent.color === "#005ea2" ? "0,94,162" : agent.color === "#b50909" ? "181,9,9" : "107,70,193"},0.08)` : "var(--card)",
        border: `1px solid ${active ? agent.color + "55" : "rgba(0,94,162,0.1)"}`,
        boxShadow: active ? `0 0 20px ${agent.glow}` : "none",
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: agent.color, fontSize: "24px" }}>{agent.icon}</span>
        <span className="font-display text-xs font-bold tracking-widest" style={{ color: agent.color }}>{agent.name}</span>
        {active && (
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: agent.color }} />
            <span className="font-mono text-xs" style={{ color: agent.color, fontSize: "24px" }}>RUNNING</span>
          </div>
        )}
      </div>
      <p className="font-mono text-xs italic" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>"{agent.tagline}"</p>
      <p className="font-mono text-xs leading-relaxed" style={{ color: "#757575", fontSize: "18" }}>{agent.goal}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {agent.tools.map(t => (
          <span key={t} className="font-mono px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.15)", color: "var(--muted-foreground)", fontSize: "24px" }}>
            {t}()
          </span>
        ))}
      </div>
    </div>
  )
}

function StepBubble({ step, agentDef }: { step: Step; agentDef: typeof AGENTS[0] }) {
  if (step.kind === "handoff") {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px" style={{ background: "rgba(0,94,162,0.15)" }} />
        <span className="font-mono text-xs px-3 py-1 rounded-full" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#3d4551", fontSize: "18" }}>
          {step.text}
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(0,94,162,0.15)" }} />
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: agentDef.color + "22", border: `1px solid ${agentDef.color}44` }}>
          <span style={{ color: agentDef.color, fontSize: "18" }}>{agentDef.icon}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="font-mono text-xs font-semibold" style={{ color: agentDef.color, fontSize: "18" }}>{agentDef.name}</span>

        {step.kind === "thinking" && (
          <div className="font-mono text-xs italic py-1" style={{ color: "var(--muted-foreground)", fontSize: "24px" }}>
            {step.text}
          </div>
        )}

        {step.kind === "message" && (
          <div className="font-mono text-xs py-1.5 px-3 rounded" style={{ background: agentDef.color + "0d", border: `1px solid ${agentDef.color}22`, color: "#1b1b1b", fontSize: "24px" }}>
            {step.text}
          </div>
        )}

        {step.kind === "tool_call" && (
          <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.2)" }}>
            <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(0,94,162,0.06)" }}>
              <span className="font-mono text-xs" style={{ color: "#3d4551", fontSize: "18" }}>TOOL CALL</span>
              <span className="font-mono text-xs font-semibold" style={{ color: "#005ea2" }}>{step.tool}()</span>
            </div>
            <pre className="px-3 py-2 font-mono text-xs overflow-x-auto" style={{ background: "rgba(22,46,81,0.8)", color: "#757575", fontSize: "18", margin: 0 }}>
              {step.args}
            </pre>
          </div>
        )}

        {step.kind === "tool_result" && (
          <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,169,28,0.15)" }}>
            <div className="px-3 py-1.5" style={{ background: "rgba(0,169,28,0.04)" }}>
              <span className="font-mono text-xs" style={{ color: "#00a91c", fontSize: "18" }}>✓ RESULT</span>
            </div>
            <div className="px-3 py-2 font-mono text-xs" style={{ background: "rgba(22,46,81,0.8)", color: "#00a91c", fontSize: "18" }}>
              {step.result}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ExploitabilityBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-1.5 h-3 rounded-sm" style={{ background: i < value ? color : "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}/10</span>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdversarialProgram() {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState<Step[]>([])
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null)
  const [typingAgent, setTypingAgent] = useState<AgentId | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [visibleSteps])

  function runSimulation() {
    setRunning(true)
    setDone(false)
    setVisibleSteps([])
    setActiveAgent("economics")

    let elapsed = 0
    SIMULATION.forEach((step, i) => {
      elapsed += step.delay
      setTimeout(() => {
        setActiveAgent(step.agent)
        setTypingAgent(step.agent)
        setTimeout(() => {
          setVisibleSteps(prev => [...prev, step])
          setTypingAgent(null)
          if (step.kind === "handoff") {
            const next = SIMULATION[i + 1]
            if (next) setActiveAgent(next.agent)
          }
          if (i === SIMULATION.length - 1) {
            setRunning(false)
            setDone(true)
            setActiveAgent(null)
          }
        }, 300)
      }, elapsed)
    })
  }

  function reset() {
    setRunning(false)
    setDone(false)
    setVisibleSteps([])
    setActiveAgent(null)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>ADVERSARIAL PROGRAM</h1>
          <p className="font-mono text-xs mt-1 max-w-xl" style={{ color: "var(--muted-foreground)" }}>
            Four cooperative agents examine DMEPOS through the eyes of a sophisticated fraudster — combining Medicare prices, coverage policies and claims behavior to identify exploitable gaps before they become improper payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <button onClick={reset} className="font-mono text-xs px-3 py-1.5 rounded transition-colors" style={{ background: "transparent", border: "1px solid rgba(0,94,162,0.2)", color: "var(--muted-foreground)" }}>
              RESET
            </button>
          )}
          <button
            onClick={runSimulation}
            disabled={running}
            className="font-mono text-xs px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
            style={{
              background: running ? "rgba(181,9,9,0.1)" : "rgba(181,9,9,0.15)",
              border: `1px solid ${running ? "rgba(181,9,9,0.4)" : "rgba(181,9,9,0.4)"}`,
              color: "#b50909",
              boxShadow: running ? "0 0 16px rgba(181,9,9,0.2)" : "none",
            }}
          >
            {running ? "▶ RUNNING ANALYSIS..." : done ? "▶ RE-RUN ANALYSIS" : "▶ RUN ANALYSIS"}
          </button>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-4 gap-3">
        {AGENTS.map(agent => (
          <AgentCard key={agent.id} agent={agent} active={activeAgent === agent.id} />
        ))}
      </div>

      {/* Interaction Feed */}
      {(visibleSteps.length > 0 || running) && (
        <div className="rounded" style={{ border: "1px solid rgba(0,94,162,0.12)", background: "var(--card)" }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,94,162,0.1)" }}>
            <span className="font-display text-xs tracking-widest" style={{ color: "#162e51" }}>AGENT INTERACTION LOG</span>
            {running && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "#005ea2", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="font-mono text-xs" style={{ color: "#005ea2", fontSize: "18" }}>PROCESSING</span>
              </div>
            )}
          </div>
          <div ref={feedRef} className="overflow-y-auto p-4 flex flex-col gap-3" style={{ maxHeight: 420, scrollBehavior: "smooth" }}>
            {visibleSteps.map((step, i) => {
              const agentDef = AGENTS.find(a => a.id === step.agent)!
              return <StepBubble key={i} step={step} agentDef={agentDef} />
            })}
            {typingAgent && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: AGENTS.find(a => a.id === typingAgent)!.color + "22" }}>
                    <span style={{ color: AGENTS.find(a => a.id === typingAgent)!.color, fontSize: "18" }}>{AGENTS.find(a => a.id === typingAgent)!.icon}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: AGENTS.find(a => a.id === typingAgent)!.color + "aa", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vulnerability Table */}
      {done && (
        <div className="rounded" style={{ border: "1px solid rgba(181,9,9,0.25)", background: "var(--card)", boxShadow: "0 0 30px rgba(181,9,9,0.08)" }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(181,9,9,0.15)" }}>
            <div>
              <h2 className="font-display text-xs font-bold tracking-widest" style={{ color: "#b50909" }}>VULNERABILITY REPORT</h2>
              <p className="font-mono text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {VULNERABILITIES.filter(v => v.confirmed).length} confirmed · {VULNERABILITIES.filter(v => !v.confirmed).length} suspected · Ranked by exploitability
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold" style={{ color: "#ffbe2e" }}>
                ${VULNERABILITIES.reduce((s, v) => s + parseFloat(v.exposure.replace("$", "").split("–")[1]), 0).toFixed(0)}M+ exposure
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(181,9,9,0.1)" }}>
                  {["ID", "CODE", "PRODUCT", "SCHEME", "ATTACK SURFACE", "EXPLOITABILITY", "DETECTABILITY", "EXPOSURE", "RECOMMENDATION"].map(h => (
                    <th key={h} className="font-mono text-left px-4 py-2.5" style={{ color: "var(--muted-foreground)", fontSize: "24px", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VULNERABILITIES.map((v, i) => (
                  <tr
                    key={v.id}
                    style={{ borderBottom: "1px solid rgba(0,94,162,0.06)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold" style={{ color: v.confirmed ? "#b50909" : "#3d4551" }}>{v.id}</span>
                        {v.confirmed && (
                          <span className="font-mono px-1 py-0.5 rounded-sm" style={{ background: "rgba(181,9,9,0.1)", color: "#b50909", fontSize: "18", border: "1px solid rgba(181,9,9,0.2)" }}>CONFIRMED</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: "#005ea2" }}>{v.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs" style={{ color: "#1b1b1b", whiteSpace: "nowrap" }}>{v.product}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs" style={{ color: "#b45f06", whiteSpace: "nowrap" }}>{v.scheme}</span>
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: 200 }}>
                      <span className="font-mono text-xs" style={{ color: "#757575", fontSize: "18" }}>{v.attackSurface}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ExploitabilityBar value={v.exploitability} color="#b50909" />
                    </td>
                    <td className="px-4 py-3">
                      <ExploitabilityBar value={v.detectability} color="#ffbe2e" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold" style={{ color: "#ffbe2e", whiteSpace: "nowrap" }}>{v.exposure}</span>
                    </td>
                    <td className="px-4 py-3" style={{ maxWidth: 220 }}>
                      <span className="font-mono text-xs" style={{ color: "#00a91c", fontSize: "18" }}>{v.recommendation}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 flex items-center gap-4" style={{ borderTop: "1px solid rgba(0,94,162,0.08)" }}>
            <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>
              Analysis generated by Sentinel v4.2.1 · DMEPOS HCPCS codes · FY2025 Q3 · FOR OFFICIAL USE ONLY
            </span>
            <button className="ml-auto font-mono text-xs px-3 py-1.5 rounded transition-colors" style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2" }}>
              EXPORT TO INVESTIGATION QUEUE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
