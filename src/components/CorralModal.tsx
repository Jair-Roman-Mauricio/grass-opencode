import { useGameStore } from '../store/gameStore'
import { getCapacity, getUpgradeCost, getUpgradeValue, isUpgradeMaxed } from '../game/economy'

export function CorralModal() {
  const show = useGameStore((s) => s.showCorral)
  const state = useGameStore((s) => s.state)
  const toggle = useGameStore((s) => s.toggleCorral)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)

  if (!show) return null

  const current = getCapacity(state)
  const maxed = isUpgradeMaxed(state, 'capacity')
  const cost = getUpgradeCost(state, 'capacity')
  // Valor del siguiente nivel: leer el nivel+1 del multiplicador.
  const nextLevel = state.upgrades.capacity + 1
  const nextValue = maxed ? current : getUpgradeValueAt(state, nextLevel)
  const canBuy = !maxed && cost !== null && state.money >= cost

  return (
    <div style={overlayStyle} onClick={toggle}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>🐄 CORRAL</h2>
          <button onClick={toggle} style={closeBtnStyle} aria-label="Cerrar">×</button>
        </div>
        <div style={moneyStyle}>Tienes <b>${state.money}</b></div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: '#ccc' }}>Capacidad de carga</div>
          <div style={capRowStyle}>
            <span style={curCapStyle}>{current}</span>
            {!maxed && <span style={arrowStyle}>→</span>}
            {!maxed && <span style={nextCapStyle}>{nextValue}</span>}
          </div>
          {maxed ? (
            <div style={maxedStyle}>CAPACIDAD MÁXIMA</div>
          ) : (
            <button
              style={canBuy ? buyBtnStyle : buyBtnDisabledStyle}
              disabled={!canBuy}
              onClick={() => buyUpgrade('capacity')}
            >
              AMPLIAR · ${cost}
            </button>
          )}
        </div>

        <p style={footnoteStyle}>
          Cuanto más grande el corral, más pasto puedes acarrear antes de vender.
        </p>
      </div>
    </div>
  )
}

// Lee el valor de capacidad en un nivel concreto (sin mutar estado).
function getUpgradeValueAt(state: ReturnType<typeof useGameStore.getState>['state'], level: number): number {
  const fake = { ...state, upgrades: { ...state.upgrades, capacity: level } }
  return getUpgradeValue(fake, 'capacity')
}

const GREEN = '#5CAB3E'
const GREEN_BRIGHT = '#66BB6A'

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 120,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modalStyle: React.CSSProperties = {
  width: 420, maxWidth: '92vw',
  background: 'linear-gradient(180deg, #1f1f1f 0%, #161616 100%)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24,
  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(92,171,62,0.12)',
  color: '#eee', fontFamily: "'Cinzel', 'Times New Roman', serif",
}
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: 3,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`,
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
}
const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', fontSize: 28,
  cursor: 'pointer', lineHeight: 1, width: 32, height: 32,
}
const moneyStyle: React.CSSProperties = {
  margin: '6px 0 16px', fontSize: 13, color: GREEN_BRIGHT, fontFamily: '-apple-system, sans-serif',
}
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
}
const capRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
}
const curCapStyle: React.CSSProperties = {
  fontSize: 34, fontWeight: 700, fontFamily: 'monospace', color: '#fff',
}
const arrowStyle: React.CSSProperties = { fontSize: 22, color: '#888' }
const nextCapStyle: React.CSSProperties = {
  fontSize: 34, fontWeight: 700, fontFamily: 'monospace', color: GREEN_BRIGHT,
}
const buyBtnStyle: React.CSSProperties = {
  padding: '12px 18px', border: 'none', borderRadius: 8,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`, color: '#fff',
  fontWeight: 700, fontSize: 13, letterSpacing: 1.5, cursor: 'pointer',
}
const buyBtnDisabledStyle: React.CSSProperties = {
  ...buyBtnStyle, background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'not-allowed',
}
const maxedStyle: React.CSSProperties = {
  textAlign: 'center', padding: '10px', color: GREEN_BRIGHT, fontWeight: 700, letterSpacing: 2, fontSize: 13,
}
const footnoteStyle: React.CSSProperties = {
  marginTop: 16, fontSize: 10, color: '#666', lineHeight: 1.5, fontFamily: '-apple-system, sans-serif',
}
