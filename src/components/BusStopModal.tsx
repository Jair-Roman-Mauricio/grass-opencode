import { useGameStore } from '../store/gameStore'
import { MAPS } from '../game/constants'
import { isMapOwned, travelCost } from '../game/maps'

export function BusStopModal() {
  const show = useGameStore((s) => s.showBusStop)
  const state = useGameStore((s) => s.state)
  const toggle = useGameStore((s) => s.toggleBusStop)
  const buyTicket = useGameStore((s) => s.buyTicket)
  const travelTo = useGameStore((s) => s.travelTo)

  if (!show) return null

  return (
    <div style={overlayStyle} onClick={toggle}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>🚌 PARADA DE AUTOBÚS</h2>
          <button onClick={toggle} style={closeBtnStyle} aria-label="Cerrar">×</button>
        </div>
        <div style={moneyStyle}>Tienes <b>${state.money}</b></div>

        <div style={listStyle}>
          {MAPS.map((map) => {
            const owned = isMapOwned(state, map.id)
            const here = state.currentMap === map.id
            const cost = travelCost(state, map.id)
            return (
              <div key={map.id} style={{ ...rowStyle, ...(here ? rowHereStyle : {}) }}>
                <div style={{ flex: 1 }}>
                  <div style={rowTitleStyle}>
                    {map.name}
                    {here && <span style={tagHereStyle}>AQUÍ</span>}
                    {map.comingSoon && <span style={tagSoonStyle}>PRÓXIMAMENTE</span>}
                  </div>
                  <div style={rowDescStyle}>{map.desc}</div>
                </div>
                <div style={actionColStyle}>
                  {here ? (
                    <span style={hereLabelStyle}>Estás aquí</span>
                  ) : owned ? (
                    <button
                      style={cost === 0 ? freeBtnStyle : payBtnStyle}
                      disabled={state.money < cost}
                      onClick={() => travelTo(map.id)}
                    >
                      {cost === 0 ? 'VIAJAR (gratis)' : `VIAJAR ($${cost})`}
                    </button>
                  ) : map.comingSoon ? (
                    <button style={disabledBtnStyle} disabled>BOLETO ${map.ticketCost}</button>
                  ) : (
                    <button
                      style={buyBtnStyle}
                      disabled={state.money < map.ticketCost}
                      onClick={() => buyTicket(map.id)}
                    >
                      COMPRAR BOLETO ${map.ticketCost}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p style={footnoteStyle}>
          Comprar un boleto desbloquea el destino. Volver a La Parcela siempre es gratis;
          regresar a otros mapas cuesta una tarifa.
        </p>
      </div>
    </div>
  )
}

const GREEN = '#5CAB3E'
const GREEN_BRIGHT = '#66BB6A'

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 120,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modalStyle: React.CSSProperties = {
  width: 540, maxWidth: '92vw',
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
  margin: '6px 0 16px', fontSize: 13, color: GREEN_BRIGHT,
  fontFamily: '-apple-system, sans-serif',
}
const listStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 }
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
}
const rowHereStyle: React.CSSProperties = {
  borderColor: 'rgba(92,171,62,0.4)', background: 'rgba(92,171,62,0.08)',
}
const rowTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
}
const rowDescStyle: React.CSSProperties = {
  fontSize: 11, color: '#999', marginTop: 4, fontFamily: '-apple-system, sans-serif',
}
const tagHereStyle: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4, background: GREEN, color: '#fff', letterSpacing: 1,
}
const tagSoonStyle: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4,
  background: 'rgba(255,255,255,0.1)', color: '#aaa', letterSpacing: 1,
}
const actionColStyle: React.CSSProperties = { flexShrink: 0 }
const hereLabelStyle: React.CSSProperties = {
  fontSize: 11, color: '#888', fontFamily: '-apple-system, sans-serif',
}
const baseBtn: React.CSSProperties = {
  padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
  fontWeight: 700, fontSize: 11, letterSpacing: 1,
}
const buyBtnStyle: React.CSSProperties = {
  ...baseBtn, background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`, color: '#fff',
}
const payBtnStyle: React.CSSProperties = {
  ...baseBtn, background: 'linear-gradient(135deg, #d8a23f, #b5832a)', color: '#fff',
}
const freeBtnStyle: React.CSSProperties = {
  ...baseBtn, background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`, color: '#fff',
}
const disabledBtnStyle: React.CSSProperties = {
  ...baseBtn, background: 'rgba(255,255,255,0.06)', color: '#666', cursor: 'not-allowed',
}
const footnoteStyle: React.CSSProperties = {
  marginTop: 18, fontSize: 10, color: '#666', lineHeight: 1.5,
  fontFamily: '-apple-system, sans-serif',
}
