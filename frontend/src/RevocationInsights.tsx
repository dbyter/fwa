import { useState } from "react"

// ── Shared data (sourced from AgentLibrary) ───────────────────────────────────

type GapSeverity = "CRITICAL" | "HIGH" | "MODERATE"

const INSIGHTS = [
  {
    id: "g1",
    severity: "CRITICAL" as GapSeverity,
    category: "Persistent Billing",
    title: "Billing activity persists years after revocation",
    npi: "1003888298",
    providerName: "George Vito",
    revocationCodes: ["424.535(a)(4) — False or Misleading Information", "424.535(a)(9) — Failure to Report", "424.535(a)(3) — Felonies"],
    evidence: [
      "37 claim lines across 2022–2023 despite revocation dating to 2014",
      "$1,133,586 in allowed dollars recorded in 2022",
      "$118,227 in allowed dollars recorded in 2023",
      "~$1.25M total — ~$33,800 per claim line on average",
    ],
    signals: [
      "Allowed/billed dollars per claim line far exceed peer norms",
      "Dollars per beneficiary likely extreme if beneficiary count is low",
      "Peer-percentile comparison places this at 99th+ percentile",
      "Concentration in a small number of high-value claims or codes",
    ],
    implication: "A provider carrying three revocation bases — including felonies and deliberate misrepresentation — generated over $1.25M in claims years after adverse enrollment action. This represents either a control failure in the enrollment-to-claims linkage, an identity/NPI mapping issue, or active billing through a successor entity.",
    recommendation: "Cross-reference NPI 1003888298 against PECOS enrollment status at time of each 2022–2023 claim. Verify whether revocation applied to the specific practice location. Escalate to ZPIC/RAC if billing confirmed post-revocation.",
    validationNotes: [
      "Dollar amounts may reflect submitted charges rather than Medicare-paid amounts — validate against fee schedule before enforcement referral",
      "NPI reuse or inaccurate identifier mapping could explain the apparent gap — verify identity match between revocation record and claims NPI",
    ],
  },
  {
    id: "g2",
    severity: "CRITICAL" as GapSeverity,
    category: "Pre-Revocation Velocity",
    title: "Extreme billing concentration in final active year",
    npi: "1467811331",
    providerName: undefined,
    revocationCodes: undefined,
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
    validationNotes: undefined,
  },
  {
    id: "g3",
    severity: "CRITICAL" as GapSeverity,
    category: "Dollar Concentration",
    title: "Sustained high-volume high-dollar billing across multiple years",
    npi: "1992071476",
    providerName: undefined,
    revocationCodes: undefined,
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
    implication: "Multi-year high-concentration billing in 3 procedure codes is a documented pattern in DMEPOS fraud typologies, particularly for recurring supplies. The consistency of the code mix suggests systematic rather than medically driven billing. Pre-revocation signals were present well before any enforcement action.",
    recommendation: "Apply peer-deviation analysis against NPI specialty and jurisdiction cohort. Compute beneficiary-to-claim-line ratio to test for duplicate or phantom billing. Route to Utilization and Billing Patterns agent for longitudinal scoring.",
    validationNotes: undefined,
  },
  {
    id: "g4",
    severity: "HIGH" as GapSeverity,
    category: "Zero-Dollar Clustering",
    title: "Systematic zero-paid activity across large provider cohort",
    npi: undefined,
    providerName: undefined,
    revocationCodes: undefined,
    evidence: [
      "67 of 224 total records (29.9%) show $0 in paid amounts",
      "Zero-dollar records span all years 2016–2025 and multiple procedure codes",
      "Some NPIs show years of $0 activity interspersed with high-dollar years",
      "NPI 1528203338 shows $0 in some years alongside consistent 72–104 claim lines annually",
    ],
    signals: [
      "Zero-dollar paid may indicate non-covered services billed, duplicate claim suppression, denied claims not appealed, or test/probe billing",
      "High claim-line counts with $0 paid warrant investigation for billing system probe patterns",
      "Interspersed $0 and high-dollar years could reflect selective service billing or strategic code rotation",
    ],
    implication: "A 30% zero-dollar rate in a revoked-supplier cohort is anomalously high. Probe billing — submitting claims to test adjudication logic without expecting payment — is a documented precursor to large-scale fraud. Zero-dollar records should not be filtered from analysis as they may contain the earliest detectable signals.",
    recommendation: "Retain zero-dollar records in model training cohort with distinct label. Analyze claim edit codes on denied zero-dollar claims to surface systematic adjudication bypass attempts. Flag high-line-count $0 suppliers for manual review.",
    validationNotes: undefined,
  },
  {
    id: "g5",
    severity: "HIGH" as GapSeverity,
    category: "Identity Signal",
    title: "NPI persistence across long time windows inconsistent with single-entity lifecycle",
    npi: "1528203338",
    providerName: undefined,
    revocationCodes: undefined,
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
    validationNotes: undefined,
  },
  {
    id: "g6",
    severity: "MODERATE" as GapSeverity,
    category: "Field Validation",
    title: "Dollar field definition requires validation before enforcement use",
    npi: undefined,
    providerName: undefined,
    revocationCodes: undefined,
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
    implication: "If dtl_paidamount reflects submitted rather than allowed/paid amounts, dollar figures may significantly overstate Medicare exposure. Enforcement referrals based on overstated dollar values undermine case credibility.",
    recommendation: "Cross-reference dtl_paidamount against Medicare remittance data (ERA/835) for a sample of high-value claim lines. Confirm field represents paid amounts, not billed charges. Update data dictionary and flag enforcement cases for revalidation if discrepancy confirmed.",
    validationNotes: ["Dollar amounts may reflect submitted charges — validate against CMS payment records before enforcement use"],
  },
]

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
  { year: 2023, npi: "1003888298", claimLines: 9,   procedures: 2, paidAmount: 118227    },
  { year: 2023, npi: "1851915623", claimLines: 9,   procedures: 1, paidAmount: 77459     },
  { year: 2023, npi: "1578008827", claimLines: 4,   procedures: 1, paidAmount: 18816     },
  { year: 2023, npi: "1730363748", claimLines: 10,  procedures: 1, paidAmount: 11562     },
  { year: 2023, npi: "1528203338", claimLines: 80,  procedures: 6, paidAmount: 6386      },
  { year: 2023, npi: "1366750325", claimLines: 1,   procedures: 1, paidAmount: 2459      },
  { year: 2023, npi: "1689106767", claimLines: 5,   procedures: 3, paidAmount: 116       },
  { year: 2023, npi: "1306846654", claimLines: 23,  procedures: 4, paidAmount: 113       },
  { year: 2022, npi: "1003888298", claimLines: 28,  procedures: 1, paidAmount: 1133586   },
  { year: 2022, npi: "1104440981", claimLines: 13,  procedures: 7, paidAmount: 211440    },
  { year: 2022, npi: "1407812993", claimLines: 6,   procedures: 2, paidAmount: 30182     },
  { year: 2022, npi: "1720541402", claimLines: 9,   procedures: 3, paidAmount: 20026     },
  { year: 2022, npi: "1851915623", claimLines: 1,   procedures: 1, paidAmount: 11917     },
  { year: 2022, npi: "1528203338", claimLines: 104, procedures: 5, paidAmount: 9784      },
  { year: 2022, npi: "1619175031", claimLines: 2,   procedures: 1, paidAmount: 1975      },
  { year: 2022, npi: "1689106767", claimLines: 3,   procedures: 2, paidAmount: 184       },
  { year: 2022, npi: "1306846654", claimLines: 15,  procedures: 5, paidAmount: 118       },
  { year: 2021, npi: "1265665681", claimLines: 32,  procedures: 3, paidAmount: 98908     },
  { year: 2021, npi: "1205345485", claimLines: 12,  procedures: 3, paidAmount: 46891     },
  { year: 2021, npi: "1982264339", claimLines: 8,   procedures: 2, paidAmount: 19776     },
  { year: 2021, npi: "1528203338", claimLines: 93,  procedures: 6, paidAmount: 9077      },
  { year: 2021, npi: "1154732907", claimLines: 4,   procedures: 1, paidAmount: 8240      },
  { year: 2021, npi: "1578008827", claimLines: 3,   procedures: 2, paidAmount: 4245      },
  { year: 2021, npi: "1992071476", claimLines: 12,  procedures: 4, paidAmount: 4123      },
  { year: 2021, npi: "1720541402", claimLines: 6,   procedures: 2, paidAmount: 3943      },
  { year: 2021, npi: "1689106767", claimLines: 7,   procedures: 1, paidAmount: 255       },
  { year: 2021, npi: "1669993218", claimLines: 24,  procedures: 5, paidAmount: 184       },
  { year: 2021, npi: "1306846654", claimLines: 17,  procedures: 4, paidAmount: 176       },
  { year: 2020, npi: "1992071476", claimLines: 243, procedures: 3, paidAmount: 186886    },
  { year: 2020, npi: "1730363748", claimLines: 4,   procedures: 1, paidAmount: 12211     },
  { year: 2020, npi: "1528203338", claimLines: 92,  procedures: 6, paidAmount: 7906      },
  { year: 2020, npi: "1982264339", claimLines: 2,   procedures: 1, paidAmount: 6592      },
  { year: 2020, npi: "1720541402", claimLines: 2,   procedures: 1, paidAmount: 5040      },
  { year: 2020, npi: "1578008827", claimLines: 1,   procedures: 1, paidAmount: 4236      },
  { year: 2020, npi: "1689106767", claimLines: 5,   procedures: 2, paidAmount: 232       },
  { year: 2020, npi: "1306846654", claimLines: 12,  procedures: 4, paidAmount: 99        },
  { year: 2019, npi: "1992071476", claimLines: 190, procedures: 3, paidAmount: 141116    },
  { year: 2019, npi: "1528578499", claimLines: 7,   procedures: 1, paidAmount: 45798     },
  { year: 2019, npi: "1578008827", claimLines: 4,   procedures: 2, paidAmount: 12344     },
  { year: 2019, npi: "1528203338", claimLines: 104, procedures: 6, paidAmount: 7953      },
  { year: 2019, npi: "1619175031", claimLines: 2,   procedures: 1, paidAmount: 1255      },
  { year: 2019, npi: "1306846654", claimLines: 27,  procedures: 6, paidAmount: 360       },
  { year: 2019, npi: "1689106767", claimLines: 8,   procedures: 3, paidAmount: 325       },
  { year: 2018, npi: "1992071476", claimLines: 269, procedures: 3, paidAmount: 388088    },
  { year: 2018, npi: "1528578499", claimLines: 2,   procedures: 1, paidAmount: 12791     },
  { year: 2018, npi: "1578008827", claimLines: 2,   procedures: 1, paidAmount: 9139      },
  { year: 2018, npi: "1528203338", claimLines: 102, procedures: 6, paidAmount: 7460      },
  { year: 2018, npi: "1306846654", claimLines: 18,  procedures: 5, paidAmount: 235       },
  { year: 2018, npi: "1689106767", claimLines: 2,   procedures: 2, paidAmount: 101       },
  { year: 2017, npi: "1992071476", claimLines: 75,  procedures: 1, paidAmount: 76620     },
  { year: 2017, npi: "1528203338", claimLines: 103, procedures: 7, paidAmount: 7354      },
  { year: 2017, npi: "1689106767", claimLines: 10,  procedures: 5, paidAmount: 382       },
  { year: 2017, npi: "1306846654", claimLines: 17,  procedures: 10, paidAmount: 233      },
  { year: 2016, npi: "1528203338", claimLines: 72,  procedures: 6, paidAmount: 8051      },
  { year: 2016, npi: "1306846654", claimLines: 31,  procedures: 9, paidAmount: 629       },
  { year: 2016, npi: "1992071476", claimLines: 2,   procedures: 2, paidAmount: 92        },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

const SEVERITY_META: Record<GapSeverity, { color: string; bg: string }> = {
  CRITICAL: { color: "#b50909", bg: "rgba(181,9,9,0.1)" },
  HIGH:     { color: "#b45f06", bg: "rgba(180,95,6,0.1)" },
  MODERATE: { color: "#757575", bg: "rgba(0,94,162,0.07)" },
}

// ── Insight sidebar card ──────────────────────────────────────────────────────

function InsightCard({
  insight, index, active, onClick,
}: {
  insight: typeof INSIGHTS[number]
  index: number
  active: boolean
  onClick: () => void
}) {
  const meta = SEVERITY_META[insight.severity]
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded px-3 py-3 transition-all duration-150"
      style={{
        background: active ? "rgba(0,94,162,0.07)" : "transparent",
        border: active ? "1px solid rgba(0,94,162,0.3)" : "1px solid transparent",
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center font-mono font-bold mt-0.5"
          style={{ background: active ? "rgba(0,94,162,0.15)" : "rgba(0,94,162,0.07)", border: `1px solid ${active ? "rgba(0,94,162,0.4)" : "rgba(0,94,162,0.2)"}`, color: "#005ea2", fontSize: "13" }}>
          {String(index).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: meta.bg, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: "9px", letterSpacing: "0.06em" }}>
              {insight.severity}
            </span>
            <span className="font-mono" style={{ color: "rgba(61,69,81,0.7)", fontSize: "9px" }}>{insight.category}</span>
          </div>
          <div className="font-mono font-semibold leading-snug" style={{ color: active ? "#162e51" : "#757575", fontSize: "16" }}>{insight.title}</div>
          {insight.npi && (
            <div className="font-mono mt-1" style={{ color: "rgba(61,69,81,0.7)", fontSize: "14" }}>
              NPI {insight.npi}{insight.providerName ? ` · ${insight.providerName}` : ""}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>{label}</div>
      {children}
    </div>
  )
}

function BulletList({ items, color = "#1b1b1b" }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span style={{ color: "#3d4551", fontSize: "12", flexShrink: 0, marginTop: 3 }}>—</span>
          <span className="font-mono" style={{ color, fontSize: "16", lineHeight: 1.65 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

function DetailPanel({ insight }: { insight: typeof INSIGHTS[number] }) {
  const meta = SEVERITY_META[insight.severity]
  const npiRows = insight.npi
    ? BILLING_DATA.filter(r => r.npi === insight.npi).sort((a, b) => b.year - a.year)
    : BILLING_DATA.filter(r => r.paidAmount === 0).sort((a, b) => b.claimLines - a.claimLines).slice(0, 20)

  const totalPaid = npiRows.reduce((s, r) => s + r.paidAmount, 0)
  const maxPaid   = Math.max(...npiRows.map(r => r.paidAmount), 1)

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded" style={{ border: "1px solid rgba(0,94,162,0.12)", background: "var(--card)" }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(0,94,162,0.08)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono px-2 py-0.5 rounded" style={{ background: meta.bg, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: "12", letterSpacing: "0.06em" }}>{insight.severity}</span>
          <span className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "15" }}>· {insight.category}</span>
        </div>
        <h2 className="font-display font-bold tracking-wide" style={{ color: "#162e51", fontSize: "16" }}>{insight.title}</h2>
        {insight.npi && (
          <div className="font-mono mt-1.5 flex items-center gap-2 flex-wrap">
            <span style={{ color: "#005ea2", fontSize: "16" }}>NPI {insight.npi}</span>
            {insight.providerName && <span style={{ color: "#1b1b1b", fontSize: "16" }}>— {insight.providerName}</span>}
          </div>
        )}
        {insight.revocationCodes && (
          <div className="flex flex-col gap-0.5 mt-2">
            {insight.revocationCodes.map(c => (
              <span key={c} className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "15" }}>{c}</span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>

        <Section label="EVIDENCE FROM CLAIMS DATA">
          <BulletList items={insight.evidence} />
        </Section>

        <Section label="POTENTIALLY RELEVANT SIGNALS">
          <BulletList items={insight.signals} color="#757575" />
        </Section>

        <div className="rounded p-4" style={{ background: "rgba(0,94,162,0.05)", border: "1px solid rgba(0,94,162,0.15)" }}>
          <div className="font-mono font-semibold tracking-widest mb-2" style={{ color: "#005ea2", fontSize: "12", letterSpacing: "0.12em" }}>KEY IMPLICATION</div>
          <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "16", lineHeight: 1.75 }}>{insight.implication}</p>
        </div>

        <Section label="RECOMMENDED ACTION">
          <p className="font-mono" style={{ color: "#1b1b1b", fontSize: "16", lineHeight: 1.75 }}>{insight.recommendation}</p>
        </Section>

        {insight.validationNotes && (
          <Section label="VALIDATION NOTES">
            <BulletList items={insight.validationNotes} color="#757575" />
          </Section>
        )}

        {/* Revocation records for this NPI */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono font-semibold tracking-widest" style={{ color: "var(--muted-foreground)", fontSize: "12", letterSpacing: "0.12em" }}>
              {insight.npi ? `REVOCATION RECORDS · NPI ${insight.npi}` : "REVOCATION RECORDS · ZERO-DOLLAR COHORT SAMPLE"}
            </div>
            {totalPaid > 0 && (
              <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.07)", border: "1px solid rgba(0,94,162,0.2)", color: "#005ea2", fontSize: "12" }}>
                {fmt$(totalPaid)} total
              </span>
            )}
          </div>
          {npiRows.length === 0 ? (
            <div className="font-mono rounded px-3 py-3" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.08)", color: "rgba(61,69,81,0.7)", fontSize: "15" }}>
              No billing records found for this NPI in the cohort dataset
            </div>
          ) : (
            <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(0,94,162,0.12)" }}>
              {/* Table header */}
              <div className="grid font-mono px-3 py-2"
                style={{ gridTemplateColumns: "52px 1fr 80px 72px 110px 120px", background: "rgba(0,94,162,0.05)", borderBottom: "1px solid rgba(0,94,162,0.08)", color: "rgba(61,69,81,0.9)", fontSize: "12", letterSpacing: "0.07em" }}>
                <span>YEAR</span><span>NPI</span><span>CLAIMS</span><span>PROCS</span><span>PAID AMT</span><span></span>
              </div>
              {npiRows.map((r, i) => {
                const barPct = maxPaid > 0 ? (r.paidAmount / maxPaid) * 100 : 0
                return (
                  <div key={i} className="grid items-center font-mono px-3 py-2"
                    style={{ gridTemplateColumns: "52px 1fr 80px 72px 110px 120px", borderBottom: i < npiRows.length - 1 ? "1px solid rgba(0,94,162,0.06)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(0,94,162,0.015)", fontSize: "15" }}>
                    <span style={{ color: "#757575" }}>{r.year}</span>
                    <span style={{ color: "#3d4551", fontSize: "12" }}>{r.npi}</span>
                    <span style={{ color: "#1b1b1b" }}>{r.claimLines}</span>
                    <span style={{ color: "#1b1b1b" }}>{r.procedures}</span>
                    <span style={{ color: r.paidAmount > 0 ? "#005ea2" : "rgba(61,69,81,0.5)", fontWeight: r.paidAmount > 100000 ? "bold" : "normal" }}>
                      {fmt$(r.paidAmount)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(0,94,162,0.08)" }}>
                        <div style={{ width: `${barPct}%`, height: "100%", background: r.paidAmount > 100000 ? "#b50909" : "#005ea2", opacity: 0.7, borderRadius: "9999px" }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RevocationInsights() {
  const [activeId, setActiveId] = useState<string>("g1")
  const active = INSIGHTS.find(g => g.id === activeId) ?? INSIGHTS[0]

  const totalPaid    = BILLING_DATA.reduce((s, r) => s + r.paidAmount, 0)
  const zeroDollarPct = Math.round((BILLING_DATA.filter(r => r.paidAmount === 0).length / BILLING_DATA.length) * 100)
  const criticalCount = INSIGHTS.filter(g => g.severity === "CRITICAL").length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Page header */}
      <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(61,69,81,0.08)", color: "#3d4551", border: "1px solid rgba(61,69,81,0.2)", fontSize: "13", letterSpacing: "0.12em" }}>◆ SUPERVISED LEARNING AGENT</span>
            </div>
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>REVOCATION INSIGHTS & DETECTION GAP REPORT</h2>
            <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Historical revocation lookback · what did past fraud look like before it was caught? · training signal for proactive detection</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {[
          { label: "Detection gaps",      value: String(INSIGHTS.length),     color: "#005ea2" },
          { label: "Critical / High",     value: `${criticalCount} / ${INSIGHTS.filter(g => g.severity === "HIGH").length}`, color: "#b50909" },
          { label: "Total paid (cohort)", value: fmt$(totalPaid),              color: "#005ea2" },
          { label: "Zero-dollar rate",    value: `${zeroDollarPct}%`,          color: "#b45f06" },
        ].map(k => (
          <div key={k.label} className="rounded px-3 py-2.5" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="font-mono font-bold" style={{ color: k.color, fontSize: "22px" }}>{k.value}</div>
            <div className="font-mono mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "14px", alignItems: "start" }}>

        {/* Left: insight list */}
        <div className="rounded" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(0,94,162,0.08)" }}>
            <span className="font-display font-bold tracking-widest" style={{ color: "#005ea2", fontSize: "13" }}>DETECTION GAPS</span>
          </div>
          <div className="flex flex-col p-1">
            {INSIGHTS.map((g, i) => (
              <InsightCard
                key={g.id}
                insight={g}
                index={i + 1}
                active={activeId === g.id}
                onClick={() => setActiveId(g.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail + records */}
        <DetailPanel insight={active} />
      </div>

    </div>
  )
}
