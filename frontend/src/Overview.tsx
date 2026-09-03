import { useState } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

const CLAIM_TYPES = [
  "All Fraud Types",
  "Ghost Patient",
  "Rx Upcoding",
  "Kickback Scheme",
  "Duplicate Billing",
  "Identity Fraud",
  "Pharmacy Fraud",
  "DME Fraud",
  "Modifier Abuse",
]

// Risk data per state per claim type (0–100 scale)
const STATE_RISK: Record<string, Record<string, number>> = {
  "All Fraud Types":  { FL:98,TX:91,LA:87,GA:84,NY:89,MS:94,CA:82,IL:78,OH:75,PA:72,TN:69,NC:71,AZ:68,MI:73,NJ:76,SC:62,AL:58,AR:55,CO:48,IN:51,KY:53,MO:56,OK:49,WA:44,MD:47,VA:52,NV:41,MN:38,WI:35,IA:31,KS:28,NE:25,SD:19,ND:16,MT:14,WY:12,ID:11,UT:22,OR:33,NM:27,WV:24,DE:21,CT:39,MA:42,RI:18,NH:15,VT:12,ME:10,AK:8,HI:13 },
  "Ghost Patient":    { FL:97,MS:92,LA:89,GA:81,TX:74,NY:62,CA:55,AL:48,SC:51,AR:44,TN:57,NC:53,MI:41,OH:38,IN:35,PA:29,IL:33,NJ:27,AZ:24,CO:19,MO:22,OK:18,WA:14,MD:16,VA:21,NV:12,MN:9,WI:7,IA:8,KS:6,NE:5,SD:4,ND:3,MT:3,WY:2,ID:2,UT:7,OR:11,NM:9,WV:8,DE:5,CT:12,MA:15,RI:4,NH:3,VT:2,ME:2,AK:1,HI:3 },
  "Rx Upcoding":      { TX:96,CA:88,FL:79,NY:85,NJ:83,IL:77,OH:71,PA:69,MA:74,CT:68,MD:65,VA:61,WA:57,CO:52,AZ:48,GA:44,NC:41,MI:53,MN:38,WI:35,IN:33,KY:31,TN:28,MO:24,OR:29,NV:22,UT:18,NM:15,ID:11,MT:9,WY:7,SD:6,ND:5,NE:12,KS:9,IA:8,OK:19,AR:14,LA:21,MS:17,AL:13,SC:11,DE:9,RI:7,NH:6,VT:4,ME:5,AK:3,HI:8 },
  "Kickback Scheme":  { FL:95,NY:91,NJ:88,CA:84,TX:79,IL:76,PA:72,MD:68,MA:65,LA:82,GA:61,OH:58,MI:54,VA:51,WA:47,AZ:43,CO:39,NV:35,NC:41,SC:38,TN:33,IN:29,MO:25,KY:22,OR:19,UT:16,WI:13,MN:11,IA:8,KS:6,NE:5,OK:21,AR:18,MS:24,AL:19,DE:14,CT:28,RI:9,NH:7,VT:5,ME:6,MT:4,WY:3,SD:4,ND:3,ID:3,NM:12,WV:11,HI:6,AK:4 },
  "Duplicate Billing":{ GA:93,FL:87,TX:83,NY:79,CA:76,OH:72,IL:68,PA:65,NC:61,VA:57,MD:53,IN:49,MI:46,TN:54,KY:41,MO:38,WI:34,MN:31,AZ:28,CO:25,WA:22,OR:18,NV:15,NJ:62,MA:43,CT:37,SC:44,AL:35,AR:29,LA:48,MS:39,OK:24,KS:19,NE:15,IA:12,SD:8,ND:6,MT:5,WY:4,ID:7,UT:11,NM:14,WV:17,DE:11,RI:7,NH:5,VT:4,ME:5,AK:3,HI:5 },
  "Identity Fraud":   { NY:96,CA:92,TX:88,FL:84,NJ:89,IL:81,MA:77,MD:73,WA:68,VA:64,GA:59,PA:55,OH:51,MI:47,CO:43,AZ:39,NV:35,CT:42,OR:31,MN:27,WI:23,IN:19,NC:33,SC:16,TN:22,KY:14,MO:17,LA:28,MS:13,AL:11,AR:8,OK:12,KS:7,NE:5,IA:4,SD:3,ND:2,MT:2,WY:1,ID:3,UT:9,NM:8,WV:7,DE:12,RI:9,NH:6,VT:3,ME:4,AK:5,HI:11 },
  "Pharmacy Fraud":   { CA:95,FL:91,TX:87,NY:83,PA:79,OH:75,IL:72,NJ:78,MI:68,GA:64,NC:59,VA:55,MD:51,MA:67,WA:47,IN:43,TN:48,KY:38,MO:34,WI:29,MN:25,AZ:31,CO:27,LA:42,SC:33,AL:28,AR:23,MS:31,OR:19,NV:15,CT:36,UT:12,NM:9,ID:7,MT:5,WY:4,SD:4,ND:3,NE:8,KS:6,IA:5,OK:17,WV:11,DE:9,RI:6,NH:5,VT:3,ME:4,AK:4,HI:9 },
  "DME Fraud":        { FL:99,TX:94,LA:91,MS:96,GA:88,CA:79,NY:82,NJ:77,AL:73,SC:69,NC:65,TN:71,AR:58,OK:54,AZ:51,IL:64,OH:61,MI:58,PA:55,IN:47,KY:44,MO:41,VA:38,MD:34,WA:29,CO:26,NV:22,WI:18,MN:15,MN:14,IA:11,KS:8,NE:6,SD:5,ND:4,MT:3,WY:2,ID:4,UT:9,NM:16,WV:13,DE:7,CT:21,MA:24,RI:5,NH:4,VT:2,ME:3,AK:2,HI:4 },
  "Modifier Abuse":   { FL:94,TX:89,CA:85,NY:81,NJ:86,OH:77,IL:73,PA:69,GA:65,NC:71,VA:61,MD:57,MA:63,MI:59,IN:53,WI:47,MN:43,CO:38,WA:34,AZ:29,OR:25,NV:21,CT:39,TN:55,KY:44,MO:36,LA:48,SC:42,AL:35,AR:28,MS:38,OK:31,KS:21,NE:15,IA:11,SD:7,ND:5,MT:4,WY:3,ID:6,UT:13,NM:17,WV:19,DE:14,RI:8,NH:6,VT:4,ME:5,AK:3,HI:7 },
}

// State FIPS → abbreviation map (needed to join topojson)
const FIPS_TO_STATE: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","12":"FL","13":"GA",
  "15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ",
  "35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC",
  "46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY",
}


function riskToColor(risk: number): string {
  if (risk >= 85) return "#b50909"
  if (risk >= 70) return "#b45f06"
  if (risk >= 50) return "#b45f06"
  if (risk >= 30) return "#3d4551"
  return "#162e51"
}

function riskToFill(risk: number): string {
  if (risk >= 85) return "rgba(181,9,9,0.55)"
  if (risk >= 70) return "rgba(180,95,6,0.45)"
  if (risk >= 50) return "rgba(180,95,6,0.35)"
  if (risk >= 30) return "rgba(61,69,81,0.3)"
  return "rgba(230,241,248,0.5)"
}

const fraudTrendData = [
  { month: "JAN", blocked: 8.2,  detected: 12.4 },
  { month: "FEB", blocked: 11.5, detected: 16.1 },
  { month: "MAR", blocked: 14.8, detected: 19.7 },
  { month: "APR", blocked: 18.3, detected: 24.2 },
  { month: "MAY", blocked: 22.1, detected: 28.9 },
  { month: "JUN", blocked: 27.4, detected: 34.5 },
  { month: "JUL", blocked: 31.9, detected: 40.2 },
  { month: "AUG", blocked: 38.6, detected: 47.8 },
  { month: "SEP", blocked: 44.1, detected: 53.3 },
  { month: "OCT", blocked: 51.7, detected: 61.9 },
  { month: "NOV", blocked: 58.2, detected: 70.4 },
  { month: "DEC", blocked: 64.8, detected: 78.1 },
]

const fraudByCategory = [
  { category: "Billing",        value: 42.3 },
  { category: "Rx Abuse",       value: 31.7 },
  { category: "Ghost Patients", value: 28.1 },
  { category: "Upcoding",       value: 19.4 },
  { category: "Identity",       value: 15.2 },
  { category: "Kickbacks",      value: 11.8 },
]

const alertFeed = [
  { id: "ALT-9841", state: "FL", provider: "Sunshine Medical Group",  type: "Ghost Patient",    amount: 847200,  severity: "critical", time: "2 min ago" },
  { id: "ALT-9840", state: "TX", provider: "Lone Star Healthcare",     type: "Rx Upcoding",      amount: 412800,  severity: "high",     time: "7 min ago" },
  { id: "ALT-9839", state: "LA", provider: "Bayou Care Partners",      type: "Kickback Scheme",  amount: 1240000, severity: "critical", time: "14 min ago" },
  { id: "ALT-9838", state: "GA", provider: "Peach State Clinics",      type: "Duplicate Billing",amount: 289400,  severity: "high",     time: "21 min ago" },
  { id: "ALT-9837", state: "NY", provider: "Empire Medical LLC",       type: "Identity Fraud",   amount: 573100,  severity: "medium",   time: "33 min ago" },
  { id: "ALT-9836", state: "MS", provider: "Delta Health Services",    type: "Ghost Patient",    amount: 694700,  severity: "critical", time: "41 min ago" },
  { id: "ALT-9835", state: "CA", provider: "Pacific Coast Rx",         type: "Pharmacy Fraud",   amount: 328900,  severity: "high",     time: "58 min ago" },
]

function MetricCard({ label, value, delta, sub, accent = false }: {
  label: string; value: string; delta?: string; sub?: string; accent?: boolean
}) {
  const borderColor = accent ? "rgba(0,94,162,0.25)" : "rgba(0,94,162,0.12)"
  return (
    <div className="bracket-card scanlines relative p-4 rounded flex flex-col gap-2"
      style={{ background: "var(--card)", border: `1px solid ${borderColor}` }}>
      <span className="font-mono text-sm tracking-widest uppercase" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="font-display text-2xl font-bold leading-none" style={{ color: "#005ea2" }}>{value}</span>
      {sub && <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)" }}>{sub}</span>}
      {delta && <span className="font-mono text-sm" style={{ color: "rgba(0,94,162,0.7)" }}>{delta}</span>}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const opacity = severity === "critical" ? 1 : severity === "high" ? 0.75 : 0.55
  return (
    <span className="font-mono text-sm px-2 py-0.5 rounded"
      style={{ color: `rgba(0,94,162,${opacity})`, background: "rgba(0,94,162,0.07)", border: "1px solid rgba(0,94,162,0.18)" }}>
      {severity.toUpperCase()}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded p-3 font-mono text-xs" style={{ background: "#f5f6f7", border: "1px solid rgba(0,94,162,0.2)", color: "#1b1b1b" }}>
      <p className="mb-1 text-cyan-400 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  )
}

export default function Overview() {
  const [claimType, setClaimType] = useState("All Fraud Types")
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const riskData = STATE_RISK[claimType] ?? STATE_RISK["All Fraud Types"]

  return (
    <>
      {/* KPI Row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <MetricCard label="Improper Payments Blocked" value="$203.4M" delta="+$12.1M this week" sub="88-day ops" />
        <MetricCard label="Active Investigations" value="4,891" delta="+127 today" sub="Across 50 states" accent />
        <MetricCard label="Flagged Providers" value="12,847" sub="High-risk tier: 2,341" />
        <MetricCard label="Claims Reviewed (24h)" value="847K" sub="Avg processing: 0.3s" />
        <MetricCard label="System Risk Index" value="74.2" delta="↑ 2.1 from yesterday" sub="National average" accent />
      </div>

      {/* US Heatmap */}
      <div className="bracket-card scanlines relative rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>FRAUD DETECTION HEATMAP — 50 STATES</h2>
            <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {hoveredState
                ? `${hoveredState} · Risk score: ${riskData[hoveredState] ?? 0} · ${claimType}`
                : "Select a claim type to filter · hover a state for detail"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-2">
              {[["CRITICAL", "#b50909"], ["HIGH", "#b45f06"], ["ELEVATED", "#b45f06"], ["LOW", "#3d4551"]].map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color as string }} />
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "11" }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Dropdown */}
            <select
              value={claimType}
              onChange={e => setClaimType(e.target.value)}
              className="font-mono rounded px-3 py-1.5 outline-none cursor-pointer"
              style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2", fontSize: "12" }}
            >
              {CLAIM_TYPES.map(t => <option key={t} value={t} style={{ background: "#f5f6f7" }}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <ComposableMap
            projection="geoAlbersUsa"
            style={{ width: "100%", height: "340px" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const fips = geo.id as string
                  const abbr = FIPS_TO_STATE[fips] ?? ""
                  const risk = riskData[abbr] ?? 0
                  const isHovered = hoveredState === abbr
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredState(abbr)}
                      onMouseLeave={() => setHoveredState(null)}
                      style={{
                        default: {
                          fill: riskToFill(risk),
                          stroke: isHovered ? "#3d4551" : "rgba(0,94,162,0.25)",
                          strokeWidth: isHovered ? 1.5 : 0.5,
                          outline: "none",
                          transition: "fill 0.2s",
                        },
                        hover: {
                          fill: riskToFill(Math.min(risk + 15, 100)),
                          stroke: "#3d4551",
                          strokeWidth: 1.5,
                          outline: "none",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  )
                })
              }
            </Geographies>

          </ComposableMap>

          {/* High-risk state labels overlay */}
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(riskData)
              .filter(([, v]) => v >= 85)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([state, risk]) => (
                <div key={state} className="flex items-center gap-2 px-2 py-1 rounded font-mono"
                  style={{ background: "rgba(181,9,9,0.1)", border: "1px solid rgba(181,9,9,0.3)", fontSize: "12" }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b50909" }} />
                  <span style={{ color: "#b50909" }}>{state}</span>
                  <span style={{ color: "rgba(181,9,9,0.7)" }}>{risk}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 340px" }}>

        {/* Fraud Trend */}
        <div className="bracket-card scanlines relative rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>FRAUD INTERDICTION TIMELINE</h2>
              <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Monthly blocked payments · FY2025 ($M)</p>
            </div>
            <div className="flex gap-3">
              {[{ label: "BLOCKED", opacity: 1 }, { label: "DETECTED", opacity: 0.45 }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5" style={{ background: `rgba(0,94,162,${l.opacity})` }} />
                  <span className="font-mono" style={{ color: `rgba(0,94,162,${l.opacity})`, fontSize: "11" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={fraudTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005ea2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#005ea2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDetected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005ea2" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#005ea2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.07)" />
              <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#3d4551", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="detected" name="Detected" stroke="rgba(0,94,162,0.4)" strokeWidth={1.5} fill="url(#gradDetected)" dot={false} />
              <Area type="monotone" dataKey="blocked"  name="Blocked"  stroke="#005ea2" strokeWidth={2}   fill="url(#gradBlocked)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fraud by Category */}
        <div className="bracket-card scanlines relative rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="mb-4">
            <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>FRAUD VECTOR DISTRIBUTION</h2>
            <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>By scheme type · USD Millions blocked</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={fraudByCategory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} layout="vertical">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#005ea2" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#005ea2" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.07)" horizontal={false} />
              <XAxis type="number"   tick={{ fill: "#3d4551", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fill: "#757575", fontSize: 11, fontFamily: "JetBrains Mono" }} width={80} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="$M Blocked" fill="url(#barGrad)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Alert Feed */}
        <div className="bracket-card scanlines relative rounded p-4 flex flex-col" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>LIVE ALERT FEED</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b50909" }} />
              <span className="font-mono" style={{ color: "#b50909", fontSize: "12" }}>LIVE</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 280 }}>
            {alertFeed.map(alert => (
              <div key={alert.id} className="rounded p-2 cursor-pointer hover:bg-cyan-900/10"
                style={{ background: "rgba(245,246,247,0.8)", border: "1px solid rgba(0,94,162,0.1)" }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold" style={{ color: "#757575", fontSize: "12" }}>{alert.id}</span>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <div className="font-mono" style={{ color: "#1b1b1b", fontSize: "13" }}>{alert.provider}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "12" }}>{alert.state} · {alert.type}</span>
                  <span className="font-mono font-semibold" style={{ color: "#1b1b1b", fontSize: "12" }}>${(alert.amount / 1000).toFixed(0)}K</span>
                </div>
                <div className="font-mono mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "11" }}>{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
