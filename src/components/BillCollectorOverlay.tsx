import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { audioManager } from '../audio/AudioManager'
import { MIN_DEBTS_TO_PAY } from '../game/constants'
import { paidCount, isMandatoryMet, rescuePlan } from '../game/bills'

export function BillCollectorOverlay() {
  const show = useGameStore((s) => s.showBills)
  const bills = useGameStore((s) => s.bills)
  const money = useGameStore((s) => s.state.money)
  const savings = useGameStore((s) => s.state.savings)
  const day = useGameStore((s) => s.state.day)
  const family = useGameStore((s) => s.family)
  const payDebt = useGameStore((s) => s.payDebt)
  const resolveDay = useGameStore((s) => s.resolveDay)
  const triggerGameOver = useGameStore((s) => s.triggerGameOver)
  const depositSavings = useGameStore((s) => s.depositSavings)
  const withdrawSavings = useGameStore((s) => s.withdrawSavings)

  const [phase, setPhase] = useState<'knock' | 'ledger'>('knock')

  useEffect(() => {
    if (!show) return
    setPhase('knock')
    audioManager.startCinematic()
    const t1 = window.setTimeout(() => audioManager.playCinePanel(), 500)
    const t2 = window.setTimeout(() => setPhase('ledger'), 1800)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      audioManager.endCinematic()
    }
  }, [show])

  if (!show || !bills) return null

  const paid = paidCount(bills)
  const met = isMandatoryMet(bills, MIN_DEBTS_TO_PAY)
  const plan = rescuePlan(bills, MIN_DEBTS_TO_PAY) // lo que faltaría cubrir con el colchón
  const cushionCovers = !met && savings >= plan.cost
  const canContinue = met || cushionCovers
  const doomed = !canContinue

  // Previsualización: ▲ si TODAS las cuentas asignadas a ese familiar están pagadas
  // (subirá de salud), ▼ si alguna queda impaga (bajará). Muerto = sin cambio.
  const preview = (name: string): '▲' | '▼' | '' => {
    const assigned = bills.filter((b) => b.member === name)
    if (assigned.length === 0) return ''
    return assigned.every((d) => d.paid) ? '▲' : '▼'
  }

  if (phase === 'knock') {
    return (
      <div style={overlayStyle}>
        <div style={knockWrapStyle}>
          <CollectorPix />
          <div style={knockKnockStyle}>TOC… TOC…</div>
          <p style={knockLineStyle}>«Vengo por lo del viejo. Ahora es tuyo.»</p>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <div style={screenStyle}>
        {/* banner */}
        <div style={bannerWrapStyle}>
          <div style={bannerStyle}>FIN DEL DÍA {day}</div>
        </div>
        <p style={instructionStyle}>
          Paga tus cuentas haciendo clic en el selector. Cubre al menos {MIN_DEBTS_TO_PAY} o el
          cobrador se cobra con tu familia.
        </p>

        <div style={bodyStyle}>
          {/* libro de cuentas */}
          <div style={ledgerStyle}>
            <Row label="DINERO" value={money} bold />
            {/* AHORROS: colchón opcional. Guardas el sobrante; cubre el día que no cumplas. */}
            <div style={savingsRowStyle}>
              <span style={{ color: '#e8e3d6' }}>AHORROS</span>
              <span style={{ color: '#7CC55A', minWidth: 56, textAlign: 'right', fontFamily: 'monospace' }}>${savings}</span>
              <button style={miniBtnStyle} disabled={money <= 0} onClick={depositSavings} title="Guardar todo el dinero">▲</button>
              <button style={miniBtnStyle} disabled={savings <= 0} onClick={withdrawSavings} title="Retirar todo el ahorro">▼</button>
            </div>
            <div style={{ height: 10 }} />
            {bills.map((d, i) => {
              const affordable = d.paid || money >= d.amount
              const mandatory = d.member === ''
              return (
                <button
                  key={i}
                  onClick={() => payDebt(i)}
                  disabled={!affordable}
                  style={debtRowStyle(affordable)}
                >
                  <span style={selectorStyle}>{d.paid ? '◉' : '○'}</span>
                  <span style={{ flex: 1, color: d.paid ? '#7d8870' : '#c25646' }}>
                    {d.name}
                    {mandatory && <span style={mandTagStyle}>OBLIGATORIA</span>}
                    {d.member && <span style={{ color: '#7a8068', fontSize: 11 }}> → {d.member}</span>}
                  </span>
                  <span style={{ color: d.paid ? '#7d8870' : '#c25646', minWidth: 56, textAlign: 'right' }}>
                    {d.paid ? `(${d.amount})` : `-${d.amount}`}
                  </span>
                </button>
              )
            })}
          </div>

          {/* familia */}
          <div style={familyColStyle}>
            {family.map((m) => {
              const dead = m.status === 'muerte'
              const pv = dead ? '' : preview(m.name)
              return (
                <div key={m.name} style={familyItemStyle}>
                  <div style={{ ...badgeStyle, ...HEALTH_BADGE[m.status] }}>
                    {HEALTH_LABEL[m.status]}
                  </div>
                  <div style={familyNameStyle}>
                    {m.name}
                    {pv && <span style={{ color: pv === '▲' ? '#7CC55A' : '#c25646', marginLeft: 4 }}>{pv}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={footerStyle}>
          <span style={{ color: met ? '#7CC55A' : cushionCovers ? '#7CC55A' : '#d8a23f', fontSize: 13 }}>
            Pagadas {paid}/{bills.length} · paga el abuelo + {MIN_DEBTS_TO_PAY} en total
          </span>
          {doomed ? (
            <button style={doomBtnStyle} onClick={triggerGameOver}>ACEPTAR DESTINO ☠</button>
          ) : (
            <button style={continueBtnStyle} onClick={resolveDay}>CONTINUAR ▶</button>
          )}
        </div>
        {cushionCovers && (
          <p style={cushionTextStyle}>Tu colchón cubrirá lo que falta: −${plan.cost} de tus ahorros.</p>
        )}
        {doomed && (
          <p style={doomTextStyle}>No cumples (falta el abuelo o el mínimo) y no tienes colchón. El cobrador sonríe.</p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: '#e8e3d6' }}>{label}</span>
      <span style={{ color: value < 0 ? '#c25646' : '#e8e3d6', minWidth: 56, textAlign: 'right' }}>
        {bold ? `$${value}` : value}
      </span>
    </div>
  )
}

/** Cobrador pixel-art (traje oscuro, maletín). */
function CollectorPix() {
  const u = 6
  const p = (x: number, y: number, w: number, h: number, f: string) =>
    <rect x={x * u} y={y * u} width={w * u} height={h * u} fill={f} />
  return (
    <svg viewBox="0 0 144 144" width="180" height="180" shapeRendering="crispEdges" style={{ imageRendering: 'pixelated' }}>
      <rect x={0} y={0} width={144} height={144} fill="#15161c" />
      {/* sombrero + cabeza */}
      {p(8, 4, 8, 2, '#11141a')}
      {p(9, 6, 6, 4, '#caa078')}
      {p(10, 7, 1, 1, '#11141a')}
      {p(13, 7, 1, 1, '#11141a')}
      {p(10, 9, 4, 1, '#11141a')}
      {/* traje */}
      {p(8, 10, 8, 8, '#2b2b3a')}
      {p(11, 10, 2, 8, '#1c1c28')}
      {/* maletín */}
      {p(16, 14, 5, 4, '#3a2a1a')}
      {p(18, 13, 1, 1, '#3a2a1a')}
    </svg>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 250,
  background: 'radial-gradient(ellipse at center, #14140f 0%, #050505 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const knockWrapStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  animation: 'introPanelIn 0.4s ease-out',
}
const knockKnockStyle: React.CSSProperties = {
  fontSize: 24, letterSpacing: 6, color: '#d8a23f', fontWeight: 800, fontFamily: 'monospace',
}
const knockLineStyle: React.CSSProperties = {
  fontSize: 16, color: '#e8e2d8', fontStyle: 'italic', fontFamily: "'Georgia', serif",
}

const screenStyle: React.CSSProperties = {
  width: 'min(680px, 94vw)', padding: '28px 30px',
  background: '#0c0d0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
  color: '#e8e3d6', fontFamily: "'Courier New', monospace",
  boxShadow: '0 24px 70px rgba(0,0,0,0.8)',
}
const bannerWrapStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', marginBottom: 12 }
const bannerStyle: React.CSSProperties = {
  padding: '6px 28px', background: '#4a5740', color: '#e8e3d6',
  fontWeight: 700, letterSpacing: 4, fontSize: 16,
  clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)',
}
const instructionStyle: React.CSSProperties = {
  textAlign: 'center', fontSize: 12, color: '#b9b39c', margin: '0 auto 22px', maxWidth: 520, lineHeight: 1.5,
}
const bodyStyle: React.CSSProperties = { display: 'flex', gap: 28, alignItems: 'flex-start' }
const savingsRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontWeight: 400,
}
const miniBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
  background: 'rgba(124,197,90,0.18)', color: '#7CC55A', fontWeight: 700, fontSize: 12,
  fontFamily: "'Courier New', monospace",
}
const mandTagStyle: React.CSSProperties = {
  marginLeft: 8, fontSize: 9, padding: '1px 6px', borderRadius: 4,
  background: '#7e2d23', color: '#f0d0c8', letterSpacing: 1,
}
const cushionTextStyle: React.CSSProperties = {
  marginTop: 12, fontSize: 12, color: '#7CC55A', fontStyle: 'italic', textAlign: 'right',
}
const ledgerStyle: React.CSSProperties = { flex: 1, fontSize: 15, letterSpacing: 1 }
const debtRowStyle = (enabled: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  background: 'transparent', border: 'none', padding: '3px 0',
  fontFamily: "'Courier New', monospace", fontSize: 15, letterSpacing: 1,
  cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5,
})
const selectorStyle: React.CSSProperties = { color: '#c25646', width: 16 }
const dottedStyle: React.CSSProperties = {
  borderTop: '2px dotted rgba(255,255,255,0.3)', margin: '8px 0',
}
const familyColStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 24,
  borderLeft: '1px solid rgba(255,255,255,0.08)',
}
const familyItemStyle: React.CSSProperties = { textAlign: 'center' }
const badgeStyle: React.CSSProperties = {
  width: 56, height: 56, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#3c4a34', color: '#cfe0bf', fontWeight: 700, fontSize: 12, letterSpacing: 1,
  border: '2px solid #57694a',
}
const HEALTH_LABEL: Record<string, string> = {
  bien: 'BIEN', mal: 'MAL', muymal: 'MUY MAL', muerte: '💀',
}
const HEALTH_BADGE: Record<string, React.CSSProperties> = {
  bien: {},
  mal: { background: '#4a3a20', color: '#e7cfaa', border: '2px solid #8a6a2a' },
  muymal: { background: '#4a2a1a', color: '#e7b08a', border: '2px solid #a8541f' },
  muerte: { background: '#2a2a2e', color: '#9aa0aa', border: '2px solid #4a4a52' },
}
const familyNameStyle: React.CSSProperties = { fontSize: 11, color: '#b9b39c', marginTop: 5 }
const footerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24,
}
const continueBtnStyle: React.CSSProperties = {
  padding: '12px 26px', border: 'none', borderRadius: 4,
  background: 'linear-gradient(135deg, #6f8456, #4a5740)', color: '#fff',
  fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer', fontFamily: "'Courier New', monospace",
}
const continueDisabledStyle: React.CSSProperties = {
  ...continueBtnStyle, background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'not-allowed',
}
const doomBtnStyle: React.CSSProperties = {
  padding: '12px 26px', border: 'none', borderRadius: 4,
  background: 'linear-gradient(135deg, #b14334, #7e2d23)', color: '#fff',
  fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer', fontFamily: "'Courier New', monospace",
}
const doomTextStyle: React.CSSProperties = {
  marginTop: 12, fontSize: 12, color: '#d8857a', fontStyle: 'italic', textAlign: 'right',
}
