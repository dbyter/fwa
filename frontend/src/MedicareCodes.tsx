// v2
import { useState, useMemo } from "react"

// ── DRG Code Definitions ──────────────────────────────────────────────────────

export const DRG_CODES = [
  { code: "DRG-291", label: "Heart Failure & Shock w/ MCC", mdc: "05", category: "Cardiovascular" },
  { code: "DRG-292", label: "Heart Failure & Shock w/ CC", mdc: "05", category: "Cardiovascular" },
  { code: "DRG-247", label: "Percutaneous Cardiovascular Proc w/ DES", mdc: "05", category: "Cardiovascular" },
  { code: "DRG-469", label: "Major Joint Replacement w/ MCC", mdc: "08", category: "Musculoskeletal" },
  { code: "DRG-470", label: "Major Joint Replacement w/o MCC", mdc: "08", category: "Musculoskeletal" },
  { code: "DRG-460", label: "Spinal Fusion w/ CC/MCC", mdc: "08", category: "Musculoskeletal" },
  { code: "DRG-871", label: "Septicemia w/ MV >96hrs", mdc: "18", category: "Infectious Disease" },
  { code: "DRG-872", label: "Septicemia w/o MV >96hrs w/ MCC", mdc: "18", category: "Infectious Disease" },
  { code: "DRG-177", label: "Respiratory Infections & Inflammations w/ MCC", mdc: "04", category: "Respiratory" },
  { code: "DRG-194", label: "Simple Pneumonia & Pleurisy w/ MCC", mdc: "04", category: "Respiratory" },
  { code: "DRG-682", label: "Renal Failure w/ MCC", mdc: "11", category: "Renal" },
  { code: "DRG-690", label: "Kidney & Urinary Tract Infections w/ MCC", mdc: "11", category: "Renal" },
  { code: "DRG-603", label: "Cellulitis w/ MCC", mdc: "09", category: "Skin" },
  { code: "DRG-392", label: "Esophagitis, Gastroenteritis w/ MCC", mdc: "06", category: "Digestive" },
  { code: "DRG-481", label: "Hip & Femur Procedures Except Major Joint w/ MCC", mdc: "08", category: "Musculoskeletal" },
  { code: "DRG-305", label: "Hypertension w/ MCC", mdc: "05", category: "Cardiovascular" },
  { code: "DRG-065", label: "Intracranial Hemorrhage/Cerebral Infarction w/ MCC", mdc: "01", category: "Nervous System" },
  { code: "DRG-312", label: "Syncope & Collapse", mdc: "05", category: "Cardiovascular" },
  { code: "DRG-378", label: "GI Hemorrhage w/ MCC", mdc: "06", category: "Digestive" },
  { code: "DRG-853", label: "Infectious & Parasitic Diseases w/ OR Proc w/ MCC", mdc: "18", category: "Infectious Disease" },
]

// ── State fraud risk (historical fraud prevalence by state, 0–100) ────────────

const STATE_FRAUD_RISK: Record<string, number> = {
  FL: 94, TX: 89, CA: 85, NY: 82, LA: 91, MS: 87, GA: 80, NJ: 76,
  IL: 72, OH: 68, PA: 65, MI: 61, NC: 58, AZ: 70, TN: 67, MO: 55,
  IN: 52, WA: 50, VA: 58, MA: 63, CO: 48, SC: 60, AL: 74, KY: 66,
  MN: 44, WI: 46, MD: 64, OR: 42, OK: 62, NV: 73, CT: 55, IA: 38,
  AR: 69, KS: 40, UT: 43, NM: 65, NE: 36, WV: 59, ID: 35, ME: 39,
  NH: 37, HI: 48, RI: 52, MT: 32, DE: 53, SD: 30, ND: 28, VT: 34,
  WY: 29, AK: 41, DC: 77,
}

// ── Per-state cost multipliers (base × multiplier) ────────────────────────────

const STATE_COST_MULTIPLIER: Record<string, number> = {
  CA: 1.42, NY: 1.38, MA: 1.35, CT: 1.28, NJ: 1.31, MD: 1.26, WA: 1.22,
  CO: 1.18, IL: 1.20, PA: 1.16, OR: 1.14, MN: 1.12, WI: 1.08, VA: 1.15,
  TX: 1.10, FL: 1.13, GA: 1.07, NC: 1.05, AZ: 1.09, NV: 1.17, OH: 1.04,
  MI: 1.06, IN: 1.02, MO: 1.00, TN: 0.98, SC: 0.97, AL: 0.94, LA: 1.03,
  MS: 0.92, AR: 0.91, KY: 0.96, WV: 0.93, OK: 0.95, KS: 0.90, NE: 0.88,
  IA: 0.87, NM: 0.99, UT: 1.01, ID: 0.86, MT: 0.84, WY: 0.83, ND: 0.82,
  SD: 0.81, ME: 0.89, NH: 0.92, VT: 0.85, RI: 1.19, HI: 1.32, AK: 1.29,
  DE: 1.10, DC: 1.44,
}

// ── Base payment rates by DRG code ────────────────────────────────────────────

const DRG_BASE_RATES: Record<string, number> = {
  "DRG-291": 8420,  "DRG-292": 5180,  "DRG-247": 22400, "DRG-469": 34200,
  "DRG-470": 16800, "DRG-460": 41500, "DRG-871": 48200, "DRG-872": 19600,
  "DRG-177": 14800, "DRG-194": 9200,  "DRG-682": 12400, "DRG-690": 7800,
  "DRG-603": 6400,  "DRG-392": 5900,  "DRG-481": 28600, "DRG-305": 7100,
  "DRG-065": 18300, "DRG-312": 4200,  "DRG-378": 11600, "DRG-853": 38900,
}

// Per-code variance seeds — adds regional variation beyond the base multiplier
const CODE_STATE_VARIANCE: Record<string, Record<string, number>> = {
  "DRG-291": { FL: 1.18, TX: 1.12, LA: 1.22, MS: 1.09, CA: 0.96, NY: 1.04 },
  "DRG-470": { FL: 1.24, TX: 1.08, CA: 1.03, NJ: 1.15, AL: 0.88, MS: 1.19 },
  "DRG-871": { FL: 1.31, LA: 1.28, TX: 1.17, GA: 1.13, NY: 0.94, CA: 0.97 },
  "DRG-460": { FL: 1.20, TX: 1.14, CA: 0.99, NV: 1.22, LA: 1.16 },
  "DRG-247": { FL: 1.27, TX: 1.19, LA: 1.23, MS: 1.14, NJ: 1.08 },
  "DRG-682": { FL: 1.22, LA: 1.25, MS: 1.18, TX: 1.10, GA: 1.12 },
  "DRG-481": { FL: 1.19, TX: 1.11, LA: 1.21, AL: 1.08, GA: 1.13 },
}

function getStateCost(code: string, state: string): number {
  const base = DRG_BASE_RATES[code] ?? 10000
  const mult = STATE_COST_MULTIPLIER[state] ?? 1.0
  const variance = CODE_STATE_VARIANCE[code]?.[state] ?? 1.0
  // Small deterministic jitter per state+code to make values feel real
  const seed = (code.charCodeAt(4) + state.charCodeAt(0) * 7 + state.charCodeAt(1) * 3) % 100
  const jitter = 1 + (seed - 50) / 1000
  return Math.round(base * mult * variance * jitter)
}

// ── State grid layout (same as overview) ─────────────────────────────────────

const STATE_GRID: [string, number, number][] = [
  ["AK", 0, 0], ["ME", 0, 10],
  ["WA", 1, 0], ["MT", 1, 1], ["ND", 1, 2], ["MN", 1, 3], ["WI", 1, 4], ["MI", 1, 5], ["NY", 1, 6], ["VT", 1, 7], ["NH", 1, 8],
  ["OR", 2, 0], ["ID", 2, 1], ["WY", 2, 2], ["SD", 2, 3], ["IA", 2, 4], ["IL", 2, 5], ["IN", 2, 6], ["OH", 2, 7], ["PA", 2, 8], ["NJ", 2, 9], ["CT", 2, 10], ["RI", 2, 11],
  ["CA", 3, 0], ["NV", 3, 1], ["UT", 3, 2], ["CO", 3, 3], ["NE", 3, 4], ["MO", 3, 5], ["KY", 3, 6], ["WV", 3, 7], ["VA", 3, 8], ["MD", 3, 9], ["DE", 3, 10], ["DC", 3, 11],
  ["AZ", 4, 1], ["NM", 4, 2], ["KS", 4, 3], ["AR", 4, 4], ["TN", 4, 5], ["NC", 4, 6], ["SC", 4, 7],
  ["TX", 5, 2], ["OK", 5, 3], ["LA", 5, 4], ["MS", 5, 5], ["AL", 5, 6], ["GA", 5, 7], ["FL", 5, 8],
  ["HI", 6, 0],
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCostColor(cost: number, min: number, max: number): string {
  const t = (cost - min) / (max - min)
  if (t >= 0.8) return "#005ea2"
  if (t >= 0.6) return "#005ea2"
  if (t >= 0.4) return "#757575"
  if (t >= 0.2) return "#3d4551"
  return "#e6f1f8"
}

function getFraudOverlayColor(fraudRisk: number): string | null {
  if (fraudRisk >= 85) return "rgba(181,9,9,0.65)"
  if (fraudRisk >= 70) return "rgba(180,95,6,0.5)"
  if (fraudRisk >= 55) return "rgba(255,190,46,0.35)"
  return null
}

function fmt(n: number): string {
  return "$" + n.toLocaleString()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MedicareCodes() {
  const [selectedCode, setSelectedCode] = useState(DRG_CODES[0])
  const [selectedState, setSelectedState] = useState<string | null>("FL")
  const [showFraud, setShowFraud] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [zoom, setZoom] = useState(1.6)
  const MIN_ZOOM = 0.8
  const MAX_ZOOM = 3.5

  const allCosts = useMemo(
    () => Object.keys(STATE_COST_MULTIPLIER).map(s => getStateCost(selectedCode.code, s)),
    [selectedCode]
  )
  const minCost = Math.min(...allCosts)
  const maxCost = Math.max(...allCosts)
  const avgCost = Math.round(allCosts.reduce((a, b) => a + b, 0) / allCosts.length)

  const selectedCost = selectedState ? getStateCost(selectedCode.code, selectedState) : null
  const selectedFraud = selectedState ? (STATE_FRAUD_RISK[selectedState] ?? 0) : null

  const filteredCodes = DRG_CODES.filter(
    d => d.code.toLowerCase().includes(search.toLowerCase()) || d.label.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase())
  )

  const categories = Array.from(new Set(DRG_CODES.map(d => d.category)))

  const BASE_CELL = 44
  const BASE_GAP = 3
  const CELL = Math.round(BASE_CELL * zoom)
  const GAP = Math.round(BASE_GAP * zoom)
  const maxCol = Math.max(...STATE_GRID.map(([, , c]) => c))
  const maxRow = Math.max(...STATE_GRID.map(([, r]) => r))
  const W = (maxCol + 1) * (CELL + GAP)
  const H = (maxRow + 1) * (CELL + GAP)

  // High-cost / fraud outlier states
  const costThreshold = minCost + (maxCost - minCost) * 0.75
  const outlierStates = STATE_GRID
    .filter(([abbr]) => abbr && getStateCost(selectedCode.code, abbr) >= costThreshold && (STATE_FRAUD_RISK[abbr] ?? 0) >= 70)
    .map(([abbr]) => abbr)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>MEDICARE CODE FEE SCHEDULE</h1>
          <p className="font-mono text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            DRG average allowed amounts by state · Cross-referenced with historical fraud prevalence
          </p>
        </div>

        {/* Fraud toggle */}
        <button
          onClick={() => setShowFraud(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-all"
          style={{
            background: showFraud ? "rgba(0,94,162,0.1)" : "rgba(0,94,162,0.05)",
            border: `1px solid ${showFraud ? "rgba(0,94,162,0.35)" : "rgba(0,94,162,0.2)"}`,
            color: showFraud ? "#005ea2" : "var(--muted-foreground)",
          }}
        >
          <span>{showFraud ? "◈" : "○"}</span>
          FRAUD OVERLAY {showFraud ? "ON" : "OFF"}
        </button>
      </div>

      {/* Code Selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded text-left transition-all"
          style={{
            background: "var(--card)",
            border: "1px solid rgba(0,94,162,0.25)",
            boxShadow: dropdownOpen ? "0 0 20px rgba(0,94,162,0.1)" : "none",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.1)", color: "#005ea2", border: "1px solid rgba(0,94,162,0.25)" }}>
              {selectedCode.code}
            </span>
            <span className="font-mono text-sm" style={{ color: "#162e51" }}>{selectedCode.label}</span>
            <span className="font-mono text-sm px-2 py-0.5 rounded" style={{ background: "rgba(107,70,193,0.1)", color: "#6b46c1", border: "1px solid rgba(107,70,193,0.2)", fontSize: "18" }}>
              MDC {selectedCode.mdc} · {selectedCode.category}
            </span>
          </div>
          <span style={{ color: "var(--muted-foreground)", fontSize: "18" }}>{dropdownOpen ? "▲" : "▼"}</span>
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 z-50 mt-1 rounded overflow-hidden"
            style={{ background: "#f5f6f7", border: "1px solid rgba(0,94,162,0.2)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}
          >
            <div className="p-2" style={{ borderBottom: "1px solid rgba(0,94,162,0.1)" }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search code or description..."
                className="w-full bg-transparent font-mono text-xs outline-none px-2 py-1.5 rounded"
                style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.15)", color: "#1b1b1b" }}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              {categories.map(cat => {
                const codes = filteredCodes.filter(d => d.category === cat)
                if (!codes.length) return null
                return (
                  <div key={cat}>
                    <div className="px-4 py-1.5 font-mono" style={{ background: "rgba(0,94,162,0.04)", color: "var(--muted-foreground)", fontSize: "24px", letterSpacing: "0.12em" }}>
                      {cat.toUpperCase()}
                    </div>
                    {codes.map(d => (
                      <button
                        key={d.code}
                        onClick={() => { setSelectedCode(d); setDropdownOpen(false); setSearch("") }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cyan-900/20"
                        style={{ background: selectedCode.code === d.code ? "rgba(0,94,162,0.08)" : "transparent" }}
                      >
                        <span className="font-mono text-sm font-bold" style={{ color: "#005ea2", minWidth: 80 }}>{d.code}</span>
                        <span className="font-mono text-sm" style={{ color: "#1b1b1b" }}>{d.label}</span>
                        <span className="ml-auto font-mono text-xs" style={{ color: "#3d4551" }}>{fmt(DRG_BASE_RATES[d.code] ?? 0)} base</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "NATIONAL AVG", value: fmt(avgCost), color: "#005ea2" },
          { label: "LOWEST STATE", value: fmt(minCost), sub: Object.keys(STATE_COST_MULTIPLIER).find(s => getStateCost(selectedCode.code, s) === minCost) ?? "—", color: "#005ea2" },
          { label: "HIGHEST STATE", value: fmt(maxCost), sub: Object.keys(STATE_COST_MULTIPLIER).find(s => getStateCost(selectedCode.code, s) === maxCost) ?? "—", color: "#005ea2" },
          { label: "HIGH-RISK STATES", value: String(outlierStates.length), sub: outlierStates.join(", ") || "None", color: "#005ea2" },
        ].map(k => (
          <div key={k.label} className="bracket-card p-4 rounded flex flex-col gap-1" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <span className="font-mono text-sm tracking-widest" style={{ color: "var(--muted-foreground)", fontSize: "24px" }}>{k.label}</span>
            <span className="font-display text-xl font-bold" style={{ color: k.color }}>{k.value}</span>
            {k.sub && <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>{k.sub}</span>}
          </div>
        ))}
      </div>

      {/* Map + Detail */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 260px" }}>

        {/* Heatmap */}
        <div className="bracket-card scanlines relative rounded p-5" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>STATE FEE SCHEDULE — {selectedCode.code}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.2).toFixed(1)))}
                className="w-7 h-7 rounded flex items-center justify-center font-mono text-sm transition-colors"
                style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#757575" }}
              >−</button>
              <span className="font-mono text-sm w-10 text-center" style={{ color: "#005ea2" }}>{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.2).toFixed(1)))}
                className="w-7 h-7 rounded flex items-center justify-center font-mono text-sm transition-colors"
                style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)", color: "#757575" }}
              >+</button>
              <button
                onClick={() => setZoom(1.6)}
                className="ml-1 px-2 h-7 rounded font-mono transition-colors"
                style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.15)", color: "var(--muted-foreground)", fontSize: "18" }}
              >RESET</button>
            </div>
          </div>

          {/* Legend row */}
          <div className="flex items-center gap-6 mb-5">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>COST</span>
              <div className="flex">
                {["#e6f1f8", "#3d4551", "#757575", "#005ea2", "#005ea2"].map(c => (
                  <div key={c} className="w-5 h-3" style={{ background: c }} />
                ))}
              </div>
              <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>{fmt(minCost)} → {fmt(maxCost)}</span>
            </div>
            {showFraud && (
              <div className="flex items-center gap-3">
                {[
                  { label: "CRITICAL FRAUD", color: "rgba(181,9,9,0.65)" },
                  { label: "HIGH FRAUD", color: "rgba(180,95,6,0.5)" },
                  { label: "ELEVATED", color: "rgba(255,190,46,0.35)" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ background: l.color, border: "1px solid rgba(255,255,255,0.15)" }} />
                    <span className="font-mono" style={{ fontSize: "24px", color: "var(--muted-foreground)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid map */}
          <div
            className="overflow-auto"
            style={{ maxHeight: 480 }}
            onWheel={e => {
              e.preventDefault()
              setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z - e.deltaY * 0.001).toFixed(2))))
            }}
          >
            <div className="relative" style={{ width: W, height: H }}>
              {STATE_GRID.map(([abbr, row, col], i) => {
                if (!abbr) return null
                const cost = getStateCost(selectedCode.code, abbr)
                const fraud = STATE_FRAUD_RISK[abbr] ?? 0
                const fraudOverlay = showFraud ? getFraudOverlayColor(fraud) : null
                const costColor = getCostColor(cost, minCost, maxCost)
                const isSelected = selectedState === abbr
                const x = col * (CELL + GAP)
                const y = row * (CELL + GAP)

                return (
                  <button
                    key={`${abbr}-${i}`}
                    onClick={() => setSelectedState(abbr)}
                    className="absolute transition-all duration-150 rounded-sm flex items-center justify-center font-mono font-medium cursor-pointer overflow-hidden"
                    style={{
                      left: x, top: y, width: CELL, height: CELL,
                      background: costColor,
                      border: isSelected ? `2px solid #fff` : `1px solid ${costColor}88`,
                      fontSize: `${Math.round(8 * zoom)}px`,
                      letterSpacing: "0.02em",
                      color: isSelected ? "#fff" : "rgba(255,255,255,0.75)",
                      transform: isSelected ? "scale(1.12)" : undefined,
                      zIndex: isSelected ? 10 : 1,
                      boxShadow: isSelected ? `0 0 12px rgba(255,255,255,0.3)` : undefined,
                    }}
                  >
                    {/* Fraud overlay */}
                    {fraudOverlay && (
                      <div className="absolute inset-0 pointer-events-none" style={{ background: fraudOverlay }} />
                    )}
                    <span style={{ position: "relative", zIndex: 1 }}>{abbr}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* State Detail Panel */}
        <div className="flex flex-col gap-3">
          {selectedState && selectedCost !== null ? (
            <div className="bracket-card rounded p-4 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.2)", boxShadow: "0 0 20px rgba(0,94,162,0.06)" }}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold" style={{ color: "#005ea2" }}>{selectedState}</span>
                {selectedFraud !== null && selectedFraud >= 55 && (
                  <span
                    className="font-mono text-sm px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(0,94,162,0.08)",
                      color: "#005ea2",
                      border: "1px solid rgba(0,94,162,0.25)",
                      fontSize: "24px",
                    }}
                  >
                    {selectedFraud >= 85 ? "CRITICAL FRAUD RISK" : selectedFraud >= 70 ? "HIGH FRAUD RISK" : "ELEVATED RISK"}
                  </span>
                )}
              </div>

              <div>
                <div className="font-mono text-sm" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>ALLOWED AMOUNT</div>
                <div className="font-display text-2xl font-bold mt-0.5" style={{ color: "#005ea2" }}>{fmt(selectedCost)}</div>
                <div className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>
                  {selectedCost > avgCost
                    ? `+${fmt(selectedCost - avgCost)} above national avg`
                    : `${fmt(avgCost - selectedCost)} below national avg`}
                </div>
              </div>

              {/* Cost vs avg bar */}
              <div>
                <div className="font-mono text-sm mb-1" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>VS NATIONAL RANGE</div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,94,162,0.1)" }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${((selectedCost - minCost) / (maxCost - minCost)) * 100}%`, background: getCostColor(selectedCost, minCost, maxCost) }}
                  />
                  {/* Avg marker */}
                  <div
                    className="absolute top-0 h-full w-0.5"
                    style={{ left: `${((avgCost - minCost) / (maxCost - minCost)) * 100}%`, background: "rgba(255,255,255,0.4)" }}
                  />
                </div>
                <div className="flex justify-between font-mono mt-0.5" style={{ fontSize: "24px", color: "var(--muted-foreground)" }}>
                  <span>{fmt(minCost)}</span>
                  <span>avg</span>
                  <span>{fmt(maxCost)}</span>
                </div>
              </div>

              {selectedFraud !== null && (
                <div>
                  <div className="font-mono text-sm mb-1" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>HISTORICAL FRAUD INDEX</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,94,162,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedFraud}%`,
                          background: "#005ea2",
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm font-bold" style={{ color: "#005ea2" }}>
                      {selectedFraud}/100
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2" style={{ borderTop: "1px solid rgba(0,94,162,0.1)" }}>
                <div className="font-mono text-sm mb-1.5" style={{ color: "var(--muted-foreground)", fontSize: "18" }}>CODE DETAILS</div>
                <div className="font-mono text-sm" style={{ color: "#1b1b1b", lineHeight: 1.6 }}>
                  <div><span style={{ color: "var(--muted-foreground)" }}>DRG: </span>{selectedCode.code}</div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>MDC: </span>{selectedCode.mdc}</div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>Category: </span>{selectedCode.category}</div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>Base Rate: </span>{fmt(DRG_BASE_RATES[selectedCode.code] ?? 0)}</div>
                  <div><span style={{ color: "var(--muted-foreground)" }}>State Factor: </span>×{(STATE_COST_MULTIPLIER[selectedState] ?? 1).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bracket-card rounded p-4 flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.1)", minHeight: 200 }} />
          )}

          {/* Top 5 outliers */}
          <div className="rounded p-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="font-mono text-sm mb-2 tracking-widest" style={{ color: "#005ea2", fontSize: "24px" }}>HIGH-COST + HIGH-FRAUD STATES</div>
            {STATE_GRID
              .filter(([abbr]) => abbr && (STATE_FRAUD_RISK[abbr] ?? 0) >= 70)
              .sort((a, b) => getStateCost(selectedCode.code, b[0]) - getStateCost(selectedCode.code, a[0]))
              .slice(0, 6)
              .map(([abbr]) => {
                const cost = getStateCost(selectedCode.code, abbr)
                const fraud = STATE_FRAUD_RISK[abbr] ?? 0
                return (
                  <button
                    key={abbr}
                    onClick={() => setSelectedState(abbr)}
                    className="w-full flex items-center justify-between py-1.5 px-1 rounded transition-colors"
                    style={{ borderBottom: "1px solid rgba(0,94,162,0.06)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold" style={{ color: "#005ea2" }}>{abbr}</span>
                      <div className="w-8 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,94,162,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${fraud}%`, background: "#005ea2" }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm" style={{ color: "#1b1b1b" }}>{fmt(cost)}</span>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
