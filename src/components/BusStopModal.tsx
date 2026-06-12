import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { MAPS } from '../game/constants'
import { isMapOwned, travelCost } from '../game/maps'
import { formatNum } from '../utils/utils'

const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
const SELECTED_BORDER = '#e63b2e'
const PIXEL_FONT = "'VT323', monospace"
const TEXT_DARK = '#3a2010'

function GoldCoin({ size = 18 }: { size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'radial-gradient(circle at 35% 30%, #fff8a0 0%, #f0d060 50%, #d4a020 80%, #8B6914 100%)',
      border: `1.5px solid ${WOOD_DARK}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      <span style={{
        fontFamily: PIXEL_FONT,
        fontSize: size * 0.65,
        fontWeight: 'bold',
        color: WOOD_DARK,
        lineHeight: 1,
      }}>G</span>
    </div>
  )
}

export function BusStopModal() {
  const show = useGameStore((s) => s.showBusStop)
  const state = useGameStore((s) => s.state)
  const toggle = useGameStore((s) => s.toggleBusStop)
  const buyTicket = useGameStore((s) => s.buyTicket)
  const travelTo = useGameStore((s) => s.travelTo)

  useEffect(() => {
    if (!show) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [show, toggle])

  if (!show) return null

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={toggle}>
      <div className="modal-content" style={outerFrameStyle} onClick={(e) => e.stopPropagation()}>
        <div style={tabBarStyle}>
          <div style={activeTabStyle}>
            <span style={{ fontSize: 18 }}>🚌</span>
            <span style={tabLabelStyle}>Parada de autobús</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={toggle} style={closeTabBtnStyle} aria-label="Cerrar">✕</button>
        </div>

        <div style={innerPlaqueStyle}>
          <div style={moneyStyle}>
            <GoldCoin size={20} />
            <span>{formatNum(state.money)}</span>
          </div>

          <div style={listStyle}>
            {MAPS.map((map) => {
              const owned = isMapOwned(state, map.id)
              const here = state.currentMap === map.id
              const cost = travelCost(state, map.id)
              return (
                <div
                  key={map.id}
                  style={{
                    ...rowStyle,
                    ...(here ? rowHereStyle : {}),
                  }}
                >
                  <div style={iconWrapStyle}>
                    <span style={{ fontSize: 28 }}>🗺️</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                        style={{
                          ...actionBtnBase,
                          ...(state.money >= cost ? actionBtnActive : actionBtnDisabled),
                        }}
                        disabled={state.money < cost}
                        onClick={() => travelTo(map.id)}
                      >
                        {cost === 0 ? 'VIAJAR' : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            VIAJAR <GoldCoin size={14} /> {formatNum(cost)}
                          </span>
                        )}
                      </button>
                    ) : map.comingSoon ? (
                      <button style={actionBtnDisabled} disabled>
                        BOLETO {formatNum(map.ticketCost)}
                      </button>
                    ) : (
                      <button
                        style={{
                          ...actionBtnBase,
                          ...(state.money >= map.ticketCost ? actionBtnActive : actionBtnDisabled),
                        }}
                        disabled={state.money < map.ticketCost}
                        onClick={() => buyTicket(map.id)}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          COMPRAR <GoldCoin size={14} /> {formatNum(map.ticketCost)}
                        </span>
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
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.72)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 120,
}

const outerFrameStyle: React.CSSProperties = {
  position: 'relative',
  width: '92%',
  maxWidth: 560,
  background: `linear-gradient(135deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  border: `5px solid ${WOOD_DARK}`,
  borderRadius: 12,
  padding: '8px 12px 14px 12px',
  boxShadow: '0 12px 36px rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.4)',
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: -38,
  paddingLeft: 4,
  marginBottom: 10,
  alignItems: 'flex-end',
}

const activeTabStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
  border: `3px solid ${WOOD_DARK}`,
  borderBottom: 'none',
  borderRadius: '8px 8px 0 0',
  padding: '6px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6)',
}

const tabLabelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  fontWeight: 'bold',
  color: WOOD_DARK,
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const closeTabBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #ff6b6b 0%, #d63031 100%)',
  border: `3px solid ${WOOD_DARK}`,
  borderRadius: '8px 8px 0 0',
  padding: '4px 14px',
  color: '#fff',
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  lineHeight: 1.2,
}

const innerPlaqueStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
  border: `4px solid ${WOOD_DARK}`,
  borderRadius: 8,
  boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.15)',
  padding: '20px 16px 16px',
  position: 'relative',
}

const moneyStyle: React.CSSProperties = {
  position: 'absolute',
  top: 10,
  left: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px 4px 6px',
  borderRadius: 6,
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 100%)`,
  border: `2px solid ${WOOD_DARK}`,
  color: CREAM,
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  fontWeight: 'bold',
  textShadow: `0 1px 0 ${WOOD_DARK}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
}

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 28,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  background: `linear-gradient(180deg, ${LIGHT_CREAM} 0%, #e8c88a 100%)`,
  border: `2px solid ${SLOT_BORDER}`,
  borderRadius: 8,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.1)',
}

const rowHereStyle: React.CSSProperties = {
  border: `3px solid ${SELECTED_BORDER}`,
  background: 'linear-gradient(180deg, #fff6d1 0%, #f8e0a8 100%)',
  boxShadow: '0 0 8px rgba(230, 59, 46, 0.35), inset 0 2px 0 rgba(255,255,255,0.5)',
}

const iconWrapStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #d4af75 0%, #c49a60 100%)',
  border: `2px solid ${SLOT_BORDER}`,
  borderRadius: 8,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
}

const rowTitleStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 22,
  fontWeight: 'bold',
  color: TEXT_DARK,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const rowDescStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  color: WOOD_MID,
  marginTop: 4,
  lineHeight: 1.25,
}

const tagHereStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 14,
  padding: '2px 8px',
  borderRadius: 4,
  background: 'linear-gradient(180deg, #6aab4e 0%, #4a8a2e 100%)',
  color: CREAM,
  letterSpacing: 1,
  border: `1px solid ${WOOD_DARK}`,
}

const tagSoonStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 14,
  padding: '2px 8px',
  borderRadius: 4,
  background: `linear-gradient(180deg, #c4a070 0%, ${WOOD_MID} 100%)`,
  color: WOOD_DARK,
  letterSpacing: 1,
  border: `1px solid ${WOOD_DARK}`,
}

const actionColStyle: React.CSSProperties = { flexShrink: 0 }

const hereLabelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 18,
  color: WOOD_MID,
  fontWeight: 'bold',
}

const actionBtnBase: React.CSSProperties = {
  padding: '8px 14px',
  border: `2px solid ${WOOD_DARK}`,
  borderRadius: 4,
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
}

const actionBtnActive: React.CSSProperties = {
  background: 'linear-gradient(180deg, #6aab4e 0%, #4a8a2e 50%, #2a6a0e 100%)',
  color: CREAM,
  textShadow: `0 1px 0 ${WOOD_DARK}`,
}

const actionBtnDisabled: React.CSSProperties = {
  background: `linear-gradient(180deg, #c4a070 0%, #a08050 50%, ${WOOD_MID} 100%)`,
  color: WOOD_DARK,
  cursor: 'not-allowed',
}

const footnoteStyle: React.CSSProperties = {
  marginTop: 16,
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  color: WOOD_MID,
  lineHeight: 1.4,
  opacity: 0.85,
}
