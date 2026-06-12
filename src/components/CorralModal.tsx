import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCapacity, getUpgradeCost, getUpgradeValue, isUpgradeMaxed } from '../game/economy'
import { formatNum } from '../utils/utils'

const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
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

function getUpgradeValueAt(
  state: ReturnType<typeof useGameStore.getState>['state'],
  level: number,
): number {
  const fake = { ...state, upgrades: { ...state.upgrades, capacity: level } }
  return getUpgradeValue(fake, 'capacity')
}

export function CorralModal() {
  const show = useGameStore((s) => s.showCorral)
  const state = useGameStore((s) => s.state)
  const toggle = useGameStore((s) => s.toggleCorral)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)

  useEffect(() => {
    if (!show) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [show, toggle])

  if (!show) return null

  const current = getCapacity(state)
  const maxed = isUpgradeMaxed(state, 'capacity')
  const cost = getUpgradeCost(state, 'capacity')
  const nextLevel = state.upgrades.capacity + 1
  const nextValue = maxed ? current : getUpgradeValueAt(state, nextLevel)
  const canBuy = !maxed && cost !== null && state.money >= cost

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={toggle}>
      <div className="modal-content" style={outerFrameStyle} onClick={(e) => e.stopPropagation()}>
        <div style={tabBarStyle}>
          <div style={activeTabStyle}>
            <span style={{ fontSize: 18 }}>🐄</span>
            <span style={tabLabelStyle}>Corral</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={toggle} style={closeTabBtnStyle} aria-label="Cerrar">✕</button>
        </div>

        <div style={innerPlaqueStyle}>
          <div style={moneyStyle}>
            <GoldCoin size={20} />
            <span>{formatNum(state.money)}</span>
          </div>

          <div style={cardStyle}>
            <div style={iconWrapStyle}>
              <span style={{ fontSize: 36 }}>📦</span>
            </div>

            <div style={sectionLabelStyle}>Capacidad de carga</div>

            <div style={capRowStyle}>
              <div style={capBlockStyle}>
                <span style={capLabelStyle}>Actual</span>
                <span style={curCapStyle}>{current}</span>
              </div>
              {!maxed && (
                <>
                  <span style={arrowStyle}>→</span>
                  <div style={capBlockStyle}>
                    <span style={capLabelStyle}>Siguiente</span>
                    <span style={nextCapStyle}>{nextValue}</span>
                  </div>
                </>
              )}
            </div>

            {maxed ? (
              <div style={maxedStyle}>CAPACIDAD MÁXIMA</div>
            ) : (
              <button
                style={{
                  ...actionBtnBase,
                  ...(canBuy ? actionBtnActive : actionBtnDisabled),
                }}
                disabled={!canBuy}
                onClick={() => buyUpgrade('capacity')}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  AMPLIAR <GoldCoin size={16} /> {cost !== null ? formatNum(cost) : '—'}
                </span>
              </button>
            )}
          </div>

          <p style={footnoteStyle}>
            Cuanto más grande el corral, más pasto puedes acarrear antes de vender.
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
  maxWidth: 440,
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

const cardStyle: React.CSSProperties = {
  marginTop: 28,
  background: `linear-gradient(180deg, ${LIGHT_CREAM} 0%, #e8c88a 100%)`,
  border: `2px solid ${SLOT_BORDER}`,
  borderRadius: 8,
  padding: '20px 18px 18px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 14,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.1)',
}

const iconWrapStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #d4af75 0%, #c49a60 100%)',
  border: `2px solid ${SLOT_BORDER}`,
  borderRadius: 8,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 22,
  fontWeight: 'bold',
  color: TEXT_DARK,
  letterSpacing: 1,
  textTransform: 'uppercase',
}

const capRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  width: '100%',
}

const capBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
}

const capLabelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  color: WOOD_MID,
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const curCapStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 42,
  fontWeight: 'bold',
  color: TEXT_DARK,
  lineHeight: 1,
}

const arrowStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 32,
  color: WOOD_MID,
  lineHeight: 1,
}

const nextCapStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 42,
  fontWeight: 'bold',
  color: '#1b5e20',
  lineHeight: 1,
}

const actionBtnBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 18px',
  border: `2px solid ${WOOD_DARK}`,
  borderRadius: 4,
  fontFamily: PIXEL_FONT,
  fontSize: 18,
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
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

const maxedStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  textAlign: 'center',
  padding: '10px',
  color: '#1b5e20',
  fontWeight: 'bold',
  letterSpacing: 2,
  fontSize: 20,
  border: `2px dashed ${SLOT_BORDER}`,
  borderRadius: 6,
  width: '100%',
  background: '#d4af75',
}

const footnoteStyle: React.CSSProperties = {
  marginTop: 16,
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  color: WOOD_MID,
  lineHeight: 1.4,
  opacity: 0.85,
  textAlign: 'center',
}
