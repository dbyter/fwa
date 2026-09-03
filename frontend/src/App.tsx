// v2 — grouped nav
import { useState, lazy, Suspense } from "react"

function Seal() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#162e51" stroke="#ffbe2e" strokeWidth="2" />
      <path d="M20 6 L32 11 V19 C32 27 27 32 20 34 C13 32 8 27 8 19 V11 Z" fill="#ffffff" />
      <path d="M20 10 L28 13.5 V19 C28 25 24.5 28.5 20 30 C15.5 28.5 12 25 12 19 V13.5 Z" fill="#005ea2" />
      <path
        d="M15 20 L18.5 23.5 L25.5 15.5"
        stroke="#ffffff"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const Overview                = lazy(() => import("./Overview"))
const AdversarialProgram      = lazy(() => import("./AdversarialProgram"))
const PreRevocationPatterns   = lazy(() => import("./PreRevocationPatterns"))
const SupplierAnalysis        = lazy(() => import("./SupplierAnalysis"))
const AgentLibrary            = lazy(() => import("./AgentLibrary"))
const ModifierAnomaly         = lazy(() => import("./ModifierAnomaly"))
const RevocationInsights      = lazy(() => import("./RevocationInsights"))
const FwaVulnerabilities      = lazy(() => import("./FwaVulnerabilities"))

// ── Provider watchlist data (Providers tab only) ──────────────────────────────

const topProviders = [
  { rank: 1, name: "Sunshine Medical Group", state: "FL", riskScore: 98, flaggedClaims: 2847, amount: 28.4 },
  { rank: 2, name: "Bayou Care Partners",    state: "LA", riskScore: 96, flaggedClaims: 2341, amount: 22.1 },
  { rank: 3, name: "Delta Health Services",  state: "MS", riskScore: 94, flaggedClaims: 2109, amount: 19.8 },
  { rank: 4, name: "Lone Star Healthcare",   state: "TX", riskScore: 91, flaggedClaims: 1872, amount: 17.3 },
  { rank: 5, name: "Empire Medical LLC",     state: "NY", riskScore: 89, flaggedClaims: 1654, amount: 15.9 },
  { rank: 6, name: "Peach State Clinics",    state: "GA", riskScore: 87, flaggedClaims: 1487, amount: 14.2 },
]

function getRiskColor(_risk: number) {
  return "#005ea2"
}

// ── Nav ────────────────────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; icon: string; parent?: string }
type NavGroup = { id: string; label: string; icon: string; color: string; children: NavItem[] }

const topNavItems: NavItem[] = [
  { id: "overview",     label: "OVERVIEW",      icon: "⬡" },
  { id: "agentlibrary", label: "AGENT LIBRARY", icon: "⬡" },
]

const navGroups: NavGroup[] = [
  {
    id: "signal-identification", label: "SIGNAL WORKFLOWS", icon: "◈", color: "#8fb4d9",
    children: [
      { id: "supplieranalysis",    label: "SUPPLIER ANALYSIS",   icon: "◎" },
      { id: "fwavulnerabilities",  label: "DME VULNERABILITIES", icon: "◈" },
      { id: "prerevocation",       label: "PRE-REVOCATION",      icon: "◐" },
      { id: "revocationinsights",  label: "REVOCATION INSIGHTS", icon: "◐" },
      { id: "modifieranomaly",     label: "ACTIVE THREAT DETECTION",    icon: "◈" },
    ],
  },
  {
    id: "signal-transmission", label: "CMS/CPI ACTION AGENTS", icon: "◉", color: "#ffbe2e",
    children: [],
  },
]


const Loader = () => (
  <div className="flex items-center gap-2 p-6">
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "#005ea2", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
    <span className="font-mono text-sm" style={{ color: "var(--muted-foreground)" }}>LOADING MODULE...</span>
  </div>
)

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeNav, setActiveNav] = useState("overview")
  const [agentTarget, setAgentTarget] = useState<string | null>(null)

  function navigateToAgent(agentId: string) {
    setAgentTarget(agentId)
    setActiveNav("agentlibrary")
  }

  return (
    <div className="grid-bg" style={{ minHeight: "100vh", background: "var(--background)", display: "grid", gridTemplateColumns: "240px 1fr", gridTemplateRows: "auto 1fr" }}>

      {/* ── Sidebar ── */}
      <aside className="row-span-2 flex flex-col py-6 overflow-y-auto"
        style={{ background: "rgba(22,46,81,0.95)", borderRight: "1px solid rgba(0,94,162,0.12)", backdropFilter: "blur(10px)" }}>

        {/* Logo */}
        <div className="px-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Seal />
            <span className="font-display text-sm font-bold tracking-widest" style={{ color: "#ffbe2e" }}>FRAUD SHIELD</span>
          </div>
          <span className="font-mono text-sm tracking-widest" style={{ color: "#c7d4e3" }}>CMS FRAUD WAR ROOM</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {/* Top-level standalone items */}
          {topNavItems.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-left transition-all duration-150"
              style={{
                background: activeNav === item.id ? "rgba(255,190,46,0.12)" : "transparent",
                border: activeNav === item.id ? "1px solid rgba(255,190,46,0.35)" : "1px solid transparent",
                color: activeNav === item.id ? "#ffbe2e" : "#c7d4e3",
              }}>
              <span style={{ fontSize: "24px" }}>{item.icon}</span>
              <span className="font-mono text-sm tracking-widest">{item.label}</span>
            </button>
          ))}

          {/* Grouped nav sections */}
          {navGroups.map(group => {
            const groupActive = group.children.some(c => c.id === activeNav)
            return (
              <div key={group.id} className="mt-2">
                {/* Group header */}
                {group.id !== "signal-transmission" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5">
                    <span style={{ color: group.color, fontSize: "14" }}>{group.icon}</span>
                    <span className="font-mono tracking-widest" style={{ color: group.color, fontSize: "11", opacity: 0.85 }}>{group.label}</span>
                  </div>
                )}
                {/* Group children */}
                {group.children.map(item => (
                  <button key={item.id} onClick={() => setActiveNav(item.id)}
                    className="w-full flex items-center gap-2.5 pl-5 pr-3 py-2 rounded text-left transition-all duration-150"
                    style={{
                      background: activeNav === item.id ? `${group.color}1f` : "transparent",
                      border: activeNav === item.id ? `1px solid ${group.color}4d` : "1px solid transparent",
                      color: activeNav === item.id ? group.color : "#c7d4e3",
                    }}>
                    <span style={{ fontSize: "15", opacity: 0.6 }}>{item.icon}</span>
                    <span className="font-mono tracking-widest" style={{ fontSize: "12" }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 mt-6 pt-4" style={{ borderTop: "1px solid rgba(0,94,162,0.1)" }}>
          <div className="font-mono text-sm" style={{ color: "#c7d4e3" }}>
            <div>FY2025 · Q3</div>
            <div className="mt-0.5 opacity-70">v4.2.1 — CLASSIFIED</div>
          </div>
        </div>
      </aside>

      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(22,46,81,0.9)", borderBottom: "1px solid rgba(0,94,162,0.12)", backdropFilter: "blur(10px)" }}>
        <div>
          <h1 className="font-display text-base font-bold tracking-widest" style={{ color: "#ffffff" }}>
            MEDICARE INTEGRITY MONITORING
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveNav("modifieranomaly")}
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-150"
            style={{ background: "rgba(181,9,9,0.08)", border: "1px solid rgba(181,9,9,0.25)", height: 36, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(181,9,9,0.16)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(181,9,9,0.08)")}
          >
            <div className="relative w-1.5 h-1.5 rounded-full" style={{ background: "#b50909" }}>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#b5090933" }} />
            </div>
            <span className="font-mono text-sm" style={{ color: "#b50909" }}>3 CRITICAL ALERTS</span>
          </button>
          <div className="flex items-center gap-3 px-3 rounded" style={{ background: "rgba(0,94,162,0.05)", border: "1px solid rgba(0,94,162,0.15)", height: 36 }}>
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00a91c" }}>
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#00a91c44" }} />
              </div>
              <span className="font-mono text-sm" style={{ color: "#00a91c" }}>SYSTEM ACTIVE</span>
            </div>
            <span className="font-mono text-sm" style={{ color: "#c7d4e3" }}>88-day ops · $203M+ blocked</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="overflow-y-auto p-5"
        style={{ display: ["overview", "alerts"].includes(activeNav) ? "grid" : "block", gridTemplateRows: "auto 1fr", gap: "16px" }}>

        <Suspense fallback={<Loader />}>
          {activeNav === "overview"         && <Overview />}
          {activeNav === "agentlibrary"     && <AgentLibrary key={agentTarget ?? "default"} initialAgentId={agentTarget} />}
          {activeNav === "investigations"   && <AdversarialProgram />}
          {activeNav === "prerevocation"    && <PreRevocationPatterns />}
          {activeNav === "supplieranalysis" && <SupplierAnalysis onNavigateToAgent={navigateToAgent} />}
          {activeNav === "fwavulnerabilities" && <FwaVulnerabilities />}
          {activeNav === "modifieranomaly"    && <ModifierAnomaly onNavigateToAgent={navigateToAgent} />}
          {activeNav === "revocationinsights" && <RevocationInsights />}

          {activeNav === "providers" && (
            <div className="bracket-card scanlines relative rounded p-4"
              style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-sm font-semibold tracking-widest" style={{ color: "#162e51" }}>HIGH-RISK PROVIDER WATCHLIST</h2>
                  <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Ranked by composite fraud risk score · Pending investigation</p>
                </div>
                <button className="font-mono text-sm px-3 py-1.5 rounded" style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.25)", color: "#005ea2" }}>
                  EXPORT REPORT
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,94,162,0.12)" }}>
                    {["RANK", "PROVIDER NAME", "STATE", "RISK SCORE", "FLAGGED CLAIMS", "EXPOSURE"].map(h => (
                      <th key={h} className="font-mono text-left pb-2 pr-4" style={{ color: "var(--muted-foreground)", fontSize: "18", letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProviders.map((p, i) => (
                    <tr key={p.rank} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid rgba(0,94,162,0.06)" }}>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono text-sm font-bold" style={{ color: i < 3 ? "#005ea2" : "#3d4551" }}>
                          #{String(p.rank).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4"><span className="font-mono text-sm" style={{ color: "#1b1b1b" }}>{p.name}</span></td>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono text-sm px-1.5 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#005ea2", border: "1px solid rgba(0,94,162,0.2)", fontSize: "18" }}>{p.state}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(0,94,162,0.1)", maxWidth: 80 }}>
                            <div className="h-full rounded-full" style={{ width: `${p.riskScore}%`, background: getRiskColor(p.riskScore) }} />
                          </div>
                          <span className="font-mono text-sm font-bold" style={{ color: getRiskColor(p.riskScore) }}>{p.riskScore}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4"><span className="font-mono text-sm" style={{ color: "#1b1b1b" }}>{p.flaggedClaims.toLocaleString()}</span></td>
                      <td className="py-2.5"><span className="font-mono text-sm font-semibold" style={{ color: "#005ea2" }}>${p.amount}M</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  )
}
