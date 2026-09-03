import { useEffect, useState } from "react"
import { fwaApi, type Hypothesis, type DeepDive, type Brief } from "./lib/fwaApi"

// ── Shared bits ──────────────────────────────────────────────────────────────

function ScoreDot({ label, value }: { label: string; value: number }) {
  const bg = value >= 4 ? "#b50909" : value === 3 ? "#ffbe2e" : "rgba(0,94,162,0.1)"
  const fg = value >= 4 ? "#ffffff" : value === 3 ? "#162e51" : "#3d4551"
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span style={{ color: "#3d4551" }}>{label}</span>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
        style={{ background: bg, color: fg }}
      >
        {value}
      </span>
    </span>
  )
}

function CategoryPill({ code }: { code: string }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border"
      style={{ background: "#e6f1f8", color: "#1a4480", borderColor: "#005ea2" }}
    >
      {code}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    immediate: { bg: "#b50909", fg: "#ffffff", label: "Immediate" },
    near_term: { bg: "#ffbe2e", fg: "#162e51", label: "Near-term" },
    structural: { bg: "#005ea2", fg: "#ffffff", label: "Structural" },
  }
  const s = styles[priority] ?? { bg: "rgba(0,94,162,0.1)", fg: "#3d4551", label: priority }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide flex-shrink-0"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#1a4480" }}>{title}</h3>
      <div className="text-sm" style={{ color: "#3d4551" }}>{children}</div>
    </div>
  )
}

function Loader() {
  return (
    <div className="flex items-center gap-2 p-6">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "#005ea2", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-sm" style={{ color: "#757575" }}>LOADING...</span>
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────────────────

function VulnerabilityList({ onSelect }: { onSelect: (id: string) => void }) {
  const [hypotheses, setHypotheses] = useState<Hypothesis[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fwaApi.hypotheses().then(setHypotheses).catch(e => setError(String(e)))
  }, [])

  if (error) return <Card title="Error">Failed to load hypotheses — is the backend running? ({error})</Card>
  if (!hypotheses) return <Loader />

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#162e51" }}>
          Biggest Vulnerabilities
        </h2>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: "#3d4551" }}>
          Ranked FWA hypotheses derived from CMS Medicare Claims Processing Manual, Chapter 20 (DMEPOS).
          Ranked by financial impact × likelihood, adjusted for detectability and confidence.
        </p>
      </div>
      <div className="bracket-card rounded overflow-hidden" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ background: "#162e51", color: "#ffffff" }}>
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Vulnerability</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Archetypes</th>
            </tr>
          </thead>
          <tbody>
            {hypotheses.map(h => (
              <tr
                key={h.id}
                className="cursor-pointer transition-colors"
                style={{ borderTop: "1px solid rgba(0,94,162,0.1)" }}
                onClick={() => onSelect(h.id)}
                onMouseEnter={e => (e.currentTarget.style.background = "#e6f1f8")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-4 py-3 align-top">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                    style={h.is_top10 ? { background: "#ffbe2e", color: "#162e51" } : { background: "rgba(0,94,162,0.08)", color: "#3d4551" }}
                  >
                    {h.rank}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="font-semibold" style={{ color: "#1a4480" }}>{h.title}</span>
                  {h.is_top10 && (
                    <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: "#ffbe2e", background: "#162e51" }}>
                      Top 10
                    </span>
                  )}
                  <p className="text-xs mt-1 max-w-xl line-clamp-2" style={{ color: "#757575" }}>{h.vulnerability_hypothesis}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1 max-w-[140px]">
                    {h.collision_categories.map(c => <CategoryPill key={c} code={c} />)}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <ScoreDot label="Impact" value={h.severity.financial_impact} />
                    <ScoreDot label="Likely" value={h.severity.likelihood} />
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {h.archetypes.slice(0, 2).map(a => (
                      <span key={a.name} className="text-[11px] rounded px-1.5 py-0.5" style={{ background: "#f5f6f7", border: "1px solid rgba(0,94,162,0.12)", color: "#3d4551" }}>
                        {a.name}
                      </span>
                    ))}
                    {h.archetypes.length > 2 && <span className="text-[11px]" style={{ color: "#757575" }}>+{h.archetypes.length - 2} more</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Deep dive view ───────────────────────────────────────────────────────────

function BriefingMemoTab({ deepdive, brief }: { deepdive: DeepDive | null; brief: Brief | null }) {
  if (!deepdive && !brief) {
    return <Card title="Not available">This vulnerability is outside the top 10 and has no recommended actions or briefing memo generated.</Card>
  }
  return (
    <div>
      {deepdive && deepdive.recommended_actions.length > 0 && (
        <section className="mb-6 rounded overflow-hidden" style={{ border: "2px solid #1a4480" }}>
          <div className="px-4 py-2 font-bold text-sm uppercase tracking-widest" style={{ background: "#1a4480", color: "#ffffff" }}>
            Recommended Actions
          </div>
          <div style={{ background: "#e6f1f8" }}>
            {deepdive.recommended_actions.map((a, i) => (
              <div key={i} className="px-4 py-3 flex gap-3" style={{ borderTop: i > 0 ? "1px solid rgba(0,94,162,0.15)" : undefined }}>
                <PriorityBadge priority={a.priority} />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: "#162e51" }}>{a.action}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#3d4551" }}>{a.rationale}</p>
                  {a.addresses_archetypes?.length > 0 && (
                    <p className="text-[11px] mt-1" style={{ color: "#757575" }}>Targets: {a.addresses_archetypes.join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {brief && (
        <section className="rounded overflow-hidden" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.15)" }}>
          <div className="px-5 py-3" style={{ background: "#162e51" }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#ffbe2e" }}>CMS Center for Program Integrity — Briefing Memo</p>
            <p className="text-xs" style={{ color: "#c7d4e3" }}>Hypothesis generation for internal decision support — not proof of fraud</p>
          </div>

          <div className="p-5 space-y-5">
            <div className="rounded p-4" style={{ background: "#e6f1f8", border: "1px solid rgba(0,94,162,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#1a4480" }}>Issue Summary</p>
              <p className="text-sm font-medium" style={{ color: "#162e51" }}>{brief.issue_summary}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#1a4480" }}>Background</p>
              <p className="text-sm" style={{ color: "#3d4551" }}>{brief.background}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#1a4480" }}>Findings</p>
              <ul className="text-sm space-y-1.5" style={{ color: "#3d4551" }}>
                {brief.findings.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold flex-shrink-0" style={{ color: "#005ea2" }}>{i + 1}.</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#1a4480" }}>Legal &amp; Regulatory Basis</p>
              <p className="text-sm" style={{ color: "#3d4551" }}>{brief.legal_regulatory_basis}</p>
            </div>

            <div className="rounded p-4" style={{ background: "#f5f6f7", border: "1px solid rgba(0,94,162,0.12)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#1a4480" }}>Recommended Action (Executive Summary)</p>
              <p className="text-sm" style={{ color: "#162e51" }}>{brief.recommended_action_summary}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#1a4480" }}>Next Steps</p>
              <div className="space-y-2">
                {brief.next_steps.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: "#005ea2", color: "#ffffff" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm" style={{ color: "#3d4551" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {brief.references.length > 0 && (
              <div className="pt-3" style={{ borderTop: "1px solid rgba(0,94,162,0.12)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#1a4480" }}>References (Comparable Enforcement History)</p>
                <ul className="text-xs space-y-1">
                  {brief.references.map((r, i) => (
                    <li key={i}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "#005ea2" }} className="hover:underline">
                        {r.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function InsightsTab({ deepdive }: { deepdive: DeepDive | null }) {
  if (!deepdive) {
    return <Card title="Not available">This vulnerability is outside the top 10 and has no archetype ranking generated.</Card>
  }
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "#162e51" }}>
        Archetypes Ranked by Potential to Misuse
      </h2>
      <p className="text-xs mb-4" style={{ color: "#757575" }}>Highest misuse potential first, based on each archetype's scored behavioral profile.</p>
      <div className="rounded overflow-hidden" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        {[...deepdive.archetype_misuse_ranking]
          .sort((a, b) => b.misuse_potential - a.misuse_potential)
          .map((ar, i) => {
            const barColor = ar.misuse_potential >= 4 ? "#b50909" : ar.misuse_potential === 3 ? "#ffbe2e" : "#005ea2"
            return (
              <div
                key={i}
                className="px-5 py-4 flex gap-4 items-start"
                style={{ borderTop: i > 0 ? "1px solid rgba(0,94,162,0.1)" : undefined }}
              >
                <div className="flex flex-col items-center flex-shrink-0 w-14 pt-0.5">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: barColor, color: "#ffffff" }}
                  >
                    {ar.misuse_potential}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: "#757575" }}>Misuse</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm mb-1" style={{ color: "#162e51" }}>{i + 1}. {ar.archetype}</p>
                  <p className="text-sm mb-1"><span className="font-semibold" style={{ color: "#1a4480" }}>Why: </span><span style={{ color: "#3d4551" }}>{ar.why}</span></p>
                  <p className="text-sm"><span className="font-semibold" style={{ color: "#1a4480" }}>How: </span><span style={{ color: "#3d4551" }}>{ar.how}</span></p>
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}

function VulnerabilityDeepDive({ id, onBack }: { id: string; onBack: () => void }) {
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null)
  const [deepdive, setDeepdive] = useState<DeepDive | null>(null)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"brief" | "insights">("brief")

  useEffect(() => {
    setHypothesis(null)
    setDeepdive(null)
    setBrief(null)
    setTab("brief")
    fwaApi.hypothesis(id).then(h => {
      setHypothesis(h)
      if (h.is_top10) {
        fwaApi.deepdive(id).then(setDeepdive).catch(() => setDeepdive(null))
        fwaApi.brief(id).then(setBrief).catch(() => setBrief(null))
      }
    }).catch(e => setError(String(e)))
  }, [id])

  if (error) return <Card title="Error">Failed to load vulnerability ({error})</Card>
  if (!hypothesis) return <Loader />

  const tabs = [
    { id: "brief" as const, label: "Recommended Actions & Brief" },
    { id: "insights" as const, label: "Archetypes & Insights" },
  ]

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-3" style={{ color: "#005ea2" }}>← Back to all vulnerabilities</button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold" style={{ background: "#ffbe2e", color: "#162e51" }}>
              {hypothesis.rank}
            </span>
            {hypothesis.collision_categories.map(c => <CategoryPill key={c} code={c} />)}
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#162e51" }}>{hypothesis.title}</h1>
        </div>
        <div className="flex gap-3 rounded p-3" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <ScoreDot label="Impact" value={hypothesis.severity.financial_impact} />
          <ScoreDot label="Likely" value={hypothesis.severity.likelihood} />
          <ScoreDot label="Detect" value={hypothesis.severity.detectability} />
          <ScoreDot label="Conf." value={hypothesis.severity.confidence} />
        </div>
      </div>

      <p className="text-sm mb-5" style={{ color: "#3d4551" }}>{hypothesis.vulnerability_hypothesis}</p>

      <div className="flex gap-1 mb-5" style={{ borderBottom: "2px solid rgba(0,94,162,0.15)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-sm font-bold uppercase tracking-wide -mb-0.5 transition-colors"
            style={
              tab === t.id
                ? { color: "#1a4480", borderBottom: "3px solid #1a4480" }
                : { color: "#757575", borderBottom: "3px solid transparent" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brief"
        ? <BriefingMemoTab deepdive={deepdive} brief={brief} />
        : <InsightsTab deepdive={deepdive} />}
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────

export default function FwaVulnerabilities() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="scanlines relative rounded p-5" style={{ background: "var(--background)" }}>
      {selectedId
        ? <VulnerabilityDeepDive id={selectedId} onBack={() => setSelectedId(null)} />
        : <VulnerabilityList onSelect={setSelectedId} />}
    </div>
  )
}
