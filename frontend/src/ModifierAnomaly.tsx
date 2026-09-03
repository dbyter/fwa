import { useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

type InsightId = "duplicate" | "rental_conflict" | "continuous_rental"

// ── Insight 1 data: Unrecognized / conflicting modifier codes ─────────────────

const DUPLICATE_ROWS = [
  { hdr_membercode: "158292001", hdr_recordnumber: "962285_2025_82", line: 1, procedure: "K0001", category: "MANUAL_WC", startdate: "21/06/2025", mod1: "RR", mod2: "KJ", mod3: "KX", mod4: "GW", anomaly: "UNRECOGNIZED_MODIFIER_CODE" },
  { hdr_membercode: "158292001", hdr_recordnumber: "768311_2025_82", line: 1, procedure: "K0001", category: "MANUAL_WC", startdate: "21/05/2025", mod1: "RR", mod2: "KJ", mod3: "KX", mod4: "GW", anomaly: "UNRECOGNIZED_MODIFIER_CODE" },
  { hdr_membercode: "464055943", hdr_recordnumber: "109314_2025_82", line: 1, procedure: "K0001", category: "MANUAL_WC", startdate: "29/01/2025", mod1: "RR", mod2: "KJ", mod3: "GL", mod4: "KX", anomaly: "UNRECOGNIZED_MODIFIER_CODE" },
  { hdr_membercode: "453387573", hdr_recordnumber: "841747_2025_82", line: 1, procedure: "K0003", category: "MANUAL_WC", startdate: "05/05/2025", mod1: "RR", mod2: "KJ", mod3: "KX", mod4: "KT", anomaly: "UNRECOGNIZED_MODIFIER_CODE" },
]

// ── Insight 2 data: Rental/purchase conflicts ─────────────────────────────────

const RENTAL_CONFLICT_ROWS = [
  { hdr_membercode: "100807683", rental_claim: "750843_2025_82", rental_hcpcs: "E0955", rental_date: "20/05/2025", mod1: "RR", mod2: "KU", mod3: "KH", mod4: "KX", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "750843_2025_82", purchase_hcpcs: "E0971", purchase_date: "20/05/2025", pu_mod1: "NU", pu_mod2: "KU" },
  { hdr_membercode: "100807683", rental_claim: "750843_2025_82", rental_hcpcs: "E0955", rental_date: "20/05/2025", mod1: "RR", mod2: "KU", mod3: "KH", mod4: "KX", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "750843_2025_82", purchase_hcpcs: "E0956", purchase_date: "20/05/2025", pu_mod1: "NU", pu_mod2: "KU" },
  { hdr_membercode: "100807683", rental_claim: "750843_2025_82", rental_hcpcs: "E0955", rental_date: "20/05/2025", mod1: "RR", mod2: "KU", mod3: "KH", mod4: "KX", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "750843_2025_82", purchase_hcpcs: "E0954", purchase_date: "20/05/2025", pu_mod1: "NU", pu_mod2: "KU" },
  { hdr_membercode: "100807683", rental_claim: "750843_2025_82", rental_hcpcs: "E0955", rental_date: "20/05/2025", mod1: "RR", mod2: "KU", mod3: "KH", mod4: "KX", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "750843_2025_82", purchase_hcpcs: "E0973", purchase_date: "20/05/2025", pu_mod1: "NU", pu_mod2: "KU" },
  { hdr_membercode: "186416245", rental_claim: "968200_2025_82", rental_hcpcs: "E0955", rental_date: "25/06/2025", mod1: "RR", mod2: "KH", mod3: "KX", mod4: "null", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "968200_2025_82", purchase_hcpcs: "E0971", purchase_date: "25/06/2025", pu_mod1: "NU", pu_mod2: "KX" },
  { hdr_membercode: "186416245", rental_claim: "968200_2025_82", rental_hcpcs: "E0955", rental_date: "25/06/2025", mod1: "RR", mod2: "KH", mod3: "KX", mod4: "null", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "968200_2025_82", purchase_hcpcs: "E0973", purchase_date: "25/06/2025", pu_mod1: "NU", pu_mod2: "KX" },
  { hdr_membercode: "186416245", rental_claim: "968200_2025_82", rental_hcpcs: "E0955", rental_date: "25/06/2025", mod1: "RR", mod2: "KH", mod3: "KX", mod4: "null", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "968200_2025_82", purchase_hcpcs: "E0973", purchase_date: "25/06/2025", pu_mod1: "NU", pu_mod2: "KX" },
  { hdr_membercode: "186416245", rental_claim: "968200_2025_82", rental_hcpcs: "E0955", rental_date: "25/06/2025", mod1: "RR", mod2: "KH", mod3: "KX", mod4: "null", is_rental: 1, is_purchase: 0, anomaly: "RENTAL_AFTER_PURCHASE", purchase_claim: "968200_2025_82", purchase_hcpcs: "E0971", purchase_date: "25/06/2025", pu_mod1: "NU", pu_mod2: "KX" },
]

// ── Insight 3 data: Continuous rental ≥ 13 months ────────────────────────────

const CONTINUOUS_RENTAL_ROWS = [
  { member: "47179785",  claim: "70249_2025_82",   line: 1, proc: "E1382", svc_start: "19/04/2025", svc_end: "13/06/2025", billing: "null", performing: "null", pos: 12, allowed: 40.98,  paid: 29.82,  dx: "GA733", qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 3,  mod1: "RR", mod2: "N1",  mod3: "null", mod4: "null" },
  { member: "11660216",  claim: "84702_2025_82",   line: 1, proc: "E1390", svc_start: "01/03/2025", svc_end: "30/04/2025", billing: "null", performing: "null", pos: 12, allowed: 87.00,  paid: 0,      dx: "null",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 2,  mod1: "RR", mod2: "KJ",  mod3: "null", mod4: "null" },
  { member: "49625476",  claim: "74221_2025_82",   line: 2, proc: "E1392", svc_start: "07/04/2025", svc_end: "07/04/2025", billing: "null", performing: "null", pos: 12, allowed: 50.8,   paid: 40.47,  dx: "J449",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 4,  mod1: "RR", mod2: "KJ",  mod3: "null", mod4: "null" },
  { member: "39694601",  claim: "51998_2025_82",   line: 2, proc: "E1390", svc_start: "01/03/2025", svc_end: "30/04/2025", billing: "null", performing: "null", pos: 12, allowed: 87.00,  paid: 26.17,  dx: "null",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 14, mod1: "RR", mod2: "KX",  mod3: "null", mod4: "null" },
  { member: "80527921",  claim: "57866_2025_82",   line: 1, proc: "E1390", svc_start: "19/03/2025", svc_end: "19/03/2025", billing: "null", performing: "null", pos: 12, allowed: 40.61,  paid: 28.57,  dx: "null",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "RR", mod2: "KU",  mod3: "KX",   mod4: "null" },
  { member: "95764443",  claim: "46239_2025_82",   line: 1, proc: "E1392", svc_start: "19/03/2025", svc_end: "19/03/2025", billing: "null", performing: "null", pos: 12, allowed: 40.6,   paid: 0,      dx: "J448",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 15, mod1: "RR", mod2: "KJ",  mod3: "KX",   mod4: "null" },
  { member: "49438847",  claim: "54198_2025_82",   line: 1, proc: "E1390", svc_start: "19/03/2025", svc_end: "19/03/2025", billing: "null", performing: "null", pos: 12, allowed: 170.58, paid: 136.86, dx: "J489",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/02/2025", r_end: "01/06/2025", rental_month: 2,  mod1: "RR", mod2: "null", mod3: "null", mod4: "null" },
  { member: "65193743",  claim: "39881_2025_82",   line: 1, proc: "E1392", svc_start: "28/02/2025", svc_end: "28/02/2025", billing: "null", performing: "null", pos: 12, allowed: 87.00,  paid: 61.17,  dx: "null",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "RR", mod2: "KU",  mod3: "KX",   mod4: "null" },
  { member: "59116117",  claim: "43823_2025_82",   line: 1, proc: "E1390", svc_start: "25/03/2025", svc_end: "27/04/2025", billing: "null", performing: "null", pos: 12, allowed: 40.47,  paid: 0,      dx: "null",  qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "RR", mod2: "KX",  mod3: "null", mod4: "null" },
  { member: "19663517",  claim: "20172_2025_82",   line: 1, proc: "E0260", svc_start: "01/02/2025", svc_end: "21/02/2025", billing: "null", performing: "null", pos: 12, allowed: 80.82,  paid: 28.75,  dx: "B00080D", qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "KX", mod2: "null", mod3: "null", mod4: "null" },
  { member: "56891122",  claim: "17491_2025_82",   line: 1, proc: "E0601", svc_start: "04/01/2025", svc_end: "03/02/2025", billing: "null", performing: "null", pos: 12, allowed: 104.00, paid: 38.50,  dx: "GA733", qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "KX", mod2: "KJ",  mod3: "null", mod4: "null" },
  { member: "84707601",  claim: "13476625_2025_82", line: 1, proc: "E0601", svc_start: "15/01/2025", svc_end: "14/02/2025", billing: "null", performing: "null", pos: 12, allowed: 159.65, paid: 124.81, dx: "GA733", qty: 1, claim_type: 0, prog: -97, flag: "CONTINUOUS_DME_RENTAL", r_start: "01/01/2025", r_end: "01/06/2025", rental_month: 13, mod1: "KX", mod2: "null", mod3: "null", mod4: "null" },
]

// ── Modifier badge ────────────────────────────────────────────────────────────

function ModBadge({ code }: { code: string }) {
  if (!code || code === "null") return <span style={{ color: "rgba(61,69,81,0.4)" }}>—</span>
  const flagged = ["GW", "GL", "KT", "GZ", "GY", "EY", "LT", "RT", "NJ"].includes(code)
  return (
    <span className="font-mono px-1 rounded" style={{
      background: flagged ? "rgba(181,9,9,0.12)" : "rgba(0,94,162,0.06)",
      border: `1px solid ${flagged ? "rgba(181,9,9,0.3)" : "rgba(0,94,162,0.15)"}`,
      color: flagged ? "#b50909" : "#757575",
      fontSize: "13",
    }}>{code}</span>
  )
}

function AnomalyBadge({ label }: { label: string }) {
  return (
    <span className="font-mono px-1.5 py-0.5 rounded" style={{
      background: "rgba(180,95,6,0.1)", border: "1px solid rgba(180,95,6,0.25)",
      color: "#b45f06", fontSize: "12", letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{label}</span>
  )
}

function RentalMonthBadge({ n }: { n: number }) {
  const over = n >= 13
  return (
    <span className="font-mono px-1.5 py-0.5 rounded font-bold" style={{
      background: over ? "rgba(181,9,9,0.14)" : "rgba(0,94,162,0.07)",
      border: `1px solid ${over ? "rgba(181,9,9,0.35)" : "rgba(0,94,162,0.18)"}`,
      color: over ? "#b50909" : "#757575",
      fontSize: "13",
    }}>{n}{over ? " ⚠" : ""}</span>
  )
}

// ── Insight card ──────────────────────────────────────────────────────────────

interface InsightCardProps {
  id: InsightId
  index: number
  title: string
  subtitle: string
  logic: string
  stats: { label: string; value: string; highlight?: boolean }[]
  active: boolean
  onSelect: (id: InsightId) => void
}

function InsightCard({ id, index, title, subtitle, logic, stats, active, onSelect }: InsightCardProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className="text-left rounded p-4 transition-all duration-200 w-full"
      style={{
        background: active ? "rgba(0,94,162,0.07)" : "var(--card)",
        border: active ? "1px solid rgba(0,94,162,0.4)" : "1px solid rgba(0,94,162,0.12)",
        boxShadow: active ? "0 0 0 1px rgba(0,94,162,0.12) inset" : "none",
        cursor: "pointer",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-mono font-bold" style={{
          background: active ? "rgba(0,94,162,0.15)" : "rgba(0,94,162,0.07)",
          border: `1px solid ${active ? "rgba(0,94,162,0.4)" : "rgba(0,94,162,0.2)"}`,
          color: "#005ea2", fontSize: "15",
        }}>
          {String(index).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold tracking-widest mb-0.5" style={{ color: active ? "#005ea2" : "#162e51", fontSize: "16" }}>{title}</div>
          <div className="font-mono mb-2" style={{ color: "var(--muted-foreground)", fontSize: "16", lineHeight: 1.5 }}>{subtitle}</div>
          <div className="font-mono rounded px-2 py-1.5 mb-3" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.08)", color: "rgba(61,69,81,0.9)", fontSize: "16", lineHeight: 1.6 }}>
            {logic}
          </div>
          <div className="flex gap-2 flex-wrap">
            {stats.map(s => (
              <div key={s.label} className="rounded px-2 py-1" style={{ background: "rgba(0,94,162,0.04)", border: "1px solid rgba(0,94,162,0.08)" }}>
                <div className="font-mono font-bold" style={{ color: s.highlight ? "#b45f06" : "#005ea2", fontSize: "16" }}>{s.value}</div>
                <div className="font-mono" style={{ color: "var(--muted-foreground)", fontSize: "12" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 font-mono" style={{ color: active ? "#005ea2" : "rgba(61,69,81,0.5)", fontSize: "18px", marginTop: "2px" }}>
          {active ? "▼" : "▶"}
        </div>
      </div>
    </button>
  )
}

// ── Table shell ───────────────────────────────────────────────────────────────

function TableShell({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.2)" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,94,162,0.1)" }}>
        <span className="font-display font-bold tracking-widest" style={{ color: "#005ea2", fontSize: "13" }}>{title}</span>
        <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,94,162,0.08)", border: "1px solid rgba(0,94,162,0.2)", color: "#005ea2", fontSize: "12" }}>{count} RECORDS</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        {children}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-mono text-left px-3 py-2 whitespace-nowrap" style={{ color: "rgba(61,69,81,0.9)", fontSize: "12", letterSpacing: "0.06em", borderBottom: "1px solid rgba(0,94,162,0.08)", background: "rgba(0,94,162,0.03)" }}>
      {children}
    </th>
  )
}

function Td({ children, mono = true }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`${mono ? "font-mono" : ""} px-3 py-2 whitespace-nowrap`} style={{ color: "#1b1b1b", fontSize: "15", borderBottom: "1px solid rgba(0,94,162,0.05)" }}>
      {children}
    </td>
  )
}

// ── Detail tables ─────────────────────────────────────────────────────────────

function DuplicateTable() {
  return (
    <TableShell title="UNRECOGNIZED / CONFLICTING MODIFIER CODES" count={DUPLICATE_ROWS.length}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th>MEMBER CODE</Th>
            <Th>RECORD NUMBER</Th>
            <Th>LINE</Th>
            <Th>PROCEDURE</Th>
            <Th>CATEGORY</Th>
            <Th>SERVICE DATE</Th>
            <Th>MOD 1</Th>
            <Th>MOD 2</Th>
            <Th>MOD 3</Th>
            <Th>MOD 4</Th>
            <Th>ANOMALY TYPE</Th>
          </tr>
        </thead>
        <tbody>
          {DUPLICATE_ROWS.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,94,162,0.015)" }}>
              <Td>{r.hdr_membercode}</Td>
              <Td>{r.hdr_recordnumber}</Td>
              <Td>{r.line}</Td>
              <Td><span className="font-mono px-1.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#757575", fontSize: "13" }}>{r.procedure}</span></Td>
              <Td>{r.category}</Td>
              <Td>{r.startdate}</Td>
              <Td><ModBadge code={r.mod1} /></Td>
              <Td><ModBadge code={r.mod2} /></Td>
              <Td><ModBadge code={r.mod3} /></Td>
              <Td><ModBadge code={r.mod4} /></Td>
              <Td><AnomalyBadge label={r.anomaly} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

function RentalConflictTable() {
  return (
    <TableShell title="RENTAL / PURCHASE CONFLICTS" count={RENTAL_CONFLICT_ROWS.length}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th>MEMBER</Th>
            <Th>RENTAL CLAIM</Th>
            <Th>RENTAL HCPCS</Th>
            <Th>RENTAL DATE</Th>
            <Th>MOD 1</Th><Th>MOD 2</Th><Th>MOD 3</Th><Th>MOD 4</Th>
            <Th>IS RENTAL</Th>
            <Th>ANOMALY</Th>
            <Th>PURCHASE CLAIM</Th>
            <Th>PURCHASE HCPCS</Th>
            <Th>PURCHASE DATE</Th>
            <Th>PU MOD 1</Th><Th>PU MOD 2</Th>
          </tr>
        </thead>
        <tbody>
          {RENTAL_CONFLICT_ROWS.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,94,162,0.015)" }}>
              <Td>{r.hdr_membercode}</Td>
              <Td>{r.rental_claim}</Td>
              <Td><span className="font-mono px-1.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#757575", fontSize: "13" }}>{r.rental_hcpcs}</span></Td>
              <Td>{r.rental_date}</Td>
              <Td><ModBadge code={r.mod1} /></Td>
              <Td><ModBadge code={r.mod2} /></Td>
              <Td><ModBadge code={r.mod3} /></Td>
              <Td><ModBadge code={r.mod4} /></Td>
              <Td>
                <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,169,28,0.08)", border: "1px solid rgba(0,169,28,0.2)", color: "#00a91c", fontSize: "12" }}>
                  {r.is_rental}
                </span>
              </Td>
              <Td><AnomalyBadge label={r.anomaly} /></Td>
              <Td>{r.purchase_claim}</Td>
              <Td><span className="font-mono px-1.5 rounded" style={{ background: "rgba(181,9,9,0.08)", border: "1px solid rgba(181,9,9,0.2)", color: "#b50909", fontSize: "13" }}>{r.purchase_hcpcs}</span></Td>
              <Td>{r.purchase_date}</Td>
              <Td><ModBadge code={r.pu_mod1} /></Td>
              <Td><ModBadge code={r.pu_mod2} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

function ContinuousRentalTable() {
  return (
    <TableShell title="CONTINUOUS DME RENTAL ≥ 13 MONTHS" count={CONTINUOUS_RENTAL_ROWS.length}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th>MEMBER</Th>
            <Th>CLAIM</Th>
            <Th>LINE</Th>
            <Th>PROCEDURE</Th>
            <Th>SVC START</Th>
            <Th>SVC END</Th>
            <Th>POS</Th>
            <Th>ALLOWED $</Th>
            <Th>PAID $</Th>
            <Th>DX CODE</Th>
            <Th>FLAG</Th>
            <Th>RENTAL START</Th>
            <Th>RENTAL END</Th>
            <Th>RENTAL MO.</Th>
            <Th>MOD 1</Th><Th>MOD 2</Th><Th>MOD 3</Th>
          </tr>
        </thead>
        <tbody>
          {CONTINUOUS_RENTAL_ROWS.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,94,162,0.015)" }}>
              <Td>{r.member}</Td>
              <Td>{r.claim}</Td>
              <Td>{r.line}</Td>
              <Td><span className="font-mono px-1.5 rounded" style={{ background: "rgba(0,94,162,0.08)", color: "#757575", fontSize: "13" }}>{r.proc}</span></Td>
              <Td>{r.svc_start}</Td>
              <Td>{r.svc_end}</Td>
              <Td>{r.pos}</Td>
              <Td><span style={{ color: "#005ea2" }}>${r.allowed.toFixed(2)}</span></Td>
              <Td><span style={{ color: r.paid === 0 ? "rgba(61,69,81,0.5)" : "#1b1b1b" }}>${r.paid.toFixed(2)}</span></Td>
              <Td>{r.dx && r.dx !== "null" ? r.dx : <span style={{ color: "rgba(61,69,81,0.4)" }}>—</span>}</Td>
              <Td><AnomalyBadge label={r.flag} /></Td>
              <Td>{r.r_start}</Td>
              <Td>{r.r_end}</Td>
              <Td><RentalMonthBadge n={r.rental_month} /></Td>
              <Td><ModBadge code={r.mod1} /></Td>
              <Td><ModBadge code={r.mod2} /></Td>
              <Td><ModBadge code={r.mod3} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const INSIGHTS: { id: InsightId; title: string; subtitle: string; logic: string; stats: { label: string; value: string; highlight?: boolean }[] }[] = [
  {
    id: "duplicate",
    title: "UNRECOGNIZED & CONFLICTING MODIFIERS",
    subtitle: "Modifier outside the approved wheelchair DME whitelist, or mutually exclusive pair billed on the same claim line",
    logic: "Whitelist: RR, NJ, UE, KX, KH, KI, KJ, KC, LT, RT, GA, GY, GZ, EY · Exclusive pairs: (RR + NJ/UE), (NJ + UE), (LT + RT)",
    stats: [
      { label: "Flagged claims", value: "4" },
      { label: "Unique members", value: "3" },
      { label: "Anomaly type", value: "UNRECOGNIZED", highlight: true },
    ],
  },
  {
    id: "rental_conflict",
    title: "RENTAL / PURCHASE CONFLICTS",
    subtitle: "Wheelchair rental billed on the same line as a purchase, or rental service dated on or after a prior purchase claim",
    logic: "Join rental lines (mod RR) to purchase lines (mod NU) on same member · flag when rental_date ≥ purchase_date",
    stats: [
      { label: "Conflicting pairs", value: "8" },
      { label: "Unique members", value: "2" },
      { label: "Anomaly type", value: "RENTAL_AFTER_PURCHASE", highlight: true },
    ],
  },
  {
    id: "continuous_rental",
    title: "CONTINUOUS RENTAL ≥ 13 MONTHS",
    subtitle: "Claim lines classified as DME rentals where the rolling rental window has reached or exceeded the 13-month Medicare cap",
    logic: "Classify lines as new equipment (NU) or rental (RR). Track rental months per member-equipment pair · flag when Continuous_Rental_Month ≥ 13",
    stats: [
      { label: "Flagged records", value: "12" },
      { label: "Members at cap", value: "8", highlight: true },
      { label: "Max rental months", value: "15 mo", highlight: true },
    ],
  },
]

export default function ModifierAnomaly({ onNavigateToAgent }: { onNavigateToAgent?: (agentId: string) => void } = {}) {
  const [activeInsight, setActiveInsight] = useState<InsightId | null>(null)

  function handleSelect(id: InsightId) {
    setActiveInsight(prev => prev === id ? null : id)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Page header */}
      <div className="bracket-card rounded p-4" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {[
                { label: "Supervised Learning", agentId: "supervised" },
                { label: "Claims & Payment",    agentId: "claims"     },
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
            <h2 className="font-display text-sm font-bold tracking-widest" style={{ color: "#162e51" }}>ACTIVE THREAT DETECTION</h2>
            <p className="font-mono text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Wheelchair DME modifier validation · rental/purchase conflict detection · continuous rental cap monitoring</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {[
          { label: "Total flagged records", value: "24", color: "#b50909" },
          { label: "Unique members affected", value: "13", color: "#b45f06" },
          { label: "Anomaly types", value: "3", color: "#005ea2" },
          { label: "Rental cap violations", value: "8", color: "#b50909" },
        ].map(s => (
          <div key={s.label} className="rounded px-3 py-2.5" style={{ background: "var(--card)", border: "1px solid rgba(0,94,162,0.12)" }}>
            <div className="font-mono font-bold" style={{ color: s.color, fontSize: "22px" }}>{s.value}</div>
            <div className="font-mono mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "13" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insight cards + detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: activeInsight ? "380px 1fr" : "1fr", gap: "14px", alignItems: "start" }}>

        {/* Left: cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {INSIGHTS.map((ins, i) => (
            <InsightCard
              key={ins.id}
              id={ins.id}
              index={i + 1}
              title={ins.title}
              subtitle={ins.subtitle}
              logic={ins.logic}
              stats={ins.stats}
              active={activeInsight === ins.id}
              onSelect={handleSelect}
            />
          ))}
          {!activeInsight && (
            <p className="font-mono text-center mt-2" style={{ color: "rgba(61,69,81,0.6)", fontSize: "15" }}>
              ↑ select an insight to view the underlying data
            </p>
          )}
        </div>

        {/* Right: detail table */}
        {activeInsight && (
          <div>
            {activeInsight === "duplicate"        && <DuplicateTable />}
            {activeInsight === "rental_conflict"  && <RentalConflictTable />}
            {activeInsight === "continuous_rental" && <ContinuousRentalTable />}
          </div>
        )}
      </div>

    </div>
  )
}
