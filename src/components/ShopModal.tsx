import { useState } from 'react'
import { formatNum } from '../utils/utils'

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

function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
      <circle cx="16" cy="16" r="13" fill="#DAA520" stroke="#8B6914" strokeWidth="2" />
      <circle cx="16" cy="16" r="9" fill="#FFD54F" />
      <text x="16" y="17" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" fill="#8B6914">$</text>
    </svg>
  )
}

export function ShopModal({ title, money, items, onClose, pageSize = 3 }: ShopModalProps) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const clampedPage = Math.min(page, pages - 1)
  const start = clampedPage * pageSize
  const visible = items.slice(start, start + pageSize)

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelWrapStyle} onClick={(e) => e.stopPropagation()}>
        {/* Chip de título */}
        <div style={titleChipStyle}>{title}</div>

        {/* Botón cerrar */}
        <button style={closeBtnStyle} onClick={onClose} aria-label="Cerrar">✕</button>

        {/* Saldo */}
        <div style={moneyStyle}><Coin size={18} /> {formatNum(money)}</div>

        {/* Flecha izquierda */}
        {pages > 1 && (
          <button
            style={{ ...arrowStyle, left: -18 }}
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
                borderColor: it.selected ? '#7CDF52' : 'rgba(255,255,255,0.12)',
                boxShadow: it.selected
                  ? '0 0 0 2px #7CDF52, inset 0 1px 0 rgba(255,255,255,0.1)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 6px rgba(0,0,0,0.5)',
                cursor: it.selectable ? 'pointer' : 'default',
              }}
              onClick={() => it.selectable && it.onSelect?.()}
            >
              <div style={iconWrapStyle}>{it.icon}</div>
              <div style={cardNameStyle}>{it.name}</div>
              {it.sub && <div style={cardSubStyle}>{it.sub}</div>}

              {it.badge ? (
                <div style={badgeStyle}>{it.badge}</div>
              ) : it.price !== undefined ? (
                <div style={priceRowStyle}>
                  <Coin /> <span>{it.price === 0 ? 'GRATIS' : formatNum(it.price)}</span>
                </div>
              ) : null}

              {!it.buyHidden && it.onBuy && (
                <button
                  style={{
                    ...buyBtnStyle,
                    background: it.buyDisabled
                      ? 'linear-gradient(180deg,#5a6478,#3a4258)'
                      : 'linear-gradient(180deg,#4A90E2,#2563EB)',
                    opacity: it.buyDisabled ? 0.5 : 1,
                    cursor: it.buyDisabled ? 'not-allowed' : 'pointer',
                  }}
                  disabled={it.buyDisabled}
                  onClick={(e) => { e.stopPropagation(); it.onBuy?.() }}
                >
                  {it.buyLabel ?? 'BUY'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Flecha derecha */}
        {pages > 1 && (
          <button
            style={{ ...arrowStyle, right: -18 }}
            onClick={() => setPage((p) => (p + 1) % pages)}
            aria-label="Siguiente"
          >›</button>
        )}

        {/* Puntos de paginación */}
        {pages > 1 && (
          <div style={dotsStyle}>
            {Array.from({ length: pages }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i === clampedPage ? '#4A90E2' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120,
}

const panelWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '92%', maxWidth: 560,
  padding: '46px 34px 34px',
  borderRadius: 18,
  background: 'linear-gradient(180deg, #4a5266 0%, #353c4d 45%, #262b38 100%)',
  border: '2px solid #5a6478',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -3px 10px rgba(0,0,0,0.6), 0 18px 50px rgba(0,0,0,0.6)',
}

const titleChipStyle: React.CSSProperties = {
  position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 28px', borderRadius: 10,
  background: 'linear-gradient(180deg,#6a7488,#3a4258)',
  border: '2px solid #7a8498',
  color: '#e8eaf0', fontWeight: 800, letterSpacing: 2, fontSize: 16,
  textTransform: 'uppercase', whiteSpace: 'nowrap',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.5)',
  fontFamily: "'Cinzel','Times New Roman',serif",
}

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute', top: -14, right: -10,
  width: 32, height: 32, borderRadius: '50%',
  background: 'linear-gradient(180deg,#e05555,#b32424)',
  border: '2px solid #e8eaf0', color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
}

const moneyStyle: React.CSSProperties = {
  position: 'absolute', top: -10, left: 12,
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '4px 12px', borderRadius: 8,
  background: 'linear-gradient(180deg,#3a4258,#262b38)',
  border: '1px solid #5a6478',
  color: '#FFD54F', fontWeight: 700, fontSize: 13,
}

const arrowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  width: 38, height: 38, borderRadius: '50%',
  background: 'linear-gradient(180deg,#4A90E2,#2563EB)',
  border: '2px solid #7aa7e6', color: '#fff',
  fontSize: 22, fontWeight: 800, cursor: 'pointer', lineHeight: '1',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
}

const cardsRowStyle: React.CSSProperties = {
  display: 'flex', gap: 14, justifyContent: 'center',
}

const cardStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  padding: '16px 10px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(60,68,86,0.9), rgba(34,39,52,0.95))',
  border: '2px solid rgba(255,255,255,0.12)',
}

const iconWrapStyle: React.CSSProperties = {
  fontSize: 44, lineHeight: 1, height: 56,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
}

const cardNameStyle: React.CSSProperties = {
  color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center',
}

const cardSubStyle: React.CSSProperties = {
  color: '#9aa3b5', fontSize: 11, textAlign: 'center',
}

const priceRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  color: '#FFD54F', fontWeight: 700, fontSize: 14,
}

const badgeStyle: React.CSSProperties = {
  color: '#7CDF52', fontWeight: 700, fontSize: 12, letterSpacing: 1,
}

const buyBtnStyle: React.CSSProperties = {
  marginTop: 2,
  border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
  padding: '7px 18px', color: '#fff', fontWeight: 800, fontSize: 12,
  letterSpacing: 1, textTransform: 'uppercase',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
}

const dotsStyle: React.CSSProperties = {
  display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16,
}
