import { useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { formatNum } from '../utils/utils'
import { ItemPixelIcon } from './shop/ShopPixelIcons'

/* ── Paleta inventario / Stardew ── */
const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
const SELECTED_BORDER = '#e63b2e'
const PIXEL_FONT = "'VT323', monospace"
const TEXT_DARK = '#3a2010'

export interface ShopItem {
  id: string
  icon: string
  name: string
  sub?: string
  /** Precio numérico; si es 0 se muestra "GRATIS". Omitir si no aplica. */
  price?: number
  /** Etiqueta del botón principal (por defecto "BUY"). */
  buyLabel?: string
  buyDisabled?: boolean
  buyHidden?: boolean
  onBuy?: () => void
  /** Si el item es seleccionable (semillas), resalta el seleccionado. */
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  /** Badge de estado (p.ej. "MAX", "EQUIPADO", "BLOQUEADO"). */
  badge?: string
}

interface ShopModalProps {
  title: string
  money: number
  items: ShopItem[]
  onClose: () => void
  pageSize?: number
}

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

export function ShopModal({ title, money, items, onClose, pageSize = 3 }: ShopModalProps) {
  const isMobile = useIsMobile()
  const effectivePageSize = isMobile ? 1 : pageSize
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / effectivePageSize))
  const clampedPage = Math.min(page, pages - 1)
  const start = clampedPage * effectivePageSize
  const visible = items.slice(start, start + effectivePageSize)

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
      <div className="modal-content" style={outerFrameStyle} onClick={(e) => e.stopPropagation()}>
        {/* Pestaña título */}
        <div style={tabBarStyle}>
          <div style={activeTabStyle}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={tabLabelStyle}>{title}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button style={closeTabBtnStyle} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Panel interior */}
        <div style={innerPlaqueStyle}>
          {/* Saldo */}
          <div style={moneyStyle}>
            <GoldCoin size={20} />
            <span>{formatNum(money)}</span>
          </div>

          <div style={cardsAreaStyle}>
            {/* Flecha izquierda */}
            {pages > 1 && (
              <button
                style={arrowStyle}
                onClick={() => setPage((p) => (p - 1 + pages) % pages)}
                aria-label="Anterior"
              >‹</button>
            )}

            {/* Tarjetas */}
            <div style={cardsRowStyle}>
              {visible.map((it) => (
                <div
                  key={it.id}
                  style={{
                    ...cardStyle,
                    border: it.selected
                      ? `3px solid ${SELECTED_BORDER}`
                      : `2px solid ${SLOT_BORDER}`,
                    background: it.selected
                      ? `linear-gradient(180deg, #fff6d1 0%, ${LIGHT_CREAM} 100%)`
                      : `linear-gradient(180deg, ${LIGHT_CREAM} 0%, #e8c88a 100%)`,
                    boxShadow: it.selected
                      ? `0 0 8px rgba(230, 59, 46, 0.45), inset 0 2px 0 rgba(255,255,255,0.5)`
                      : 'inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.12)',
                    cursor: it.selectable ? 'pointer' : 'default',
                  }}
                  onClick={() => it.selectable && it.onSelect?.()}
                >
                  <div style={iconWrapStyle}>
                    <ItemPixelIcon id={it.id} emoji={it.icon} size={52} />
                  </div>
                  <div style={cardNameStyle}>{it.name}</div>
                  {it.sub && <div style={cardSubStyle}>{it.sub}</div>}

                  {it.badge ? (
                    <div style={badgeStyle}>{it.badge}</div>
                  ) : it.price !== undefined ? (
                    <div style={priceRowStyle}>
                      <GoldCoin size={16} />
                      <span>{it.price === 0 ? 'GRATIS' : formatNum(it.price)}</span>
                    </div>
                  ) : null}

                  {!it.buyHidden && it.onBuy && (
                    <button
                      style={{
                        ...buyBtnStyle,
                        ...(it.buyDisabled ? buyBtnDisabledStyle : buyBtnActiveStyle),
                        opacity: it.buyDisabled ? 0.55 : 1,
                        cursor: it.buyDisabled ? 'not-allowed' : 'pointer',
                      }}
                      disabled={it.buyDisabled}
                      onClick={(e) => { e.stopPropagation(); it.onBuy?.() }}
                    >
                      {it.buyLabel ?? 'COMPRAR'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Flecha derecha */}
            {pages > 1 && (
              <button
                style={arrowStyle}
                onClick={() => setPage((p) => (p + 1) % pages)}
                aria-label="Siguiente"
              >›</button>
            )}
          </div>

          {/* Puntos de paginación */}
          {pages > 1 && (
            <div style={dotsStyle}>
              {Array.from({ length: pages }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `2px solid ${WOOD_DARK}`,
                    background: i === clampedPage ? WOOD_MID : LIGHT_CREAM,
                    boxShadow: i === clampedPage
                      ? 'inset 0 1px 0 rgba(255,255,255,0.4)'
                      : 'inset 0 1px 2px rgba(0,0,0,0.15)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 120,
}

const outerFrameStyle: React.CSSProperties = {
  position: 'relative',
  width: '92%',
  maxWidth: 580,
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

const cardsAreaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 28,
}

const arrowStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: 6,
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  border: `2px solid ${WOOD_DARK}`,
  color: CREAM,
  fontFamily: PIXEL_FONT,
  fontSize: 24,
  fontWeight: 'bold',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.3)',
}

const cardsRowStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
}

const cardStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '14px 10px 12px',
  borderRadius: 8,
}

const iconWrapStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #d4af75 0%, #c49a60 100%)',
  border: `2px solid ${SLOT_BORDER}`,
  borderRadius: 8,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))',
}

const cardNameStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  color: TEXT_DARK,
  fontWeight: 'bold',
  fontSize: 20,
  textAlign: 'center',
  lineHeight: 1.1,
}

const cardSubStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  color: WOOD_MID,
  fontSize: 14,
  textAlign: 'center',
  lineHeight: 1.2,
  opacity: 0.9,
}

const priceRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontFamily: PIXEL_FONT,
  color: '#1b5e20',
  fontWeight: 'bold',
  fontSize: 18,
}

const badgeStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  color: WOOD_DARK,
  fontWeight: 'bold',
  fontSize: 16,
  letterSpacing: 0.5,
  opacity: 0.75,
}

const buyBtnBase: React.CSSProperties = {
  marginTop: 4,
  border: `2px solid ${WOOD_DARK}`,
  borderRadius: 4,
  padding: '6px 16px',
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
}

const buyBtnStyle: React.CSSProperties = { ...buyBtnBase }

const buyBtnActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #6aab4e 0%, #4a8a2e 50%, #2a6a0e 100%)',
  color: CREAM,
  textShadow: `0 1px 0 ${WOOD_DARK}`,
}

const buyBtnDisabledStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, #c4a070 0%, #a08050 50%, ${WOOD_MID} 100%)`,
  color: WOOD_DARK,
}

const dotsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'center',
  marginTop: 14,
}
