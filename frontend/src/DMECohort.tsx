import { useState, useRef, useEffect } from "react"

// ── Filter state ────────────────────────────────────────────────────────────

const LOOKBACK_OPTIONS = ["12 months", "24 months", "36 months"]
const MAC_JURISDICTIONS = ["All Jurisdictions", "J5 – WPS", "J6 – NGS", "J8 – Novitas", "J11 – Novitas", "J15 – CGS"]
const PRODUCT_FAMILIES = ["All DME", "Power Wheelchairs", "Oxygen & Supplies", "CPAP/BiPAP", "Enteral Nutrition", "Orthotics & Prosthetics"]

// ── Cohort data (static, matches the narrative) ────────────────────────────

const FUNNEL_STEPS = [
  { label: "All Medicare Revocations",               n: 1240, pct: 100,  color: "#005ea2" },
  { label: "Valid NPI on Record",                    n: 1187, pct: 95.7, color: "#005ea2" },
  { label: "DMEPOS Suppliers",                       n: 148,  pct: 11.9, color: "#005ea2" },
  { label: "Matched to Historical Claims",           n: 131,  pct: 10.6, color: "rgba(0,94,162,0.65)" },
  { label: "Sufficient Pre-Revocation History",      n: 112,  pct:  9.0, color: "rgba(0,94,162,0.5)" },
  { label: "Final Retrospective Test Cohort",        n: 112,  pct:  9.0, color: "#005ea2" },
]

const KEY_METRICS = [
  { label: "Total Revoked Suppliers",       value: "1,240",   unit: "",   color: "#005ea2" },
  { label: "Identified as DMEPOS",          value: "148",     unit: "11.9%", color: "#005ea2" },
  { label: "Matched to Claims",             value: "131",     unit: "88.5%", color: "#005ea2" },
  { label: "Final Test Cohort",             value: "112",     unit: "9.0%",  color: "#005ea2" },
  { label: "Median History Available",      value: "22",      unit: "months", color: "#005ea2" },
  { label: "Pre-Revocation Claims",         value: "847K",    unit: "lines", color: "#005ea2" },
  { label: "Unique Beneficiaries",          value: "124,381", unit: "",   color: "#005ea2" },
  { label: "Total Allowed Dollars",         value: "$218.4M", unit: "",   color: "#005ea2" },
]

const TABLE_ROWS = [
  { npi: "1245183721", name: "Sunshine DME Corp",       type: "Power Wheelchairs",       revDate: "2022-03-14", category: "Billing Irregularities", firstClaim: "2020-01-08", lastEligible: "2022-03-13", months: 26, claims: 3847, benes: 1204, status: "Included" },
  { npi: "1386742091", name: "Bayou Medical Supplies",  type: "Oxygen & Supplies",       revDate: "2021-11-02", category: "Credentialing Fraud",     firstClaim: "2019-05-14", lastEligible: "2021-11-01", months: 29, claims: 2913, benes:  887, status: "Included" },
  { npi: "1578293047", name: "Delta Home Health Equip", type: "CPAP/BiPAP",              revDate: "2023-01-19", category: "Billing Irregularities", firstClaim: "2021-03-22", lastEligible: "2023-01-18", months: 21, claims: 1742, benes:  531, status: "Included" },
  { npi: "1692047381", name: "Lone Star DME LLC",       type: "Orthotics & Prosthetics", revDate: "2022-08-30", category: "Enrollment Violation",    firstClaim: "2021-09-01", lastEligible: "2022-08-29", months: 11, claims:  984, benes:  312, status: "Limited History" },
  { npi: "1803921564", name: "Empire Mobility Inc",     type: "Power Wheelchairs",       revDate: "2021-06-07", category: "Unresponsive to OIG",     firstClaim: "2018-11-30", lastEligible: "2021-06-06", months: 30, claims: 4201, benes: 1488, status: "Included" },
  { npi: "1924836105", name: "Peach State Prosthetics", type: "Orthotics & Prosthetics", revDate: "2023-04-22", category: "Billing Irregularities", firstClaim: "2023-02-14", lastEligible: "2023-04-21", months:  2, claims:   87, benes:   31, status: "Excluded" },
  { npi: "2035791847", name: "Coastal Respiratory Svcs",type: "Oxygen & Supplies",       revDate: "2022-12-09", category: "Credentialing Fraud",     firstClaim: "2020-06-17", lastEligible: "2022-12-08", months: 29, claims: 3102, benes:  976, status: "Included" },
  { npi: "2147603928", name: "Summit Enteral LLC",      type: "Enteral Nutrition",       revDate: "2021-09-15", category: "Enrollment Violation",    firstClaim: "2019-08-04", lastEligible: "2021-09-14", months: 25, claims: 1588, benes:  492, status: "Included" },
]

// ── Chat messages ───────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; text: string; ts: string }

const SEED_MESSAGES: Message[] = [
  {
    role: "user",
    text: "Which revoked DME suppliers had enough historical claims data to test for earlier warning signals?",
    ts: "09:14:03",
  },
  {
    role: "assistant",
    text: "Of 1,240 revoked providers and suppliers, 148 were identified as DMEPOS suppliers. Of those, 112 had at least 12 months of pre-revocation claims history and were included in the retrospective analysis.\n\nThe remaining 36 were excluded or flagged as limited-history: 17 had fewer than 12 months of observable claims, and 19 could not be matched to historical claims records with sufficient confidence.\n\nNote: revocation is an administrative outcome used here as a historical adverse-event marker — not as confirmation that every prior claim was fraudulent.",
    ts: "09:14:05",
  },
]

const CANNED_RESPONSES: Record<string, string> = {
  default:
    "I can help you refine the cohort criteria, explore specific supplier segments, or drill into a particular MAC jurisdiction or product family. What would you like to investigate?",
  wheelchair:
    "Within the final cohort of 112, 31 suppliers (27.7%) classified as Power Wheelchair providers. They account for 38% of pre-revocation claims volume and a disproportionate share of high-risk billing patterns flagged in the retrospective test window.",
  oxygen:
    "29 suppliers in the cohort fell under Oxygen & Supplies. Median pre-revocation history was 27 months — the highest of any product family — making them strong candidates for early-signal modeling.",
  jurisdiction:
    "J5 (WPS) and J6 (NGS) together account for 44 of the 112 cohort suppliers. J8 (Novitas) has the highest average claims volume per supplier at 3,841 lines.",
  excluded:
    "36 suppliers were excluded from the final cohort: 17 had fewer than 12 months of pre-revocation history, 19 could not be matched to claims data with sufficient identifier confidence. An additional 1,039 non-DMEPOS providers were out of scope.",
  history:
    "Across the 112-supplier cohort, median available pre-revocation claims history is 22 months. The 25th–75th percentile range is 15–29 months. Only 9 suppliers had more than 34 months of history.",
}

function getCannedResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes("wheelchair") || lower.includes("power")) return CANNED_RESPONSES.wheelchair
  if (lower.includes("oxygen") || lower.includes("cpap") || lower.includes("respiratory")) return CANNED_RESPONSES.oxygen
  if (lower.includes("jurisdiction") || lower.includes("mac") || lower.includes("j5") || lower.includes("j6")) return CANNED_RESPONSES.jurisdiction
  if (lower.includes("excluded") || lower.includes("exclude") || lower.includes("removed")) return CANNED_RESPONSES.excluded
  if (lower.includes("history") || lower.includes("months") || lower.includes("lookback")) return CANNED_RESPONSES.history
  return CANNED_RESPONSES.default
}

function now() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function statusColor(s: string) {
  if (s === "Included")        return { color: "#005ea2",            bg: "rgba(0,94,162,0.08)", border: "rgba(0,94,162,0.25)" }
  if (s === "Limited History") return { color: "rgba(0,94,162,0.6)", bg: "rgba(0,94,162,0.05)", border: "rgba(0,94,162,0.18)" }
  return                               { color: "#3d4551",            bg: "rgba(61,69,81,0.06)", border: "rgba(61,69,81,0.15)" }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DMECohort() {
  const [lookback, setLookback]     = useState("12 months")
  const [minHistory, setMinHistory] = useState(12)
  const [mac, setMac]               = useState("All Jurisdictions")
  const [product, setProduct]       = useState("All DME")
  const [messages, setMessages]     = useState<Message[]>(SEED_MESSAGES)
  const [input, setInput]           = useState("")
  const [typing, setTyping]         = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  function send() {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { role: "user", text, ts: now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { role: "assistant", text: getCannedResponse(text), ts: now() }])
    }, 1100 + Math.random() * 600)
  }

  const maxN = FUNNEL_STEPS[0].n

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "16px", height: "100%", minHeight: 0 }}>

      {/* ── LEFT: Filters + Funnel + Metrics + Table ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>

        {/* Page header */}
        <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#005ea2", border: "1px solid rgba(0,94,162,0.25)", fontSize: "18", letterSpacing: "0.12em" }}>AGENT WORKFLOW OUTPUT</span>
                <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>DME-RETRO-COHORT-v2 · Run completed 09:14:07</span>
              </div>
              <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>RETROSPECTIVE DME REVOCATION COHORT</h2>
              <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Build the analysis population · Identify revoked DMEPOS suppliers with actionable pre-revocation history</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: "#005ea2", boxShadow: "0 0 6px rgba(0,94,162,0.4)" }} />
              <span className="font-mono text-sm" style={{ color: "#005ea2" }}>COHORT BUILT</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded p-3 flex flex-wrap gap-3 items-end" style={{ background: "rgba(245,246,247,0.8)", border: "1px solid rgba(0,94,162,0.1)" }}>
          <FilterSelect label="CLAIMS LOOKBACK" value={lookback} options={LOOKBACK_OPTIONS} onChange={setLookback} />
          <FilterSelect label="MAC JURISDICTION" value={mac} options={MAC_JURISDICTIONS} onChange={setMac} />
          <FilterSelect label="DME PRODUCT FAMILY" value={product} options={PRODUCT_FAMILIES} onChange={setProduct} />
          <div className="flex flex-col gap-1">
            <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18", letterSpacing: "0.1em" }}>MIN HISTORY (MO)</span>
            <div className="flex items-center gap-2">
              <input
                type="range" min={6} max={36} step={6} value={minHistory}
                onChange={e => setMinHistory(Number(e.target.value))}
                className="w-24 accent-cyan-400"
                style={{ accentColor: "#005ea2" }}
              />
              <span className="font-mono text-sm font-bold" style={{ color: "#005ea2", minWidth: 24 }}>{minHistory}</span>
            </div>
          </div>
          <button className="font-mono text-sm px-3 py-1.5 rounded ml-auto self-end transition-all"
            style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.3)", color: "#005ea2" }}>
            APPLY FILTERS
          </button>
        </div>

        {/* Funnel */}
        <div className="bracket-card scanlines rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>COHORT CONSTRUCTION FUNNEL</h3>
            <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>n = total revoked providers &amp; suppliers entering each stage</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {FUNNEL_STEPS.map((step, i) => {
              const barW = Math.max(8, (step.n / maxN) * 100)
              const isLast = i === FUNNEL_STEPS.length - 1
              return (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm" style={{ color: isLast ? "#005ea2" : "#1b1b1b", fontSize: "24px", fontWeight: isLast ? 600 : 400 }}>
                          {step.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold" style={{ color: step.color }}>
                            {step.n.toLocaleString()}
                          </span>
                          <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>
                            {step.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-5 rounded-sm overflow-hidden" style={{ background: "rgba(0,94,162,0.06)" }}>
                        <div className="h-full rounded-sm transition-all duration-500"
                          style={{
                            width: `${barW}%`,
                            background: isLast
                              ? "linear-gradient(90deg, rgba(0,169,28,0.3), rgba(0,169,28,0.15))"
                              : `linear-gradient(90deg, ${step.color}28, ${step.color}10)`,
                            borderLeft: `2px solid ${step.color}`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center px-2">
                          <div className="h-px flex-1" style={{ background: `${step.color}15` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {i < FUNNEL_STEPS.length - 1 && (
                    <div className="flex justify-start pl-1 my-0.5">
                      <span style={{ color: "rgba(0,94,162,0.3)", fontSize: "18" }}>↓</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Callout */}
          <div className="mt-4 p-3 rounded" style={{ background: "rgba(0,94,162,0.05)", border: "1px solid rgba(0,94,162,0.2)" }}>
            <p className="font-mono text-sm leading-relaxed" style={{ color: "#757575" }}>
              <span style={{ color: "#005ea2", fontWeight: 600 }}>KEY FINDING — </span>
              Of 1,240 revoked providers and suppliers, 148 were identified as DMEPOS suppliers. Of those,{" "}
              <span style={{ color: "#005ea2", fontWeight: 600 }}>112 had at least 12 months of pre-revocation claims history</span>{" "}
              and were included in the retrospective analysis.
            </p>
          </div>

          {/* Caveat */}
          <div className="mt-2 flex items-start gap-2">
            <span style={{ color: "rgba(0,94,162,0.5)", fontSize: "18", marginTop: "1px" }}>⚠</span>
            <p className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18", lineHeight: 1.6 }}>
              Revocation is an administrative outcome and should be used as a historical adverse-event marker, not as proof that every earlier claim was fraudulent.
            </p>
          </div>
        </div>

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {KEY_METRICS.map(m => (
            <div key={m.label} className="rounded p-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.1)" }}>
              <div className="font-mono text-sm font-bold mb-0.5" style={{ color: m.color, fontSize: "24px" }}>{m.value}</div>
              {m.unit && <div className="font-mono" style={{ color: m.color, fontSize: "18", opacity: 0.7 }}>{m.unit}</div>}
              <div className="font-mono mt-1" style={{ color: "var(--muted-foreground)", fontSize: "18", lineHeight: 1.4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Supporting table */}
        <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)", flex: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>SUPPLIER ELIGIBILITY DETAIL</h3>
              <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Pre-revocation observation periods · Analysis eligibility by supplier</p>
            </div>
            <button className="font-mono text-sm px-3 py-1.5 rounded" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#005ea2" }}>
              EXPORT CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 860 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,94,162,0.12)" }}>
                  {["NPI", "SUPPLIER NAME", "TYPE", "REVOCATION DATE", "CATEGORY", "FIRST CLAIM", "LAST ELIGIBLE", "MO.", "CLAIMS", "BENES", "ELIGIBILITY"].map(h => (
                    <th key={h} className="font-mono text-left pb-2 pr-3" style={{ color: "var(--muted-foreground)", fontSize: "24px", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => {
                  const sc = statusColor(row.status)
                  return (
                    <tr key={i} className="transition-colors" style={{ borderBottom: "1px solid rgba(0,94,162,0.05)" }}>
                      <td className="py-2 pr-3"><span className="font-mono text-sm" style={{ color: "#3d4551", fontSize: "18" }}>{row.npi}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono text-sm" style={{ color: "#1b1b1b", fontSize: "24px", whiteSpace: "nowrap" }}>{row.name}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono" style={{ color: "#757575", fontSize: "18", whiteSpace: "nowrap" }}>{row.type}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono text-sm" style={{ color: "#757575", fontSize: "18" }}>{row.revDate}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18", whiteSpace: "nowrap" }}>{row.category}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>{row.firstClaim}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>{row.lastEligible}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono text-sm font-bold" style={{ color: row.months >= 12 ? "#005ea2" : "rgba(0,94,162,0.4)" }}>{row.months}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono text-sm" style={{ color: "#1b1b1b", fontSize: "18" }}>{row.claims.toLocaleString()}</span></td>
                      <td className="py-2 pr-3"><span className="font-mono text-sm" style={{ color: "#1b1b1b", fontSize: "18" }}>{row.benes.toLocaleString()}</span></td>
                      <td className="py-2">
                        <span className="font-mono px-2 py-0.5 rounded-sm" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontSize: "18", whiteSpace: "nowrap" }}>
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── RIGHT: AI Chat Panel ── */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "sticky", top: 0, height: "calc(100vh - 120px)" }}>
        <div className="bracket-card rounded flex flex-col h-full" style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,94,162,0.2)" }}>

          {/* Chat header */}
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,94,162,0.1)", border: "1px solid rgba(0,94,162,0.3)" }}>
                <span style={{ color: "#005ea2", fontSize: "18" }}>◈</span>
              </div>
              <div>
                <div className="font-display text-sm font-bold tracking-widest" style={{ color: "#005ea2" }}>COHORT ANALYST</div>
                <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "24px" }}>DME-RETRO · AGENT MODE</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#005ea2" }} />
                <span className="font-mono" style={{ color: "#005ea2", fontSize: "18" }}>ACTIVE</span>
              </div>
            </div>
            <div className="font-mono mt-2 p-2 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.08)", color: "var(--muted-foreground)", fontSize: "18", lineHeight: 1.5 }}>
              Ask about cohort composition, supplier segments, jurisdiction breakdowns, or exclusion criteria.
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "24px" }}>
                    {msg.role === "user" ? "ANALYST" : "SENTINEL AI"}
                  </span>
                  <span className="font-mono" style={{ color: "rgba(61,69,81,0.5)", fontSize: "24px" }}>{msg.ts}</span>
                </div>
                <div className="rounded p-3" style={{
                  maxWidth: "92%",
                  background: msg.role === "user"
                    ? "rgba(0,94,162,0.08)"
                    : "rgba(245,246,247,0.9)",
                  border: msg.role === "user"
                    ? "1px solid rgba(0,94,162,0.2)"
                    : "1px solid rgba(0,94,162,0.1)",
                  borderRadius: msg.role === "user" ? "8px 2px 8px 8px" : "2px 8px 8px 8px",
                }}>
                  <p className="font-mono text-sm leading-relaxed" style={{ color: msg.role === "user" ? "#1b1b1b" : "#757575", whiteSpace: "pre-line" }}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "24px" }}>SENTINEL AI</span>
                </div>
                <div className="rounded p-3" style={{ background: "rgba(245,246,247,0.9)", border: "1px solid rgba(0,94,162,0.1)", borderRadius: "2px 8px 8px 8px" }}>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(j => (
                      <div key={j} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#005ea2", animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested queries */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="font-mono mb-1.5" style={{ color: "var(--muted-foreground)", fontSize: "24px", letterSpacing: "0.1em" }}>SUGGESTED QUERIES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                "How many power wheelchair suppliers were in the cohort?",
                "Which MAC jurisdictions had the highest volume?",
                "Why were 36 suppliers excluded?",
              ].map(q => (
                <button key={q} onClick={() => { setInput(q) }}
                  className="text-left rounded px-2.5 py-1.5 transition-colors font-mono"
                  style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.1)", color: "#3d4551", fontSize: "18", lineHeight: 1.4 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(0,94,162,0.1)" }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask about the cohort..."
                className="flex-1 rounded px-3 py-2 font-mono text-xs outline-none transition-all"
                style={{
                  background: "rgba(0,94,162,0.05)",
                  border: "1px solid rgba(0,94,162,0.15)",
                  color: "#1b1b1b",
                  fontSize: "24px",
                }}
              />
              <button onClick={send} disabled={!input.trim() || typing}
                className="px-3 py-2 rounded transition-all font-mono text-xs"
                style={{
                  background: input.trim() && !typing ? "rgba(0,94,162,0.15)" : "rgba(0,94,162,0.04)",
                  border: `1px solid ${input.trim() && !typing ? "rgba(0,94,162,0.4)" : "rgba(0,94,162,0.1)"}`,
                  color: input.trim() && !typing ? "#005ea2" : "#3d4551",
                  cursor: input.trim() && !typing ? "pointer" : "default",
                }}>
                ↵
              </button>
            </div>
            <div className="font-mono mt-1.5 text-center" style={{ color: "rgba(61,69,81,0.4)", fontSize: "24px" }}>
              ENTER to send · queries scoped to current cohort parameters
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Filter select helper ────────────────────────────────────────────────────

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "18", letterSpacing: "0.1em" }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="font-mono text-sm rounded px-2 py-1.5 outline-none"
        style={{ background: "rgba(0,94,162,0.05)", border: "1px solid rgba(0,94,162,0.2)", color: "#005ea2", fontSize: "18" }}
      >
        {options.map(o => <option key={o} value={o} style={{ background: "#ffffff" }}>{o}</option>)}
      </select>
    </div>
  )
}
