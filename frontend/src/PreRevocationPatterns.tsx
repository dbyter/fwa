import { useState } from "react"
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupplierProfile {
  id: string
  name: string
  npi: string
  type: string
  state: string
  revDate: string
  monthsDetectable: number
  riskTier: "CRITICAL" | "HIGH" | "ELEVATED"
  primarySignal: string
}

interface SignalRow {
  id: string
  category: string
  measure: string
  finding: string
  percentile: number
  peerDelta: string
  peerDeltaDir: "above" | "below"
  severity: "critical" | "high" | "moderate"
  firstVisible: number
  sparkData: number[]
}

// ── Supplier data ─────────────────────────────────────────────────────────────

const SUPPLIERS: SupplierProfile[] = [
  { id: "s1", name: "Sunshine DME Corp",       npi: "1245183721", type: "Power Wheelchairs",  state: "FL", revDate: "2022-03-14", monthsDetectable: 14, riskTier: "CRITICAL",  primarySignal: "Billing velocity + geographic expansion" },
  { id: "s2", name: "Bayou Medical Supplies",  npi: "1386742091", type: "Oxygen & Supplies",  state: "LA", revDate: "2021-11-02", monthsDetectable: 11, riskTier: "HIGH",      primarySignal: "Code concentration + orderer concentration" },
  { id: "s3", name: "Empire Mobility Inc",     npi: "1803921564", type: "Power Wheelchairs",  state: "NY", revDate: "2021-06-07", monthsDetectable: 18, riskTier: "CRITICAL",  primarySignal: "Rapid lifecycle + network similarity" },
  { id: "s4", name: "Coastal Respiratory Svcs",npi: "2035791847", type: "Oxygen & Supplies",  state: "GA", revDate: "2022-12-09", monthsDetectable: 9,  riskTier: "HIGH",      primarySignal: "Beneficiary pattern + peer deviation" },
  { id: "s5", name: "Summit Enteral LLC",      npi: "2147603928", type: "Enteral Nutrition",  state: "TX", revDate: "2021-09-15", monthsDetectable: 16, riskTier: "ELEVATED",  primarySignal: "Claim sequence + geographic expansion" },
]

// ── Timeline data factory ─────────────────────────────────────────────────────

function makeTimeline(supplierId: string) {
  const seeds: Record<string, number[]> = {
    s1: [12, 14, 15, 18, 22, 34, 56, 89, 142, 198, 267, 341, 408, 471, 520, 588, 632, 701, 748, 782, 819, 847, 891, 930],
    s2: [8,  9,  11, 13, 15, 19, 24, 31, 44,  62,  88,  124, 167, 201, 238, 274, 311, 342, 378, 401, 429, 447, 461, 478],
    s3: [5,  6,  8,  12, 19, 32, 58, 97, 163, 241, 318, 402, 487, 561, 614, 668, 712, 741, 769, 793, 814, 831, 847, 861],
    s4: [18, 19, 21, 22, 25, 28, 33, 41, 54,  71,  92,  118, 147, 174, 198, 219, 238, 252, 263, 271, 278, 283, 287, 291],
    s5: [10, 11, 12, 14, 17, 21, 27, 36, 48,  65,  87,  113, 142, 168, 191, 211, 228, 241, 251, 258, 264, 268, 272, 275],
  }
  const base = seeds[supplierId] ?? seeds.s1
  const peerMedians = base.map(v => v * 0.28 + Math.random() * 2)
  const peerP75     = peerMedians.map(v => v * 1.35)
  const peerP25     = peerMedians.map(v => v * 0.65)

  return Array.from({ length: 24 }, (_, i) => {
    const mo = -(24 - i)
    return {
      month: mo === 0 ? "REV" : `${mo}mo`,
      allowed: base[i],
      peerMedian: Math.round(peerMedians[i] * 10) / 10,
      peerP75: Math.round(peerP75[i] * 10) / 10,
      peerP25: Math.round(peerP25[i] * 10) / 10,
      beneficiaries: Math.round(base[i] * 0.42 + i * 0.8),
      unitsPerBene: parseFloat((1.8 + (base[i] / base[0]) * 0.9).toFixed(1)),
      states: Math.min(2 + Math.floor(i / 3.5), 29),
      orderers: Math.min(3 + Math.floor(i / 2.8), 47),
    }
  })
}

// ── Signal rows factory ───────────────────────────────────────────────────────

const SIGNAL_CONFIGS: Record<string, SignalRow[]> = {
  s1: [
    { id: "vel",  category: "Billing Velocity",          measure: "MoM growth, time to $1M allowed",              finding: "Allowed dollars increased 7× within 4 months. Reached $1M threshold in month −19.",       percentile: 99.7, peerDelta: "+2,840%",  peerDeltaDir: "above", severity: "critical", firstVisible: -20, sparkData: [12,14,18,34,56,89,142,198,267,341,408,471,520,588,632,701,748,782,819,847,891,930] },
    { id: "geo",  category: "Geographic Expansion",      measure: "States added, pace of expansion",              finding: "Expanded from 4 to 29 states in 6 months. No comparable peers expanded beyond 7 states.",  percentile: 99.9, peerDelta: "+314%",    peerDeltaDir: "above", severity: "critical", firstVisible: -18, sparkData: [2,2,3,3,4,4,6,9,13,17,22,26,28,29,29,29,29,29,29,29,29,29,29,29] },
    { id: "code", category: "Code Concentration",        measure: "Share of billing in top HCPCS codes",          finding: "86% of allowed dollars in 2 recurring-supply codes. Peer median: 34%.",                    percentile: 97.2, peerDelta: "+152pp",   peerDeltaDir: "above", severity: "high",     firstVisible: -16, sparkData: [38,39,41,44,48,53,59,64,68,72,75,77,80,82,84,85,86,86,86,86,86,86,86,86] },
    { id: "ord",  category: "Orderer Concentration",     measure: "Share from top ordering clinicians",           finding: "5 clinicians generated 72% of orders. All 5 were non-local to beneficiary zip codes.",    percentile: 98.1, peerDelta: "+189pp",   peerDeltaDir: "above", severity: "critical", firstVisible: -14, sparkData: [18,19,21,24,28,34,40,47,53,58,63,66,69,71,72,72,72,72,72,72,72,72,72,72] },
    { id: "bene", category: "Beneficiary Pattern",       measure: "Prior DME history, duplicate activity",        finding: "61% of beneficiaries had no prior related DME claims. 14% flagged for duplicate supplier.", percentile: 96.4, peerDelta: "+3.8×",    peerDeltaDir: "above", severity: "high",     firstVisible: -12, sparkData: [8,9,10,12,14,17,21,26,31,37,43,49,53,57,59,60,61,61,61,61,61,61,61,61] },
    { id: "net",  category: "Network Similarity",        measure: "Shared orderers/benes with adverse suppliers", finding: "Significant beneficiary overlap (31%) with a separately later-revoked supplier.",          percentile: 99.1, peerDelta: "N/A",      peerDeltaDir: "above", severity: "high",     firstVisible: -10, sparkData: [0,0,1,2,4,6,9,13,17,21,24,26,28,29,30,30,31,31,31,31,31,31,31,31] },
    { id: "seq",  category: "Claim Sequence",            measure: "Modifier frequency, replacement rate",         finding: "Replacement modifier rate 4.1× peer median. Same-day billing combinations exceeded norms.", percentile: 94.8, peerDelta: "+311%",    peerDeltaDir: "above", severity: "moderate", firstVisible: -8,  sparkData: [1.1,1.2,1.3,1.5,1.8,2.1,2.5,2.9,3.2,3.5,3.7,3.9,4.0,4.1,4.1,4.1,4.1,4.1,4.1,4.1,4.1,4.1,4.1,4.1] },
    { id: "life", category: "Supplier Lifecycle",        measure: "Time from enrollment to high volume",          finding: "Reached top-decile volume within 90 days of first billing. Peer median: 27 months.",         percentile: 99.5, peerDelta: "−26mo",    peerDeltaDir: "above", severity: "critical", firstVisible: -22, sparkData: [1,2,3,5,7,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10] },
    { id: "peer", category: "Peer Deviation",            measure: "Allowed $/beneficiary vs. peer group",         finding: "Reached 99.7th percentile for allowed $ per beneficiary by month −16.",                   percentile: 99.7, peerDelta: "+847%",    peerDeltaDir: "above", severity: "critical", firstVisible: -16, sparkData: [110,114,120,131,148,172,208,258,318,388,461,531,594,648,692,727,754,773,785,794,800,804,808,811] },
  ],
  s2: [
    { id: "code", category: "Code Concentration",        measure: "Share in top 2 HCPCS codes",                   finding: "79% of allowed dollars in 2 oxygen supply codes. Peer median: 41%.",                       percentile: 95.3, peerDelta: "+93pp",    peerDeltaDir: "above", severity: "high",     firstVisible: -14, sparkData: [40,41,44,48,53,58,63,68,72,75,77,78,79,79,79,79,79,79,79,79,79,79,79,79] },
    { id: "ord",  category: "Orderer Concentration",     measure: "Share from top ordering clinicians",           finding: "3 clinicians generated 68% of orders. All outside beneficiary primary care network.",       percentile: 97.4, peerDelta: "+171pp",   peerDeltaDir: "above", severity: "critical", firstVisible: -11, sparkData: [14,15,17,20,25,31,38,45,52,57,62,65,67,68,68,68,68,68,68,68,68,68,68,68] },
    { id: "vel",  category: "Billing Velocity",          measure: "MoM growth rate",                              finding: "Sustained 28% MoM growth for 7 consecutive months. Peer median: 3.1%.",                   percentile: 98.2, peerDelta: "+803%",    peerDeltaDir: "above", severity: "critical", firstVisible: -13, sparkData: [8,9,11,13,15,19,24,31,44,62,88,124,167,201,238,274,311,342,378,401,429,447,461,478] },
    { id: "bene", category: "Beneficiary Pattern",       measure: "Prior oxygen history, duplicate activity",     finding: "44% of beneficiaries switched from a different active oxygen supplier within 60 days.",     percentile: 93.7, peerDelta: "+2.9×",    peerDeltaDir: "above", severity: "high",     firstVisible: -9,  sparkData: [6,7,8,9,11,14,18,23,28,33,37,40,42,43,44,44,44,44,44,44,44,44,44,44] },
    { id: "peer", category: "Peer Deviation",            measure: "Units per beneficiary vs. peers",              finding: "Units per beneficiary crossed 95th percentile in month −11 and reached 99.4th by −6.",     percentile: 99.4, peerDelta: "+622%",    peerDeltaDir: "above", severity: "high",     firstVisible: -11, sparkData: [2.1,2.2,2.3,2.5,2.7,3.0,3.4,3.9,4.5,5.1,5.7,6.2,6.6,6.9,7.1,7.2,7.3,7.3,7.3,7.3,7.3,7.3,7.3,7.3] },
  ],
  s3: [],
  s4: [],
  s5: [],
}
// Fill out sparse entries
;["s3","s4","s5"].forEach(id => {
  SIGNAL_CONFIGS[id] = SIGNAL_CONFIGS.s1.map(s => ({
    ...s,
    percentile: Math.max(80, s.percentile - 5 + Math.random() * 8),
    sparkData: s.sparkData.map(v => v * (0.7 + Math.random() * 0.5)),
  }))
})

// ── Signal emergence ribbon data ──────────────────────────────────────────────

function makeRibbonData(signals: SignalRow[]) {
  return Array.from({ length: 24 }, (_, i) => {
    const mo = -(24 - i)
    const row: Record<string, number> = { month: mo }
    signals.forEach(s => {
      row[s.id] = mo >= s.firstVisible ? 1 : 0
    })
    return row
  })
}

// ── Colors ────────────────────────────────────────────────────────────────────

const SEVERITY_COLOR = { critical: "#005ea2", high: "rgba(0,94,162,0.7)", moderate: "rgba(0,94,162,0.5)" }
const SIGNAL_COLORS  = ["#005ea2","rgba(0,94,162,0.75)","rgba(0,94,162,0.55)","rgba(0,94,162,0.4)","rgba(0,94,162,0.3)","#005ea2","rgba(0,94,162,0.65)","rgba(0,94,162,0.45)"]
const TIER_COLOR     = { CRITICAL: "#005ea2", HIGH: "rgba(0,94,162,0.7)", ELEVATED: "rgba(0,94,162,0.5)" }

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,94,162,0.25)", backdropFilter: "blur(8px)" }}>
      <div className="font-mono mb-1" style={{ color: "#3d4551", fontSize: "16" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="font-mono" style={{ color: p.color, fontSize: "16" }}>
          {p.name}: <span style={{ fontWeight: 600 }}>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Inline sparkline ──────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={pts} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Expanded detail: timeline + peer chart ────────────────────────────────────

function ExpandedDetail({ signal, timeline, supplierId }: { signal: SignalRow; timeline: ReturnType<typeof makeTimeline>; supplierId: string }) {
  const [metric, setMetric] = useState<"allowed" | "beneficiaries" | "unitsPerBene" | "states" | "orderers">("allowed")

  const metricMeta: Record<string, { label: string; color: string; unit: string }> = {
    allowed:       { label: "Allowed $K",          color: "#005ea2", unit: "K"  },
    beneficiaries: { label: "Unique Beneficiaries", color: "rgba(0,94,162,0.75)", unit: ""   },
    unitsPerBene:  { label: "Units / Beneficiary",  color: "rgba(0,94,162,0.6)",  unit: ""   },
    states:        { label: "States Served",        color: "rgba(0,94,162,0.5)",  unit: ""   },
    orderers:      { label: "Ordering Clinicians",  color: "rgba(0,94,162,0.4)",  unit: ""   },
  }

  const meta = metricMeta[metric]
  const firstDevIdx = timeline.findIndex((_, i) => i >= 2 && (timeline[i].allowed / timeline[0].allowed) > 2.5)

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "12px" }}>

      {/* Timeline chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono" style={{ color: "#1b1b1b", fontSize: "16", letterSpacing: "0.08em" }}>SUPPLIER TIMELINE — MONTHS TO REVOCATION</span>
          <div className="flex gap-1">
            {Object.entries(metricMeta).map(([k, v]) => (
              <button key={k} onClick={() => setMetric(k as typeof metric)}
                className="font-mono px-2 py-0.5 rounded transition-colors"
                style={{ background: metric === k ? `${v.color}18` : "transparent", border: `1px solid ${metric === k ? v.color + "44" : "rgba(0,94,162,0.1)"}`, color: metric === k ? v.color : "#3d4551", fontSize: "16" }}>
                {v.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${supplierId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={meta.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={meta.color} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {firstDevIdx > 0 && (
              <ReferenceLine x={timeline[firstDevIdx]?.month} stroke="rgba(0,94,162,0.35)" strokeDasharray="4 3" label={{ value: "1st deviation", fill: "rgba(0,94,162,0.6)", fontSize: 13, fontFamily: "JetBrains Mono" }} />
            )}
            <ReferenceLine x="REV" stroke="rgba(0,94,162,0.7)" strokeWidth={1.5} label={{ value: "REVOCATION", fill: "#005ea2", fontSize: 13, fontFamily: "JetBrains Mono" }} />
            {signal.firstVisible !== undefined && (
              <ReferenceLine x={`${signal.firstVisible}mo`} stroke="rgba(0,94,162,0.3)" strokeDasharray="3 3" label={{ value: "signal", fill: "rgba(0,94,162,0.5)", fontSize: 13, fontFamily: "JetBrains Mono" }} />
            )}
            <Area type="monotone" dataKey={metric} name={meta.label} stroke={meta.color} strokeWidth={1.5} fill={`url(#grad-${supplierId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Ribbon */}
        <div className="mt-2">
          <div className="font-mono mb-1" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em" }}>SIGNAL EMERGENCE RIBBON</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {SIGNAL_CONFIGS[supplierId].slice(0, 5).map((s, si) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", width: 80, textAlign: "right", flexShrink: 0 }}>{s.category.split(" ")[0]}</div>
                <div style={{ flex: 1, display: "flex", height: "10px", borderRadius: "2px", overflow: "hidden", background: "rgba(0,94,162,0.06)" }}>
                  {Array.from({ length: 24 }, (_, i) => {
                    const mo = -(24 - i)
                    const active = mo >= s.firstVisible
                    return (
                      <div key={i} style={{ flex: 1, background: active ? `${SIGNAL_COLORS[si]}55` : "transparent", borderRight: "1px solid rgba(0,0,0,0.2)", transition: "background 0.3s" }} />
                    )
                  })}
                </div>
                <div className="font-mono" style={{ color: SIGNAL_COLORS[si], fontSize: "16", width: 28, flexShrink: 0 }}>{s.firstVisible}mo</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peer comparison chart */}
      <div>
        <div className="font-mono mb-2" style={{ color: "#1b1b1b", fontSize: "16", letterSpacing: "0.08em" }}>PEER COMPARISON — ALLOWED $ VS. PEER BAND</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`peer-grad-${supplierId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3d4551" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3d4551" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceArea dataKey="peerP25" y1={0} y2={undefined} fill="transparent" />
            <Area type="monotone" dataKey="peerP75" name="Peer P75" stroke="rgba(61,69,81,0.3)" strokeWidth={0} fill="url(#peer-grad-)" fillOpacity={1} legendType="none" />
            <Area type="monotone" dataKey="peerP25" name="Peer P25" stroke="rgba(61,69,81,0.3)" strokeWidth={0} fill="rgba(255,255,255,1)" fillOpacity={1} legendType="none" />
            <Line type="monotone" dataKey="peerMedian" name="Peer Median" stroke="#3d4551" strokeWidth={1} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="allowed" name="Supplier" stroke="#005ea2" strokeWidth={2} dot={false} />
            <ReferenceLine x="REV" stroke="rgba(181,9,9,0.6)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Peer legend + percentile callout */}
        <div className="flex items-center gap-4 mt-2">
          {[
            { label: "Supplier", color: "#005ea2", dash: false },
            { label: "Peer median", color: "#3d4551", dash: true },
            { label: "Peer IQR", color: "#3d4551", dash: false, band: true },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              {l.band
                ? <div style={{ width: 12, height: 6, background: "rgba(61,69,81,0.25)", borderRadius: 1 }} />
                : <div style={{ width: 16, height: l.dash ? 0 : 1.5, borderTop: l.dash ? `1.5px dashed ${l.color}` : "none", background: l.dash ? "transparent" : l.color, borderRadius: 1 }} />
              }
              <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Percentile card */}
        <div className="mt-3 rounded p-3" style={{ background: `${SEVERITY_COLOR[signal.severity]}08`, border: `1px solid ${SEVERITY_COLOR[signal.severity]}22` }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em", marginBottom: "4px" }}>PEAK PERCENTILE REACHED</div>
              <div className="font-mono font-bold" style={{ color: SEVERITY_COLOR[signal.severity], fontSize: "16", lineHeight: 1 }}>
                {signal.percentile.toFixed(1)}
                <span style={{ fontSize: "16", opacity: 0.7 }}>th</span>
              </div>
              <div className="font-mono mt-1" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>vs. matched peer group</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em", marginBottom: "4px" }}>PEER DELTA</div>
              <div className="font-mono font-bold" style={{ color: SEVERITY_COLOR[signal.severity], fontSize: "16" }}>{signal.peerDelta}</div>
              <div className="font-mono mt-1" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>above peer median</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Signal row component ──────────────────────────────────────────────────────

function SignalRowCard({ signal, index, timeline, supplierId }: { signal: SignalRow; index: number; timeline: ReturnType<typeof makeTimeline>; supplierId: string }) {
  const [expanded, setExpanded] = useState(false)
  const color = SIGNAL_COLORS[index % SIGNAL_COLORS.length]
  const sColor = SEVERITY_COLOR[signal.severity]

  return (
    <div
      className="rounded transition-all duration-200"
      style={{
        background: expanded ? "rgba(245,246,247,0.95)" : "rgba(255,255,255,0.7)",
        border: expanded ? `1px solid ${sColor}33` : "1px solid rgba(0,94,162,0.09)",
        overflow: "hidden",
      }}
    >
      {/* Row header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 transition-colors"
        style={{ background: "transparent" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "28px 180px 80px 1fr 110px 80px 60px 32px", alignItems: "center", gap: "12px" }}>

          {/* Index */}
          <span className="font-mono font-bold" style={{ color: "rgba(0,94,162,0.3)", fontSize: "16" }}>
            {String(index + 1).padStart(2, "0")}
          </span>

          {/* Category */}
          <div>
            <div className="font-mono font-semibold" style={{ color: "#162e51", fontSize: "16" }}>{signal.category}</div>
            <div className="font-mono mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{signal.measure}</div>
          </div>

          {/* Sparkline */}
          <Sparkline data={signal.sparkData} color={color} />

          {/* Finding */}
          <span className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.5 }}>{signal.finding}</span>

          {/* First visible */}
          <div style={{ textAlign: "center" }}>
            <div className="font-mono font-bold" style={{ color: "#005ea2", fontSize: "16" }}>{signal.firstVisible}mo</div>
            <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>before revocation</div>
          </div>

          {/* Percentile badge */}
          <div className="flex justify-center">
            <span className="font-mono font-bold px-2 py-1 rounded"
              style={{ background: `${sColor}14`, border: `1px solid ${sColor}33`, color: sColor, fontSize: "16" }}>
              {signal.percentile.toFixed(1)}th
            </span>
          </div>

          {/* Severity */}
          <div className="flex justify-center">
            <span className="font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${sColor}10`, color: sColor, fontSize: "16", letterSpacing: "0.06em" }}>
              {signal.severity.toUpperCase()}
            </span>
          </div>

          {/* Expand toggle */}
          <div className="flex justify-center">
            <span style={{ color: expanded ? "#005ea2" : "#3d4551", fontSize: "16", transition: "transform 0.2s", display: "block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(0,94,162,0.08)" }}>
          <ExpandedDetail signal={signal} timeline={timeline} supplierId={supplierId} />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreRevocationPatterns() {
  const [selectedId, setSelectedId] = useState("s1")

  const supplier  = SUPPLIERS.find(s => s.id === selectedId)!
  const signals   = SIGNAL_CONFIGS[selectedId] ?? []
  const timeline  = makeTimeline(selectedId)

  const criticalCount  = signals.filter(s => s.severity === "critical").length
  const earliestSignal = signals.length ? Math.min(...signals.map(s => s.firstVisible)) : 0
  const maxPercentile  = signals.length ? Math.max(...signals.map(s => s.percentile)) : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Page header */}
      <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(61,69,81,0.08)", color: "#3d4551", border: "1px solid rgba(61,69,81,0.2)", fontSize: "13", letterSpacing: "0.12em" }}>◆ SUPERVISED LEARNING AGENT</span>
              <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(61,69,81,0.08)", color: "#3d4551", border: "1px solid rgba(61,69,81,0.2)", fontSize: "13", letterSpacing: "0.12em" }}>◆ UTILIZATION & BILLING AGENT</span>
            </div>
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>WHAT CLAIMS PATTERNS WERE VISIBLE BEFORE REVOCATION?</h2>
            <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Retrospective signal analysis · pre-revocation claims patterns · prioritization only</p>
          </div>
        </div>
      </div>

      {/* Supplier selector */}
      <div className="rounded p-3" style={{ background: "rgba(245,246,247,0.8)", border: "1px solid rgba(0,94,162,0.1)" }}>
        <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>SELECT SUPPLIER FROM RETROSPECTIVE COHORT</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SUPPLIERS.map(s => {
            const tc = TIER_COLOR[s.riskTier]
            const sel = s.id === selectedId
            return (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className="rounded px-3 py-2 text-left transition-all"
                style={{ background: sel ? `${tc}12` : "rgba(255,255,255,0.6)", border: `1px solid ${sel ? tc + "44" : "rgba(0,94,162,0.1)"}`, minWidth: 180 }}>
                <div className="font-mono font-semibold" style={{ color: sel ? tc : "#1b1b1b", fontSize: "16" }}>{s.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{s.type}</span>
                  <span style={{ color: "rgba(61,69,81,0.4)" }}>·</span>
                  <span className="font-mono px-1 rounded" style={{ background: `${tc}12`, color: tc, fontSize: "16" }}>{s.riskTier}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Key finding callout */}
      <div className="rounded p-4" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.18)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "start" }}>
          <div>
            <div className="font-mono mb-2" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.12em" }}>KEY FINDING — {supplier.name.toUpperCase()}</div>
            <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "16", lineHeight: 1.7 }}>
              The supplier first became materially distinguishable from peers{" "}
              <span style={{ color: "#005ea2", fontWeight: 700 }}>{Math.abs(earliestSignal)} months before revocation</span>,
              driven by {supplier.primarySignal.toLowerCase()}.
              {criticalCount > 0 && <> <span style={{ color: "rgba(0,94,162,0.8)", fontWeight: 600 }}>{criticalCount} critical-severity signal{criticalCount > 1 ? "s" : ""}</span> were present in the pre-revocation window.</>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
            {[
              { label: "Earliest Signal",   value: `${Math.abs(earliestSignal)}mo`, sub: "before revocation", color: "#005ea2" },
              { label: "Peak Percentile",    value: `${maxPercentile.toFixed(1)}th`, sub: "vs. peer group",    color: "#005ea2" },
              { label: "Critical Signals",   value: String(criticalCount),           sub: "identified",         color: "#005ea2" },
            ].map(m => (
              <div key={m.label} className="rounded px-3 py-2 text-center" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,94,162,0.1)", minWidth: 80 }}>
                <div className="font-mono font-bold" style={{ color: m.color, fontSize: "16", lineHeight: 1 }}>{m.value}</div>
                <div className="font-mono mt-1" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{m.label}</div>
                <div className="font-mono" style={{ color: "rgba(61,69,81,0.6)", fontSize: "16" }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signal table header */}
      <div style={{ display: "grid", gridTemplateColumns: "28px 180px 80px 1fr 110px 80px 60px 32px", gap: "12px", padding: "0 16px" }}>
        {["#", "SIGNAL CATEGORY", "TREND", "FINDING", "FIRST VISIBLE", "PERCENTILE", "SEVERITY", ""].map((h, i) => (
          <span key={i} className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em" }}>{h}</span>
        ))}
      </div>

      {/* Signal rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {signals.map((sig, i) => (
          <SignalRowCard key={sig.id} signal={sig} index={i} timeline={timeline} supplierId={selectedId} />
        ))}
      </div>


    </div>
  )
}
