import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCapacity } from '../game/economy'
import { useIsMobile } from '../hooks/useIsMobile'
import { VirtualJoystick } from './VirtualJoystick'

/* ── Stardew Valley palette ── */
const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
const MONEY_RED = '#7a0000'
const PIXEL_FONT = "'VT323', monospace"

const DAYS_OF_WEEK = ['Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.', 'Dom.']

function computeDayInfo(day: number, dayClock: number, dayLength: number) {
  const dayName = DAYS_OF_WEEK[(day - 1) % 7]
  const seasonDay = ((day - 1) % 28) + 1

  // 0 = amanecer (6 AM), 1 = fin del día (llega el cobrador, ~2 AM)
  const elapsedFraction = 1 - Math.max(0, Math.min(1, dayClock / (dayLength || 1)))
  const totalMinutes = Math.floor(6 * 60 + elapsedFraction * 1200)
  const hour = Math.floor(totalMinutes / 60) % 24
  const rawMin = Math.floor(totalMinutes % 60)
  const roundedMin = Math.floor(rawMin / 10) * 10
  const timeStr = `${hour.toString().padStart(2, '0')}:${roundedMin.toString().padStart(2, '0')}`

  // Aguja fija arriba; el disco gira: amanecer (-60°) → noche/cobrador (180°)
  const rotationAngle = -60 + elapsedFraction * 240

  return { dayName, seasonDay, timeStr, rotationAngle, elapsedFraction }
}

export function HUD() {
  const state = useGameStore((s) => s.state)
  const message = useGameStore((s) => s.message)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const actionE = useGameStore((s) => s.mobileActionE)
  const actionF = useGameStore((s) => s.mobileActionF)
  const isMobile = useIsMobile()

  const capacity = getCapacity(state)
  const inParcela = state.currentMap === 0
  const setInput = useGameStore.getState().setInput

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {/* Backpack button (mobile) — beside Inicio */}
      {isMobile && (
        <button
          type="button"
          onClick={toggleInventory}
          style={backpackBtnStyle}
          aria-label="Inventario"
        >
          🎒
        </button>
      )}

      {/* Load bar */}
      {inParcela && (
        <div style={{
          position: 'absolute',
          top: isMobile ? 68 : 16,
          left: isMobile ? 8 : '50%',
          transform: isMobile ? 'none' : 'translateX(-50%)',
        }}>
          <LoadBar value={state.mower.load} max={capacity} compact={isMobile} />
        </div>
      )}

      {/* Top-right: Stardew clock + money plaque */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 8 : 12,
        right: isMobile ? 8 : 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        transform: isMobile ? 'scale(0.85)' : 'none',
        transformOrigin: 'top right',
      }}>
        <StardewClockWidget />
        <StardewMoneyPlaque value={state.money} />
      </div>

      {/* Joystick (mobile) */}
      <div
        className="mobile-joystick-wrap"
        style={{
          position: 'absolute',
          bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          pointerEvents: 'auto',
          zIndex: 25,
        }}
      >
        <VirtualJoystick />
      </div>

      {/* Action buttons (mobile) */}
      <div
        className="mobile-actions"
        style={{
          position: 'absolute',
          bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          pointerEvents: 'auto',
          zIndex: 25,
        }}
      >
        <ActionBtn
          label={actionE}
          onDown={() => setInput({ interact: true })}
          onUp={() => setInput({ interact: false })}
        />
        <ActionBtn
          label={actionF}
          onDown={() => setInput({ interact2: true })}
          onUp={() => setInput({ interact2: false })}
        />
      </div>

      {message && (
        <div
          className={isMobile ? 'hud-message hud-message--mobile' : 'hud-message'}
          style={{
            position: 'fixed',
            bottom: isMobile
              ? 'calc(280px + env(safe-area-inset-bottom, 0px))'
              : 'calc(148px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            maxWidth: 'min(92vw, 420px)',
            background: 'rgba(20, 12, 4, 0.92)',
            color: CREAM,
            padding: '10px 20px',
            borderRadius: 8,
            border: `2px solid ${WOOD_DARK}`,
            fontFamily: PIXEL_FONT,
            fontSize: isMobile ? 18 : 20,
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: 1.25,
            boxShadow: '0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s',
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   STARDEW CLOCK WIDGET (dial + calendar)
   ═══════════════════════════════════════════ */

function StardewClockWidget() {
  const day = useGameStore((s) => s.state.day)
  const [clock, setClock] = useState(() => {
    const s = useGameStore.getState()
    return { dayClock: s.dayClock, dayLength: s.dayLength || 1 }
  })

  useEffect(() => {
    const id = setInterval(() => {
      const s = useGameStore.getState()
      setClock({ dayClock: s.dayClock, dayLength: s.dayLength || 1 })
    }, 100)
    return () => clearInterval(id)
  }, [])

  const { dayName, seasonDay, timeStr, rotationAngle, elapsedFraction } =
    computeDayInfo(day, clock.dayClock, clock.dayLength)

  return (
    <div style={{ display: 'flex', width: 202, height: 72, pointerEvents: 'none' }}>
      {/* Left: Day/Night dial */}
      <div style={{
        width: 72, height: 72, position: 'relative', flexShrink: 0,
        borderRadius: '36px 0 0 36px',
        border: `3px solid ${WOOD_DARK}`,
        borderRight: 'none',
        background: `linear-gradient(135deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
        boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3)`,
        overflow: 'hidden',
      }}>
        <SkyDial rotationAngle={rotationAngle} elapsedFraction={elapsedFraction} />
        <DialNeedle />
      </div>

      {/* Right: Calendar plaque */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        border: `3px solid ${WOOD_DARK}`,
        borderLeft: `2px solid ${WOOD_MID}`,
        borderRadius: '0 6px 6px 0',
        background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
        boxShadow: `inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.15)`,
        overflow: 'hidden',
      }}>
        {/* Day row */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: PIXEL_FONT, fontSize: 18, color: '#1a1a1a', letterSpacing: 1,
          borderBottom: `1px solid ${WOOD_MID}44`,
        }}>
          {dayName} {seasonDay}
        </div>

        {/* Time row */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: PIXEL_FONT, fontSize: 22, color: '#1a1a1a', fontWeight: 'bold',
          letterSpacing: 2,
        }}>
          {timeStr}
        </div>
      </div>
    </div>
  )
}

function SkyDial({ rotationAngle, elapsedFraction }: { rotationAngle: number; elapsedFraction: number }) {
  const nightOpacity = Math.min(1, Math.max(0, (elapsedFraction - 0.55) / 0.45))

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      width: 110, height: 110, marginTop: -55, marginLeft: -55,
      borderRadius: '50%', overflow: 'hidden',
    }}>
      <div style={{
        width: '100%', height: '100%',
        transform: `rotate(${rotationAngle}deg)`,
        transition: 'transform 0.15s linear',
        position: 'relative',
      }}>
        {/* Sky base: día (arriba) → noche (abajo) */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `conic-gradient(
            from 0deg at 50% 50%,
            #0d1b3e 0deg,
            #1a2a5e 60deg,
            #3a6ea5 120deg,
            #87ceeb 180deg,
            #f0d060 210deg,
            #ffe87a 230deg,
            #87ceeb 260deg,
            #3a6ea5 300deg,
            #0d1b3e 360deg
          )`,
        }} />

        {/* Sol — fijo en la parte superior del disco (12 en punto) */}
        <div style={{
          position: 'absolute', top: 25, left: '50%', transform: 'translateX(-50%)',
          width: 16, height: 16, borderRadius: '50%',
          background: 'radial-gradient(circle, #fff8a0 20%, #ffe040 50%, #f0a020 100%)',
          boxShadow: '0 0 8px #ffe040, 0 0 16px rgba(255,200,0,0.4)',
        }} />

        {/* Luna — fija en la parte inferior del disco (6 en punto) */}
        <div style={{
          position: 'absolute', top: 69, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #f0f0ff 20%, #d0d0e8 60%, #a0a0c0 100%)',
          boxShadow: '0 0 6px rgba(220,220,255,0.7)',
        }} />

        {/* Estrellas en el cuadrante nocturno */}
        {[
          { top: 22, left: 18 }, { top: 35, left: 72 }, { top: 55, left: 12 },
          { top: 68, left: 80 }, { top: 78, left: 45 }, { top: 42, left: 55 },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', top: `${pos.top}%`, left: `${pos.left}%`,
            width: 2, height: 2, borderRadius: '50%', background: '#fff',
            opacity: 0.9,
          }} />
        ))}

        {/* Velo nocturno que se intensifica hacia el final del día */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 85%, rgba(5,10,40,0.85) 0%, transparent 55%)',
          opacity: nightOpacity,
          transition: 'opacity 0.3s linear',
        }} />
      </div>
    </div>
  )
}

function DialNeedle() {
  return (
    <svg
      width={72} height={72}
      viewBox="0 0 72 72"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2 }}
    >
      <defs>
        <linearGradient id="needleGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="50%" stopColor="#d4a020" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
      </defs>
      {/* Hanging bracket */}
      <rect x="33" y="2" width="6" height="8" rx="1" fill={WOOD_DARK} />
      {/* Needle arm */}
      <polygon points="36,10 32,36 36,34 40,36" fill="url(#needleGold)" stroke="#8B6914" strokeWidth="0.5" />
      {/* Needle tip */}
      <polygon points="36,34 33,48 36,46 39,48" fill="#d4a020" stroke="#8B6914" strokeWidth="0.5" />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   STARDEW MONEY PLAQUE
   ═══════════════════════════════════════════ */

function StardewMoneyPlaque({ value }: { value: number }) {
  const [pulse, setPulse] = useState(0)
  const prev = useRef(value)

  useEffect(() => {
    if (value > prev.current) {
      setPulse((p) => p + 1)
      const t = setTimeout(() => setPulse(0), 400)
      prev.current = value
      return () => clearTimeout(t)
    }
    prev.current = value
  }, [value])

  const digits = Math.floor(value).toString().padStart(8, ' ').split('')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', width: 202, height: 40,
      border: `3px solid ${WOOD_DARK}`,
      borderRadius: 6,
      background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 40%, ${WOOD_DARK} 100%)`,
      boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)`,
      padding: '3px 4px', gap: 4, pointerEvents: 'none',
    }}>
      {/* Gold G coin */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'radial-gradient(circle at 35% 30%, #fff8a0 0%, #f0d060 50%, #d4a020 80%, #8B6914 100%)',
        border: `2px solid ${WOOD_DARK}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.4)',
      }}>
        <span style={{
          fontFamily: PIXEL_FONT, fontSize: 20, fontWeight: 'bold',
          color: WOOD_DARK, textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}>G</span>
      </div>

      {/* Connector posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 3, height: 6, background: WOOD_MID, borderRadius: 1 }} />
        <div style={{ width: 3, height: 6, background: WOOD_MID, borderRadius: 1 }} />
      </div>

      {/* Digit slots */}
      <div
        key={pulse}
        style={{
          flex: 1, display: 'flex', gap: 2, height: '100%',
          animation: pulse > 0 ? 'coinPop 0.4s ease-out' : 'none',
        }}
      >
        {digits.map((d, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: CREAM,
            border: `1px solid ${WOOD_MID}`,
            borderRadius: 2,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
          }}>
            {d !== ' ' && (
              <span style={{
                fontFamily: PIXEL_FONT, fontSize: 22, fontWeight: 'bold',
                color: MONEY_RED, lineHeight: 1,
              }}>{d}</span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes coinPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════
   EXISTING WIDGETS (seed, load bar, controls)
   ═══════════════════════════════════════════ */

function LoadBar({ value, max, compact = false }: { value: number; max: number; compact?: boolean }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const full = value >= max && max > 0

  return (
    <div style={{
      ...loadBarContainerStyle,
      ...(compact ? { transform: 'scale(0.82)', transformOrigin: 'left center' } : {}),
    }}>
      <div style={slotOuterStyle}>
        <div style={slotInnerStyle}>
          <GrassIcon />
        </div>
      </div>

      <div style={trackStyle}>
        <div
          style={{
            ...fillStyle,
            width: `${pct * 100}%`,
            background: full ? fullFillGradient : normalFillGradient,
            boxShadow: full
              ? 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.4)'
              : 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }}
        />
        <span style={counterStyle}>
          {Math.floor(value)}/{max}
        </span>
      </div>
    </div>
  )
}

function GrassIcon() {
  return (
    <svg width={40} height={40} viewBox='0 0 64 64' fill='none'>
      <defs>
        <linearGradient id='g1' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#2E7D32' />
          <stop offset='100%' stopColor='#A8E063' />
        </linearGradient>
        <linearGradient id='g2' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#1B5E20' />
          <stop offset='100%' stopColor='#81C784' />
        </linearGradient>
        <linearGradient id='g3' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#2E7D32' />
          <stop offset='100%' stopColor='#C8E86C' />
        </linearGradient>
        <linearGradient id='g4' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#1B5E20' />
          <stop offset='100%' stopColor='#66BB6A' />
        </linearGradient>
        <linearGradient id='g5' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#1B5E20' />
          <stop offset='100%' stopColor='#A5D6A7' />
        </linearGradient>
        <linearGradient id='g6' x1='0' y1='1' x2='0' y2='0'>
          <stop offset='0%' stopColor='#003300' />
          <stop offset='100%' stopColor='#6ABF69' />
        </linearGradient>
      </defs>
      <path d='M32 52 C32 52 18 40 14 22 C14 14 22 8 28 10 L30 18 L28 12 C24 12 20 16 22 24 C24 32 30 40 32 44Z' fill='url(#g1)' />
      <path d='M32 52 C32 52 46 40 50 22 C50 14 42 8 36 10 L34 18 L36 12 C40 12 44 16 42 24 C40 32 34 40 32 44Z' fill='url(#g2)' />
      <path d='M32 52 C32 52 14 42 8 28 C6 22 10 14 16 12 L22 18 L18 14 C14 16 12 20 14 26 C16 34 24 42 32 46Z' fill='url(#g3)' />
      <path d='M32 52 C32 52 50 42 56 28 C58 22 54 14 48 12 L42 18 L46 14 C50 16 52 20 50 26 C48 34 40 42 32 46Z' fill='url(#g4)' />
      <path d='M32 52 C32 52 22 44 18 32 C16 26 18 18 24 14 L28 20 L26 16 C22 18 20 22 22 30 C24 38 28 44 32 48Z' fill='url(#g5)' />
      <path d='M32 52 C32 52 42 44 46 32 C48 26 46 18 40 14 L36 20 L38 16 C42 18 44 22 42 30 C40 38 36 44 32 48Z' fill='url(#g6)' />
      <ellipse cx='32' cy='50' rx='8' ry='3' fill='#1B5E20' opacity='0.6' />
    </svg>
  )
}

function ActionBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      type="button"
      style={actionBtnStyle}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={(e) => { e.preventDefault(); onDown() }}
      onTouchEnd={(e) => { e.preventDefault(); onUp() }}
      onTouchCancel={(e) => { e.preventDefault(); onUp() }}
    >
      {label}
    </button>
  )
}

const actionBtnStyle: React.CSSProperties = {
  minWidth: 72,
  maxWidth: 96,
  minHeight: 64,
  padding: '8px 10px',
  fontSize: 20,
  fontWeight: 'bold',
  fontFamily: PIXEL_FONT,
  lineHeight: 1.1,
  textAlign: 'center',
  border: `3px solid ${WOOD_DARK}`,
  borderRadius: 14,
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  color: CREAM,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45)',
  textShadow: `0 1px 0 ${WOOD_DARK}`,
}

const backpackBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  left: 126,
  zIndex: 20,
  width: 52,
  height: 52,
  border: `3px solid ${WOOD_DARK}`,
  borderRadius: 8,
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  color: CREAM,
  cursor: 'pointer',
  fontSize: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45)',
}

const loadBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px 4px 4px',
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 45%, ${WOOD_DARK} 100%)`,
  border: `3px solid ${WOOD_DARK}`,
  borderRadius: 28,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45)',
}

const slotOuterStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  border: `3px solid ${WOOD_DARK}`,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const slotInnerStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: `linear-gradient(180deg, ${LIGHT_CREAM} 0%, #e8c88a 100%)`,
  border: `2px solid ${SLOT_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
}

const trackStyle: React.CSSProperties = {
  position: 'relative',
  width: 200,
  height: 28,
  borderRadius: 6,
  background: LIGHT_CREAM,
  border: `2px solid ${WOOD_DARK}`,
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.2)',
  overflow: 'hidden',
}

const fillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 4,
  transition: 'width 0.2s ease-out',
}

const normalFillGradient = 'linear-gradient(180deg, #a8e063 0%, #6aab4e 45%, #3d7a2a 100%)'
const fullFillGradient = 'linear-gradient(180deg, #ff8a80 0%, #e53935 45%, #b71c1c 100%)'

const counterStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  fontWeight: 'bold',
  color: WOOD_DARK,
  textShadow: '0 1px 0 rgba(255,255,255,0.6)',
  fontFamily: PIXEL_FONT,
  letterSpacing: 1,
}
