import { useState } from "react"
import type {} from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  Cell, ReferenceLine,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string; name: string; npi: string; category: string; state: string
  revDate: string; firstWeak: string; firstSustained: string; firstAlert: string
  leadMonths: number; strongSignals: string[]; supportingSignals: string[]
  peerRankPct: number; claimsAtAlert: number; benesAtAlert: number
  allowedAtAlert: string; reviewAction: string; confidence: "High" | "Medium-high" | "Medium"
}

// ── Supplier data ─────────────────────────────────────────────────────────────

const SUPPLIERS: Supplier[] = [
  {
    id: "s1", name: "Sunshine DME Corp", npi: "1245183721", category: "Power Wheelchairs", state: "FL",
    revDate: "Mar 2022", firstWeak: "Jan 2020", firstSustained: "Mar 2020", firstAlert: "May 2020",
    leadMonths: 22, strongSignals: ["Billing velocity", "Code concentration", "Multistate growth"],
    supportingSignals: ["Orderer concentration", "Beneficiary pattern"],
    peerRankPct: 99.2, claimsAtAlert: 12400, benesAtAlert: 4100, allowedAtAlert: "$3.8M",
    reviewAction: "Enhanced review + documentation request", confidence: "High",
  },
  {
    id: "s2", name: "Bayou Medical Supplies", npi: "1386742091", category: "Oxygen & Supplies", state: "LA",
    revDate: "Nov 2021", firstWeak: "Dec 2019", firstSustained: "Feb 2020", firstAlert: "Apr 2020",
    leadMonths: 19, strongSignals: ["Code concentration", "Orderer concentration"],
    supportingSignals: ["Peer deviation", "Beneficiary pattern"],
    peerRankPct: 98.7, claimsAtAlert: 8900, benesAtAlert: 2800, allowedAtAlert: "$2.1M",
    reviewAction: "Targeted medical review", confidence: "Medium-high",
  },
  {
    id: "s3", name: "Empire Mobility Inc", npi: "1803921564", category: "Power Wheelchairs", state: "NY",
    revDate: "Jun 2021", firstWeak: "Nov 2018", firstSustained: "Jan 2019", firstAlert: "Mar 2019",
    leadMonths: 27, strongSignals: ["Rapid lifecycle", "Network similarity", "Billing velocity"],
    supportingSignals: ["Geographic expansion", "Orderer concentration"],
    peerRankPct: 99.7, claimsAtAlert: 18200, benesAtAlert: 6400, allowedAtAlert: "$6.9M",
    reviewAction: "Investigative triage referral", confidence: "High",
  },
  {
    id: "s4", name: "Coastal Respiratory Svcs", npi: "2035791847", category: "Oxygen & Supplies", state: "GA",
    revDate: "Dec 2022", firstWeak: "Feb 2022", firstSustained: "Apr 2022", firstAlert: "Jun 2022",
    leadMonths: 6, strongSignals: ["Beneficiary pattern", "Peer deviation"],
    supportingSignals: ["Code concentration"],
    peerRankPct: 96.1, claimsAtAlert: 4200, benesAtAlert: 1300, allowedAtAlert: "$0.9M",
    reviewAction: "Continue monitoring + documentation request", confidence: "Medium",
  },
  {
    id: "s5", name: "Summit Enteral LLC", npi: "2147603928", category: "Enteral Nutrition", state: "TX",
    revDate: "Sep 2021", firstWeak: "Apr 2020", firstSustained: "Jun 2020", firstAlert: "Aug 2020",
    leadMonths: 13, strongSignals: ["Claim sequence", "Geographic expansion"],
    supportingSignals: ["Orderer concentration", "Peer deviation"],
    peerRankPct: 97.4, claimsAtAlert: 7100, benesAtAlert: 2200, allowedAtAlert: "$1.6M",
    reviewAction: "Targeted medical review + enrollment review", confidence: "Medium-high",
  },
]

// ── Portfolio distribution data ───────────────────────────────────────────────

const LEAD_BUCKETS = [
  { label: "0–3 mo",    count: 8,  color: "rgba(0,94,162,0.9)" },
  { label: "4–6 mo",    count: 14, color: "rgba(0,94,162,0.75)" },
  { label: "7–12 mo",   count: 29, color: "rgba(0,94,162,0.6)" },
  { label: "13–24 mo",  count: 38, color: "rgba(0,94,162,0.45)" },
  { label: "> 24 mo",   count: 15, color: "rgba(0,94,162,0.3)" },
  { label: "No signal", count: 8,  color: "#3d4551" },
]

// ── Alert logic criteria ──────────────────────────────────────────────────────

const ALERT_CRITERIA = [
  { label: "Allowed $/beneficiary",   threshold: "> 99th peer percentile",    met: true  },
  { label: "6-month growth",          threshold: "> 5× in six months",         met: true  },
  { label: "Code concentration",      threshold: "> 70% billing in 3 HCPCS",  met: true  },
  { label: "Geographic expansion",    threshold: "> 20 states in six months",  met: true  },
  { label: "Orderer concentration",   threshold: "> 60% orders from 5 clinicians", met: false },
  { label: "Network overlap",         threshold: "Significant adverse-supplier link", met: false },
]

// ── Tab data factories ────────────────────────────────────────────────────────

function makeTimeline(s: Supplier) {
  const seeds: Record<string, number[]> = {
    s1: [12,14,18,34,56,89,142,198,267,341,408,471,520,588,632,701,748,782,819,847,891,930],
    s2: [8,9,11,13,15,19,24,31,44,62,88,124,167,201,238,274,311,342,378,401,429,447,461,478],
    s3: [5,6,8,12,19,32,58,97,163,241,318,402,487,561,614,668,712,741,769,793,814,831,847,861],
    s4: [18,19,21,22,25,28,33,41,54,71,92,118,147,174,198,219,238,252,263,271,278,283,287,291],
    s5: [10,11,12,14,17,21,27,36,48,65,87,113,142,168,191,211,228,241,251,258,264,268,272,275],
  }
  const base = seeds[s.id] ?? seeds.s1
  return Array.from({ length: 22 }, (_, i) => ({
    month: `−${22 - i}mo`,
    allowed: base[i] ?? base[base.length - 1],
    benes: Math.round((base[i] ?? 100) * 0.42),
    denialRate: parseFloat((4 + Math.sin(i * 0.4) * 1.5).toFixed(1)),
    recurring: Math.round((base[i] ?? 100) * 0.31),
  }))
}

const CODE_DATA: Record<string, { code: string; desc: string; pct: number; unitsBene: number; color: string }[]> = {
  s1: [
    { code: "K0856", desc: "Power wheelchair, complex rehab",       pct: 52, unitsBene: 1.0, color: "#005ea2" },
    { code: "K0857", desc: "Power wheelchair, group 3",             pct: 34, unitsBene: 1.0, color: "rgba(0,94,162,0.7)" },
    { code: "E1390", desc: "Oxygen concentrator, portable",         pct: 8,  unitsBene: 1.2, color: "rgba(0,94,162,0.5)" },
    { code: "E0143", desc: "Walker, folding, wheeled",              pct: 4,  unitsBene: 1.1, color: "rgba(0,94,162,0.35)" },
    { code: "Other", desc: "All other codes",                        pct: 2,  unitsBene: 0.8, color: "#3d4551" },
  ],
  s2: [
    { code: "E1390", desc: "Oxygen concentrator, stationary",       pct: 61, unitsBene: 1.0, color: "#005ea2" },
    { code: "A4615", desc: "Cannula, nasal (monthly)",              pct: 18, unitsBene: 6.4, color: "rgba(0,94,162,0.7)" },
    { code: "E0431", desc: "Portable oxygen system, rental",        pct: 11, unitsBene: 1.2, color: "rgba(0,94,162,0.5)" },
    { code: "A7007", desc: "Aerosol mask",                          pct: 7,  unitsBene: 2.1, color: "rgba(0,94,162,0.35)" },
    { code: "Other", desc: "All other codes",                        pct: 3,  unitsBene: 0.9, color: "#3d4551" },
  ],
  default: [
    { code: "E1390", desc: "Primary code",   pct: 58, unitsBene: 1.8, color: "#005ea2" },
    { code: "A4615", desc: "Secondary code", pct: 22, unitsBene: 4.1, color: "rgba(0,94,162,0.7)" },
    { code: "E0431", desc: "Third code",     pct: 12, unitsBene: 1.2, color: "rgba(0,94,162,0.5)" },
    { code: "A7007", desc: "Fourth code",    pct: 5,  unitsBene: 2.0, color: "rgba(0,94,162,0.35)" },
    { code: "Other", desc: "All other",      pct: 3,  unitsBene: 0.8, color: "#3d4551" },
  ],
}

const ORDERER_DATA: Record<string, { name: string; npi: string; specialty: string; orders: number; pct: number; states: number; linkedRevoked: boolean }[]> = {
  s1: [
    { name: "Dr. R. Fontaine",  npi: "1234567890", specialty: "Internal Medicine", orders: 3847, pct: 28, states: 11, linkedRevoked: true  },
    { name: "Dr. M. Tran",      npi: "1345678901", specialty: "Family Practice",   orders: 2914, pct: 21, states: 8,  linkedRevoked: true  },
    { name: "Dr. A. Patel",     npi: "1456789012", specialty: "Internal Medicine", orders: 2301, pct: 17, states: 6,  linkedRevoked: false },
    { name: "Dr. C. Williams",  npi: "1567890123", specialty: "Pulmonology",       orders: 1887, pct: 14, states: 4,  linkedRevoked: false },
    { name: "Dr. J. Santos",    npi: "1678901234", specialty: "Family Practice",   orders: 1541, pct: 11, states: 3,  linkedRevoked: true  },
    { name: "All others (42)",  npi: "—",          specialty: "Mixed",             orders: 1910, pct: 9,  states: 29, linkedRevoked: false },
  ],
  default: [
    { name: "Dr. K. Morrison",  npi: "1234567890", specialty: "Internal Medicine", orders: 2100, pct: 31, states: 7, linkedRevoked: true  },
    { name: "Dr. L. Chen",      npi: "1345678901", specialty: "Family Practice",   orders: 1600, pct: 24, states: 5, linkedRevoked: false },
    { name: "Dr. P. Okafor",    npi: "1456789012", specialty: "Pulmonology",       orders: 1100, pct: 16, states: 4, linkedRevoked: false },
    { name: "All others",       npi: "—",          specialty: "Mixed",             orders: 1900, pct: 29, states: 14, linkedRevoked: false },
  ],
}

const PEER_MATRIX: { measure: string; supplier: string; peerMedian: string; peerPct: number }[] = [
  { measure: "Monthly allowed dollars",       supplier: "$4.2M",  peerMedian: "$210K", peerPct: 99.9 },
  { measure: "States served",                 supplier: "31",     peerMedian: "4",     peerPct: 99.6 },
  { measure: "Units per beneficiary",         supplier: "188",    peerMedian: "42",    peerPct: 99.4 },
  { measure: "Top-5 orderer concentration",   supplier: "72%",    peerMedian: "24%",   peerPct: 98.8 },
  { measure: "Top-2 code concentration",      supplier: "86%",    peerMedian: "47%",   peerPct: 97.9 },
  { measure: "6-month growth",                supplier: "610%",   peerMedian: "18%",   peerPct: 99.8 },
  { measure: "Denial-adjusted pay rate",      supplier: "91.2%",  peerMedian: "97.8%", peerPct: 1.4  },
]

// ── Confidence color ──────────────────────────────────────────────────────────

function confColor(_c: string) {
  return "#005ea2"
}

function pctColor(p: number) {
  if (p < 10) return "rgba(0,94,162,0.45)"
  return "#005ea2"
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded p-2" style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,94,162,0.25)" }}>
      <div className="font-mono mb-1" style={{ color: "#3d4551", fontSize: "16" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="font-mono" style={{ color: p.color, fontSize: "16" }}>
          {p.name}: <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tab components ────────────────────────────────────────────────────────────

function TabTimeline({ supplier }: { supplier: Supplier }) {
  const data = makeTimeline(supplier)
  const alertIdx = Math.round(data.length * 0.45)
  const alertMonth = data[alertIdx]?.month

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Allowed $ */}
        <div>
          <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>ALLOWED DOLLARS ($K) — MONTHLY</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-allowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#005ea2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#005ea2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {alertMonth && <ReferenceLine x={alertMonth} stroke="rgba(0,94,162,0.4)" strokeDasharray="4 3" label={{ value: "alert", fill: "#005ea2", fontSize: 12, fontFamily: "JetBrains Mono" }} />}
              <ReferenceLine x={data[data.length - 1]?.month} stroke="rgba(0,94,162,0.7)" strokeWidth={1.5} label={{ value: "REV", fill: "#005ea2", fontSize: 12, fontFamily: "JetBrains Mono" }} />
              <Area type="monotone" dataKey="allowed" name="Allowed $K" stroke="#005ea2" strokeWidth={1.5} fill="url(#grad-allowed)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Beneficiaries */}
        <div>
          <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>UNIQUE BENEFICIARIES — MONTHLY</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-benes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6b46c1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6b46c1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {alertMonth && <ReferenceLine x={alertMonth} stroke="rgba(0,169,28,0.5)" strokeDasharray="4 3" />}
              <Area type="monotone" dataKey="benes" name="Beneficiaries" stroke="#6b46c1" strokeWidth={1.5} fill="url(#grad-benes)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline annotations */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { label: "FIRST WEAK SIGNAL",      date: supplier.firstWeak,      color: "rgba(0,94,162,0.45)" },
          { label: "FIRST SUSTAINED SIGNAL", date: supplier.firstSustained, color: "rgba(0,94,162,0.65)" },
          { label: "FIRST CREDIBLE ALERT",   date: supplier.firstAlert,     color: "rgba(0,94,162,0.85)" },
          { label: "REVOCATION DATE",        date: supplier.revDate,        color: "#005ea2" },
        ].map(a => (
          <div key={a.label} className="rounded px-3 py-2" style={{ background: `${a.color}08`, border: `1px solid ${a.color}28` }}>
            <div className="font-mono" style={{ color: a.color, fontSize: "16", letterSpacing: "0.1em" }}>{a.label}</div>
            <div className="font-mono font-bold" style={{ color: a.color, fontSize: "16" }}>{a.date}</div>
          </div>
        ))}
      </div>

      {/* Denial rate */}
      <div>
        <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>DENIAL RATE (%) — MONTHLY</div>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fill: "#3d4551", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} domain={[0, 12]} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="denialRate" name="Denial %" stroke="rgba(0,94,162,0.5)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TabCodes({ supplier }: { supplier: Supplier }) {
  const codes = CODE_DATA[supplier.id] ?? CODE_DATA.default
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div>
        <div className="font-mono mb-3" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>HCPCS CODE DISTRIBUTION — % OF ALLOWED DOLLARS</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={codes} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="code" tick={{ fill: "#1b1b1b", fontSize: 14, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="pct" name="% Allowed $" radius={[0, 2, 2, 0]}>
              {codes.map((c, i) => <Cell key={i} fill={c.color} fillOpacity={0.7} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="font-mono mb-3" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>CODE DETAIL</div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,94,162,0.1)" }}>
              {["CODE", "DESCRIPTION", "% BILLING", "UNITS/BENE"].map(h => (
                <th key={h} className="font-mono text-left pb-2 pr-3" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(0,94,162,0.05)" }}>
                <td className="py-2 pr-3"><span className="font-mono font-bold" style={{ color: c.color, fontSize: "16" }}>{c.code}</span></td>
                <td className="py-2 pr-3"><span className="font-mono" style={{ color: "#757575", fontSize: "16" }}>{c.desc}</span></td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 48, height: 4, background: "rgba(0,94,162,0.1)", borderRadius: 2 }}>
                      <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 2 }} />
                    </div>
                    <span className="font-mono font-bold" style={{ color: "#1b1b1b", fontSize: "16" }}>{c.pct}%</span>
                  </div>
                </td>
                <td className="py-2"><span className="font-mono" style={{ color: "#1b1b1b", fontSize: "16" }}>{c.unitsBene}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 p-3 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
          <div className="font-mono" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.1em", marginBottom: "4px" }}>CONCENTRATION FINDING</div>
          <p className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.6 }}>
            Top 2 codes account for <span style={{ color: "#005ea2", fontWeight: 600 }}>{(codes[0].pct + codes[1].pct)}% of allowed dollars</span>. Peer median is 47%. Concentrated recurring-supply billing above this level is a persistent signal in revoked-supplier typologies.
          </p>
        </div>
      </div>
    </div>
  )
}

function TabOrderers({ supplier }: { supplier: Supplier }) {
  const rows = ORDERER_DATA[supplier.id] ?? ORDERER_DATA.default
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 130px 130px 80px 60px 60px 80px", padding: "8px 12px", background: "rgba(0,94,162,0.06)", borderBottom: "1px solid rgba(0,94,162,0.1)", gap: "8px" }}>
          {["CLINICIAN", "NPI", "SPECIALTY", "ORDERS", "SHARE", "STATES", "ADVERSE LINK"].map(h => (
            <span key={h} className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em" }}>{h}</span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 130px 130px 80px 60px 60px 80px", padding: "8px 12px", borderBottom: i < rows.length - 1 ? "1px solid rgba(0,94,162,0.05)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.015)" : "transparent", gap: "8px", alignItems: "center" }}>
            <span className="font-mono font-semibold" style={{ color: "#1b1b1b", fontSize: "16" }}>{r.name}</span>
            <span className="font-mono" style={{ color: "#3d4551", fontSize: "16" }}>{r.npi}</span>
            <span className="font-mono" style={{ color: "#757575", fontSize: "16" }}>{r.specialty}</span>
            <span className="font-mono font-bold" style={{ color: "#005ea2", fontSize: "16" }}>{r.orders.toLocaleString()}</span>
            <div className="flex items-center gap-1">
              <div style={{ width: 28, height: 3, background: "rgba(0,94,162,0.1)", borderRadius: 1 }}>
                <div style={{ width: `${r.pct}%`, height: "100%", background: "#005ea2", borderRadius: 1 }} />
              </div>
              <span className="font-mono" style={{ color: "#005ea2", fontSize: "16" }}>{r.pct}%</span>
            </div>
            <span className="font-mono" style={{ color: "#1b1b1b", fontSize: "16" }}>{r.states}</span>
            <span className="font-mono px-1.5 py-0.5 rounded text-center" style={{ background: r.linkedRevoked ? "rgba(0,94,162,0.1)" : "rgba(0,94,162,0.04)", color: r.linkedRevoked ? "#005ea2" : "#3d4551", border: `1px solid ${r.linkedRevoked ? "rgba(0,94,162,0.25)" : "rgba(0,94,162,0.1)"}`, fontSize: "16" }}>
              {r.linkedRevoked ? "YES" : "NO"}
            </span>
          </div>
        ))}
      </div>
      <div className="p-3 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
        <div className="font-mono" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.1em", marginBottom: "4px" }}>ORDERER CONCENTRATION FINDING</div>
        <p className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.6 }}>
          Top 5 ordering clinicians account for <span style={{ color: "#005ea2", fontWeight: 600 }}>72% of all orders</span>. {rows.filter(r => r.linkedRevoked).length} of these clinicians are also linked to at least one other separately revoked or suspended DME supplier. Peer median top-5 concentration is 24%.
        </p>
      </div>
    </div>
  )
}

function TabBeneficiaries({ supplier }: { supplier: Supplier }) {
  const geoData = [
    { state: supplier.state, benes: Math.round(supplier.benesAtAlert * 0.18) },
    { state: "TX", benes: Math.round(supplier.benesAtAlert * 0.14) },
    { state: "CA", benes: Math.round(supplier.benesAtAlert * 0.12) },
    { state: "OH", benes: Math.round(supplier.benesAtAlert * 0.09) },
    { state: "PA", benes: Math.round(supplier.benesAtAlert * 0.08) },
    { state: "NC", benes: Math.round(supplier.benesAtAlert * 0.07) },
    { state: "Other (25)", benes: Math.round(supplier.benesAtAlert * 0.32) },
  ]
  const patterns = [
    { label: "No prior related DME history",           pct: 61, flag: true  },
    { label: "Switched from another active supplier",  pct: 22, flag: true  },
    { label: "Duplicate supplier billing (same item)", pct: 14, flag: true  },
    { label: "Inpatient stay within 30 days of claim", pct: 8,  flag: false },
    { label: "Hospice overlap indicator",              pct: 4,  flag: true  },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div>
        <div className="font-mono mb-3" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>BENEFICIARY GEOGRAPHY — TOP STATES</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={geoData} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="state" tick={{ fill: "#1b1b1b", fontSize: 14, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="benes" name="Beneficiaries" fill="#6b46c1" fillOpacity={0.6} radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="font-mono mb-3" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>BENEFICIARY PATTERN FLAGS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {patterns.map((p, i) => (
            <div key={i} className="rounded p-2" style={{ background: "rgba(0,94,162,0.03)", border: "1px solid rgba(0,94,162,0.08)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono" style={{ color: p.flag ? "#005ea2" : "#757575", fontSize: "16" }}>{p.label}</span>
                <span className="font-mono font-bold" style={{ color: p.flag ? "#005ea2" : "#757575", fontSize: "16" }}>{p.pct}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(0,94,162,0.1)", borderRadius: 1 }}>
                <div style={{ width: `${p.pct}%`, height: "100%", background: "#005ea2", borderRadius: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabPeer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "8px 16px", background: "rgba(0,94,162,0.06)", borderBottom: "1px solid rgba(0,94,162,0.1)", gap: "8px" }}>
          {["MEASURE", "SUPPLIER", "PEER MEDIAN", "PEER PERCENTILE"].map(h => (
            <span key={h} className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.1em" }}>{h}</span>
          ))}
        </div>
        {PEER_MATRIX.map((row, i) => {
          const c = pctColor(row.peerPct)
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "10px 16px", borderBottom: i < PEER_MATRIX.length - 1 ? "1px solid rgba(0,94,162,0.06)" : "none", background: i % 2 === 0 ? "rgba(0,94,162,0.015)" : "transparent", gap: "8px", alignItems: "center" }}>
              <span className="font-mono" style={{ color: "#1b1b1b", fontSize: "16" }}>{row.measure}</span>
              <span className="font-mono font-bold" style={{ color: "#162e51", fontSize: "16" }}>{row.supplier}</span>
              <span className="font-mono" style={{ color: "#3d4551", fontSize: "16" }}>{row.peerMedian}</span>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, height: 4, background: "rgba(0,94,162,0.1)", borderRadius: 2 }}>
                  <div style={{ width: `${Math.min(row.peerPct, 100)}%`, height: "100%", background: c, borderRadius: 2 }} />
                </div>
                <span className="font-mono font-bold" style={{ color: c, fontSize: "16", minWidth: 36 }}>{row.peerPct}th</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-3 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
        <div className="font-mono" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.1em", marginBottom: "4px" }}>MATCHED PEER GROUP CRITERIA</div>
        <p className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", lineHeight: 1.6 }}>
          Peer group: Power wheelchair suppliers · ≥ 2 years enrollment · MAC J6/J8 jurisdictions · 500–10,000 annual beneficiaries · National operating model. Peer n = 387 active suppliers.
        </p>
      </div>
    </div>
  )
}

function TabAlert({ supplier }: { supplier: Supplier }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Narrative */}
      <div className="p-4 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
        <div className="font-mono mb-2" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.12em" }}>EXPLAINABLE ALERT SUMMARY</div>
        <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "16", lineHeight: 1.8 }}>
          <span style={{ fontWeight: 700 }}>{supplier.name}</span> was surfaced because it expanded from 4 to 31 states in six months, moved above the 99th peer percentile for allowed dollars per beneficiary, concentrated {supplier.id === "s1" ? "86%" : "79%"} of billing in two recurring-supply codes, and received 72% of orders from five clinicians who also ordered for other later-revoked suppliers.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        {/* Claims-supported */}
        <div className="rounded p-3" style={{ background: "rgba(0,94,162,0.03)", border: "1px solid rgba(0,94,162,0.1)" }}>
          <div className="font-mono mb-2" style={{ color: "#005ea2", fontSize: "13", letterSpacing: "0.1em" }}>CLAIMS-SUPPORTED FINDINGS</div>
          {["Rapid multistate geographic expansion", "Recurring-supply code concentration above 99th percentile", "Orderer concentration with adverse-linked clinicians", "Above-threshold growth velocity sustained 3+ months", "Beneficiary population with minimal prior DME history"].map((f, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <span style={{ color: "#005ea2", fontSize: "16", flexShrink: 0, marginTop: "2px" }}>✓</span>
              <span className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Inferences + gaps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="rounded p-3" style={{ background: "rgba(0,94,162,0.03)", border: "1px solid rgba(0,94,162,0.1)" }}>
            <div className="font-mono mb-2" style={{ color: "rgba(0,94,162,0.7)", fontSize: "13", letterSpacing: "0.1em" }}>INFERENCES REQUIRING VALIDATION</div>
            {["Clinical legitimacy of orderer relationships", "Beneficiary receipt of items billed", "Explanation for non-local beneficiary population"].map((f, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span style={{ color: "rgba(0,94,162,0.7)", fontSize: "16", flexShrink: 0, marginTop: "2px" }}>~</span>
                <span className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
          <div className="rounded p-3" style={{ background: "rgba(61,69,81,0.06)", border: "1px solid rgba(61,69,81,0.15)" }}>
            <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>DATA NOT AVAILABLE (POC)</div>
            {["Ownership and authorized official records", "Proof-of-delivery documentation", "State licensure status"].map((f, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span style={{ color: "#3d4551", fontSize: "16", flexShrink: 0, marginTop: "2px" }}>○</span>
                <span className="font-mono" style={{ color: "#3d4551", fontSize: "16", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested actions */}
      <div>
        <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>SUGGESTED REVIEW PATHWAYS — NOT AUTOMATIC ENFORCEMENT ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            { action: "Request documentation",               tier: "primary"   },
            { action: "Targeted medical review",             tier: "primary"   },
            { action: "Review ordering-provider relationships", tier: "primary" },
            { action: "Examine enrollment / ownership data", tier: "secondary" },
            { action: "Validate beneficiary receipt",        tier: "secondary" },
            { action: "Refer for investigative triage",      tier: "tertiary"  },
            { action: "Continue monitoring",                 tier: "secondary" },
          ].map(a => (
            <span key={a.action} className="font-mono rounded px-2.5 py-1.5"
              style={{
                background: a.tier === "primary" ? "rgba(0,94,162,0.08)" : "rgba(0,94,162,0.03)",
                border: `1px solid ${a.tier === "primary" ? "rgba(0,94,162,0.25)" : "rgba(0,94,162,0.1)"}`,
                color: a.tier === "primary" ? "#005ea2" : "#3d4551",
                fontSize: "16",
              }}>
              {a.action}
            </span>
          ))}
        </div>
      </div>

      {/* Potential legitimate explanations */}
      <div className="rounded p-3" style={{ background: "rgba(61,69,81,0.04)", border: "1px solid rgba(61,69,81,0.12)" }}>
        <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>POTENTIAL LEGITIMATE EXPLANATIONS TO ASSESS</div>
        <p className="font-mono" style={{ color: "#3d4551", fontSize: "16", lineHeight: 1.6 }}>
          Rapid growth could reflect acquisition of another supplier's patient panel. Geographic expansion may be explained by a national partnership or telehealth-enabled ordering model. Code concentration is consistent with legitimate specialized recurring-supply operations. These factors require investigator review before any action.
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = "timeline" | "codes" | "orderers" | "beneficiaries" | "peer" | "alert"

const TABS: { id: TabId; label: string; icon: string; agent: string; agentId: string }[] = [
  { id: "timeline",      label: "01 · Establish Baseline Profiles",   icon: "◈", agent: "Utilization & Billing", agentId: "utilization" },
  { id: "codes",         label: "02 · Anomaly Detection Sweep",        icon: "◉", agent: "Utilization & Billing", agentId: "utilization" },
  { id: "orderers",      label: "03 · Orderer Concentration Map",      icon: "◎", agent: "Provider & Supplier",   agentId: "provider"    },
  { id: "beneficiaries", label: "04 · Beneficiary Pattern Analysis",   icon: "◫", agent: "Beneficiary ID",        agentId: "beneficiary" },
  { id: "peer",          label: "05 · Peer Deviation Report",          icon: "⬡", agent: "Utilization & Billing", agentId: "utilization" },
  { id: "alert",         label: "06 · Alert Generation",               icon: "◐", agent: "Utilization & Billing", agentId: "utilization" },
]

export default function SupplierAnalysis({ onNavigateToAgent }: { onNavigateToAgent?: (agentId: string) => void } = {}) {
  const [selectedId, setSelectedId]   = useState("s1")
  const [activeTab, setActiveTab]     = useState<TabId>("timeline")

  const supplier = SUPPLIERS.find(s => s.id === selectedId)!

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Page header */}
      <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {[
                { label: "Utilization & Billing", agentId: "utilization" },
                { label: "Provider & Supplier",   agentId: "provider"    },
                { label: "Beneficiary ID",         agentId: "beneficiary" },
              ].map(({ label, agentId }) => (
                <button
                  key={agentId}
                  onClick={() => onNavigateToAgent?.(agentId)}
                  className="font-mono px-2 py-0.5 rounded transition-all duration-150"
                  style={{ background: "rgba(61,69,81,0.08)", color: "#3d4551", border: "1px solid rgba(61,69,81,0.2)", fontSize: "13", letterSpacing: "0.12em", cursor: onNavigateToAgent ? "pointer" : "default" }}
                  onMouseEnter={e => { if (onNavigateToAgent) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(61,69,81,0.18)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(61,69,81,0.5)" } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(61,69,81,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(61,69,81,0.2)" }}
                >◆ {label}</button>
              ))}
            </div>
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>SUPPLIER ANALYSIS &amp; EARLY-WARNING LEAD TIME</h2>
          </div>
        </div>
      </div>

      {/* Portfolio + Early-warning card + Alert logic */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: "14px" }}>

        {/* Lead time distribution */}
        <div className="rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="font-mono mb-1" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>PORTFOLIO LEAD-TIME DISTRIBUTION</div>
          <div className="font-mono mb-3" style={{ color: "#1b1b1b", fontSize: "16" }}>n = 112 suppliers</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={LEAD_BUCKETS} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,94,162,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#3d4551", fontSize: 13, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Suppliers" radius={[2, 2, 0, 0]}>
                {LEAD_BUCKETS.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
            {[
              { label: "≥ 3 mo early",  value: "86%",    color: "#005ea2" },
              { label: "≥ 6 mo early",  value: "74%",    color: "rgba(0,94,162,0.75)" },
              { label: "≥ 12 mo early", value: "48%",    color: "rgba(0,94,162,0.55)" },
              { label: "Median lead",   value: "14 mo",  color: "rgba(0,94,162,0.7)" },
            ].map(m => (
              <div key={m.label} className="rounded px-2 py-1.5 text-center" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.08)" }}>
                <div className="font-mono font-bold" style={{ color: m.color, fontSize: "16" }}>{m.value}</div>
                <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier early-warning card */}
        <div className="rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="font-mono mb-3" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>SUPPLIER EARLY-WARNING CARD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {[
              { label: "Revocation date",            value: supplier.revDate,          color: "#005ea2"  },
              { label: "First unusual signal",       value: supplier.firstWeak,        color: "rgba(0,94,162,0.55)"  },
              { label: "First sustained signal",     value: supplier.firstSustained,   color: "rgba(0,94,162,0.7)"  },
              { label: "First credible alert",       value: supplier.firstAlert,       color: "rgba(0,94,162,0.85)"  },
              { label: "Potential lead time",        value: `${supplier.leadMonths} months`, color: "#005ea2", big: true },
              { label: "Peer rank at first alert",   value: `Top ${(100 - supplier.peerRankPct).toFixed(1)}%`, color: "#005ea2" },
              { label: "Claims at alert",            value: supplier.claimsAtAlert.toLocaleString(), color: "#1b1b1b" },
              { label: "Beneficiaries at alert",     value: supplier.benesAtAlert.toLocaleString(),  color: "#1b1b1b" },
              { label: "Allowed $ at alert",         value: supplier.allowedAtAlert,   color: "#005ea2"  },
              { label: "Confidence",                 value: supplier.confidence,       color: confColor(supplier.confidence) },
            ].map(f => (
              <div key={f.label} className="rounded px-3 py-2" style={{ background: "rgba(0,94,162,0.03)", border: "1px solid rgba(0,94,162,0.08)" }}>
                <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16", letterSpacing: "0.08em" }}>{f.label.toUpperCase()}</div>
                <div className="font-mono font-bold" style={{ color: f.color, fontSize: (f as { big?: boolean }).big ? "18px" : "11px", lineHeight: 1.2, marginTop: "2px" }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
            <div className="font-mono" style={{ color: "#005ea2", fontSize: "16", marginBottom: "3px" }}>STRONGEST SIGNALS</div>
            <div className="flex gap-1 flex-wrap">
              {supplier.strongSignals.map(s => (
                <span key={s} className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#005ea2", border: "1px solid rgba(0,94,162,0.2)", fontSize: "16" }}>{s}</span>
              ))}
            </div>
            <div className="font-mono mt-2" style={{ color: "#3d4551", fontSize: "16", marginBottom: "3px" }}>SUPPORTING</div>
            <div className="flex gap-1 flex-wrap">
              {supplier.supportingSignals.map(s => (
                <span key={s} className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.06)", color: "#3d4551", border: "1px solid rgba(0,94,162,0.12)", fontSize: "16" }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Alert logic panel */}
        <div className="rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="font-mono mb-1" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>EARLY-WARNING ALERT LOGIC</div>
          <p className="font-mono mb-3" style={{ color: "#757575", fontSize: "16", lineHeight: 1.6 }}>
            Alert generated when <span style={{ color: "#005ea2", fontWeight: 600 }}>≥ 3 criteria</span> persisted for 2 consecutive months:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {ALERT_CRITERIA.map((c, i) => (
              <div key={i} className="rounded p-2.5" style={{ background: c.met ? "rgba(0,94,162,0.05)" : "rgba(0,94,162,0.03)", border: `1px solid ${c.met ? "rgba(0,94,162,0.18)" : "rgba(0,94,162,0.08)"}` }}>
                <div className="flex items-start gap-2">
                  <span style={{ color: c.met ? "#005ea2" : "#3d4551", fontSize: "16", flexShrink: 0, marginTop: "1px" }}>{c.met ? "✓" : "○"}</span>
                  <div>
                    <div className="font-mono font-semibold" style={{ color: c.met ? "#1b1b1b" : "#3d4551", fontSize: "16" }}>{c.label}</div>
                    <div className="font-mono" style={{ color: c.met ? "#757575" : "#3d4551", fontSize: "16", marginTop: "1px" }}>{c.threshold}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 rounded" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.15)" }}>
            <p className="font-mono" style={{ color: "#757575", fontSize: "16", lineHeight: 1.6 }}>
              4 of 6 criteria met for {supplier.name}. Alert generated {supplier.leadMonths} months before revocation.
            </p>
          </div>
        </div>
      </div>

      {/* Supplier selector */}
      <div className="rounded p-3" style={{ background: "rgba(245,246,247,0.8)", border: "1px solid rgba(0,94,162,0.1)" }}>
        <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.1em" }}>SELECT SUPPLIER FOR DRILL-DOWN</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SUPPLIERS.map(s => {
            const lc = "#005ea2"
            const sel = s.id === selectedId
            return (
              <button key={s.id} onClick={() => { setSelectedId(s.id); setActiveTab("timeline") }}
                className="rounded px-3 py-2 text-left transition-all"
                style={{ background: sel ? `${lc}10` : "rgba(255,255,255,0.6)", border: `1px solid ${sel ? lc + "44" : "rgba(0,94,162,0.1)"}`, minWidth: 170 }}>
                <div className="font-mono font-semibold" style={{ color: sel ? lc : "#1b1b1b", fontSize: "16" }}>{s.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>{s.category}</span>
                  <span style={{ color: "rgba(61,69,81,0.4)" }}>·</span>
                  <span className="font-mono font-bold" style={{ color: lc, fontSize: "16" }}>{s.leadMonths}mo lead</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Drill-down panel */}
      <div className="bracket-card rounded" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>

        {/* Supplier identity strip */}
        <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid rgba(0,94,162,0.1)", background: "rgba(0,94,162,0.02)" }}>
          <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "rgba(0,94,162,0.1)", border: "1px solid rgba(0,94,162,0.25)" }}>
            <span style={{ color: "#005ea2", fontSize: "16" }}>◎</span>
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>{supplier.name.toUpperCase()}</div>
            <div className="font-mono mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>
              NPI {supplier.npi} · {supplier.category} · {supplier.state} · Revoked {supplier.revDate}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="rounded px-3 py-1.5" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>EARLIEST CREDIBLE ALERT</div>
              <div className="font-mono font-bold" style={{ color: "#005ea2", fontSize: "16" }}>{supplier.firstAlert}</div>
            </div>
            <div className="rounded px-3 py-1.5" style={{ background: "rgba(0,94,162,0.06)", border: "1px solid rgba(0,94,162,0.2)" }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>POTENTIAL LEAD TIME</div>
              <div className="font-mono font-bold" style={{ color: "#005ea2", fontSize: "16" }}>{supplier.leadMonths} months</div>
            </div>
            <div className="rounded px-3 py-1.5" style={{ background: `${confColor(supplier.confidence)}08`, border: `1px solid ${confColor(supplier.confidence)}28` }}>
              <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "16" }}>CONFIDENCE</div>
              <div className="font-mono font-bold" style={{ color: confColor(supplier.confidence), fontSize: "16" }}>{supplier.confidence}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(0,94,162,0.1)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex flex-col items-start px-4 py-2.5 transition-colors"
              style={{
                borderBottom: activeTab === t.id ? "2px solid #005ea2" : "2px solid transparent",
                background: activeTab === t.id ? "rgba(0,94,162,0.05)" : "transparent",
                whiteSpace: "nowrap",
              }}>
              <span className="font-mono" style={{ color: activeTab === t.id ? "#005ea2" : "var(--muted-foreground)", fontSize: "13", letterSpacing: "0.08em" }}>{t.label}</span>
              <span
                className="font-mono"
                style={{ color: activeTab === t.id ? "rgba(0,94,162,0.5)" : "rgba(61,69,81,0.6)", fontSize: "12", marginTop: "2px", cursor: onNavigateToAgent ? "pointer" : "default", textDecoration: onNavigateToAgent ? "underline dotted" : "none", textUnderlineOffset: "2px" }}
                onClick={e => { e.stopPropagation(); onNavigateToAgent?.(t.agentId) }}
              >{t.agent}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "timeline"      && <TabTimeline      supplier={supplier} />}
          {activeTab === "codes"         && <TabCodes         supplier={supplier} />}
          {activeTab === "orderers"      && <TabOrderers      supplier={supplier} />}
          {activeTab === "beneficiaries" && <TabBeneficiaries supplier={supplier} />}
          {activeTab === "peer"          && <TabPeer />}
          {activeTab === "alert"         && <TabAlert         supplier={supplier} />}
        </div>
      </div>


    </div>
  )
}
