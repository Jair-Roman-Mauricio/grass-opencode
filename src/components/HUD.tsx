import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCapacity, getSeedDef, getCurrentTool } from '../game/economy'
import { formatNum } from '../utils/utils'
import { isNearBarn } from '../game/physics'

export function HUD() {
  const state = useGameStore((s) => s.state)
  const deposit = useGameStore((s) => s.deposit)
  const message = useGameStore((s) => s.message)
  const save = useGameStore((s) => s.save)

  const capacity = getCapacity(state)
  const nearBarn = isNearBarn(state)
  const inParcela = state.currentMap === 0

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        padding: '12px 16px', gap: 12,
      }}>
        {/* Empuja el contenido a la derecha del botón MENU (110px + 8px + 8px) */}
        <div style={{ width: 126, flexShrink: 0 }} />

        <MoneyCounter value={state.money} />

        <DayWidget />

        {inParcela && <SeedWidget />}

        <div style={{ flex: 1 }} />

        {inParcela && <LoadBar value={state.mower.load} max={capacity} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'auto' }}>
          {inParcela && (
            <button onClick={deposit} style={{
              ...btnStyle,
              background: nearBarn && state.mower.load > 0 ? '#4CAF50' : '#555',
              animation: nearBarn && state.mower.load > 0 ? 'pulse 1s infinite' : 'none',
            }}>DEPOSITAR</button>
          )}
          <button onClick={save} style={{ ...btnStyle, background: '#333', fontSize: 10 }}>SAVE</button>
        </div>
      </div>

      <div className='mobile-controls' style={{
        position: 'absolute', bottom: 24, left: 16,
        gap: 10, pointerEvents: 'auto',
        zIndex: 25,
      }}>
        <ControlBtn dir='←' onDown={() => useGameStore.getState().setInput({ left: true })}
          onUp={() => useGameStore.getState().setInput({ left: false })} />
        <ControlBtn dir='↑' onDown={() => useGameStore.getState().setInput({ up: true })}
          onUp={() => useGameStore.getState().setInput({ up: false })} />
        <ControlBtn dir='↓' onDown={() => useGameStore.getState().setInput({ down: true })}
          onUp={() => useGameStore.getState().setInput({ down: false })} />
        <ControlBtn dir='→' onDown={() => useGameStore.getState().setInput({ right: true })}
          onUp={() => useGameStore.getState().setInput({ right: false })} />
      </div>

      {message && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '8px 20px',
          borderRadius: 8, fontSize: 16, fontWeight: 'bold',
          animation: 'fadeIn 0.2s',
        }}>
          {message}
        </div>
      )}
    </div>
  )
}

/** Indicador de Día + barra de tiempo restante (se refresca solo, sin re-render del HUD). */
function DayWidget() {
  const day = useGameStore((s) => s.state.day)
  const [frac, setFrac] = useState(1)

  useEffect(() => {
    const id = setInterval(() => {
      const s = useGameStore.getState()
      setFrac(Math.max(0, Math.min(1, s.dayClock / (s.dayLength || 1))))
    }, 250)
    return () => clearInterval(id)
  }, [])

  const low = frac < 0.2
  return (
    <div style={{
      pointerEvents: 'none', background: 'rgba(0,0,0,0.55)', borderRadius: 10,
      padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 92,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1,
        display: 'flex', justifyContent: 'space-between', gap: 8,
      }}>
        <span>📅 Día {day}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${frac * 100}%`, height: '100%',
          background: low ? '#d8533f' : '#5CAB3E',
          transition: 'width 0.25s linear',
        }} />
      </div>
    </div>
  )
}

function SeedWidget() {
  const state = useGameStore((s) => s.state)
  const seed = getSeedDef(state.selectedSeed)
  const count = state.seeds[state.selectedSeed] ?? 0
  const tool = getCurrentTool(state)
  return (
    <div style={seedWidgetStyle} title="Semilla seleccionada · Herramienta actual">
      <span style={{ fontSize: 22 }}>{seed.icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{seed.name} x{count}</span>
        <span style={{ color: '#9aa3b5', fontSize: 10 }}>{tool.icon} {tool.name}</span>
      </div>
    </div>
  )
}

const seedWidgetStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  height: 52, padding: '0 14px',
  border: '2px solid #7a8498', borderRadius: 8,
  background: 'linear-gradient(180deg, #6a7488 0%, #4a5468 50%, #2a3142 100%)',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.4)',
  pointerEvents: 'auto', flexShrink: 0,
}

function MoneyCounter({ value }: { value: number }) {
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

  return (
    <div style={coinBoxStyle}>
      <CoinIcon />
      <span
        key={pulse}
        style={{
          fontFamily: "'Cinzel', 'Times New Roman', serif",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 2,
          color: '#FFD700',
          textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 6px rgba(255,215,0,0.5)',
          animation: pulse > 0 ? 'coinPop 0.4s ease-out' : 'none',
          display: 'inline-block',
          textTransform: 'uppercase',
        }}
      >
        ${formatNum(value)}
      </span>
      <style>{`
        @keyframes coinPop {
          0%   { transform: scale(1);    color: #FFD700; }
          40%  { transform: scale(1.22); color: #FFF8A0; text-shadow: 0 0 14px rgba(255,215,0,0.9); }
          100% { transform: scale(1);    color: #FFD700; }
        }
      `}</style>
    </div>
  )
}

function CoinIcon() {
  return (
    <svg width={26} height={26} viewBox='0 0 32 32' fill='none' style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id='coinFace' cx='0.35' cy='0.3' r='0.8'>
          <stop offset='0%' stopColor='#FFF59D' />
          <stop offset='55%' stopColor='#FFD700' />
          <stop offset='100%' stopColor='#B8860B' />
        </radialGradient>
        <linearGradient id='coinEdge' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#DAA520' />
          <stop offset='100%' stopColor='#8B6914' />
        </linearGradient>
      </defs>
      <circle cx='16' cy='17' r='12' fill='url(#coinEdge)' />
      <circle cx='16' cy='16' r='12' fill='url(#coinFace)' stroke='#8B6914' strokeWidth='1.5' />
      <text
        x='16' y='16'
        textAnchor='middle' dominantBaseline='central'
        fontSize='14' fontWeight='bold' fontFamily='Cinzel, serif'
        fill='#8B6914' stroke='#5C4708' strokeWidth='0.5'
      >$</text>
      <ellipse cx='12' cy='12' rx='3' ry='1.5' fill='rgba(255,255,255,0.6)' />
    </svg>
  )
}

function LoadBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const full = value >= max && max > 0

  return (
    <div style={loadBarContainerStyle}>
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
            background: full
              ? fullFillGradient
              : normalFillGradient,
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

function ControlBtn({ dir, onDown, onUp }: { dir: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      style={{
        width: 60, height: 60, fontSize: 26, border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={(e) => { e.preventDefault(); onDown() }}
      onTouchEnd={(e) => { e.preventDefault(); onUp() }}
    >
      {dir}
    </button>
  )
}

const coinBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 52,
  minWidth: 140,
  padding: '0 16px',
  border: '2px solid #7a8498',
  borderRadius: 8,
  background: 'linear-gradient(180deg, #6a7488 0%, #4a5468 50%, #2a3142 100%)',
  boxShadow:
    'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.4)',
  fontFamily: "'Cinzel', 'Times New Roman', serif",
  pointerEvents: 'auto',
  flexShrink: 0,
}

const btnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '6px 12px',
  background: '#333', color: '#fff', cursor: 'pointer',
  fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: 1,
}

const loadBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 0,
}

const slotOuterStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #5a5a6a 0%, #3a3a4a 50%, #2a2a35 100%)',
  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.5), 0 0 0 2px #6a6a7a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const slotInnerStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1a1a25 0%, #0a0a15 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
}

const trackStyle: React.CSSProperties = {
  position: 'relative',
  width: 180,
  height: 24,
  borderRadius: 4,
  background: 'linear-gradient(180deg, #1a1a25 0%, #0a0a15 100%)',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 0 0 1px #5a5a6a',
  overflow: 'hidden',
}

const fillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 3,
  transition: 'width 0.2s ease-out',
}

const normalFillGradient = 'linear-gradient(180deg, #7CDF52 0%, #4CAF50 45%, #2E7D32 100%)'

const fullFillGradient = 'linear-gradient(180deg, #FF6B6B 0%, #FF5252 45%, #C62828 100%)'

const counterStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 'bold',
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 1px 1px rgba(0,0,0,0.5)',
  fontFamily: "'Cinzel', 'Times New Roman', serif",
  letterSpacing: 1,
}
