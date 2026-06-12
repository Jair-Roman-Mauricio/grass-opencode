import { useEffect, useRef, useState, useCallback } from 'react'
import { audioManager } from '../audio/AudioManager'
import { INTRO_PANELS } from './IntroScenes'

interface IntroCinematicProps {
  onDone: () => void
}

const TYPE_MS = 32 // ms por carácter

export function IntroCinematic({ onDone }: IntroCinematicProps) {
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false) // texto del panel actual completo
  const typeTimer = useRef<number | null>(null)
  const lastTick = useRef(0)
  const finishedRef = useRef(false)

  const panel = INTRO_PANELS[index]
  const total = INTRO_PANELS.length

  // Drone ambiental durante toda la cinemática.
  useEffect(() => {
    audioManager.startCinematic()
    return () => audioManager.endCinematic()
  }, [])

  // Al cambiar de panel: impacto + (stinger) y arrancar el typewriter.
  useEffect(() => {
    audioManager.playCinePanel()
    if (panel.stinger) window.setTimeout(() => audioManager.playCineStinger(), 180)

    setTyped('')
    setDone(false)
    const full = panel.caption
    let i = 0
    const step = () => {
      i++
      setTyped(full.slice(0, i))
      // tick de máquina de escribir (no en espacios, con throttle)
      const ch = full[i - 1]
      const now = performance.now()
      if (ch && ch !== ' ' && now - lastTick.current > 38) {
        lastTick.current = now
        audioManager.playCineType()
      }
      if (i >= full.length) {
        setDone(true)
        typeTimer.current = null
        return
      }
      typeTimer.current = window.setTimeout(step, TYPE_MS)
    }
    typeTimer.current = window.setTimeout(step, 260)
    return () => {
      if (typeTimer.current) window.clearTimeout(typeTimer.current)
    }
  }, [index, panel])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onDone()
  }, [onDone])

  const advance = useCallback(() => {
    // Si el texto aún se escribe, primero completarlo.
    if (!done) {
      if (typeTimer.current) window.clearTimeout(typeTimer.current)
      setTyped(panel.caption)
      setDone(true)
      return
    }
    if (index < total - 1) setIndex((i) => i + 1)
    else finish()
  }, [done, index, total, panel.caption, finish])

  // Teclado: Espacio/Enter avanza, Esc salta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish() }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, finish])

  const Scene = panel.Scene
  const isLast = index === total - 1

  return (
    <div style={overlayStyle} onClick={advance}>
      {/* barras letterbox */}
      <div style={{ ...barStyle, top: 0 }} />
      <div style={{ ...barStyle, bottom: 0 }} />

      {/* botón saltar */}
      <button
        style={skipBtnStyle}
        onClick={(e) => { e.stopPropagation(); finish() }}
      >
        SALTAR ⏭
      </button>

      <div style={stageStyle}>
        {/* progreso por puntos */}
        <div style={dotsStyle}>
          {INTRO_PANELS.map((_, i) => (
            <span key={i} style={{ ...dotStyle, ...(i === index ? dotActiveStyle : i < index ? dotDoneStyle : {}) }} />
          ))}
        </div>

        {/* panel SVG con animación de entrada por key */}
        <div key={index} style={panelWrapStyle}>
          <Scene />
        </div>

        {/* narración */}
        <div style={captionBoxStyle}>
          <p style={captionTextStyle}>
            {typed}
            {!done && <span style={caretStyle}>▍</span>}
          </p>
          <div style={hintRowStyle}>
            <span style={hintStyle}>Espacio / clic para continuar</span>
            <button
              style={nextBtnStyle}
              onClick={(e) => { e.stopPropagation(); advance() }}
            >
              {done ? (isLast ? 'EMPEZAR ▶' : 'SIGUIENTE ▶') : 'SALTAR TEXTO'}
            </button>
          </div>
        </div>
      </div>

      <style>{keyframes}</style>
    </div>
  )
}

const keyframes = `
@keyframes introPanelIn {
  0% { opacity: 0; transform: translateY(18px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes caretBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
`

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'radial-gradient(ellipse at center, #15161c 0%, #0a0a0e 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
}

const barStyle: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, height: '7vh',
  background: '#000', zIndex: 3, pointerEvents: 'none',
}

const stageStyle: React.CSSProperties = {
  width: 'min(860px, 92vw)', display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 18, zIndex: 2,
}

const dotsStyle: React.CSSProperties = {
  display: 'flex', gap: 8,
}

const dotStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.18)',
  transition: 'all 0.2s',
}
const dotActiveStyle: React.CSSProperties = {
  background: '#7CC55A', transform: 'scale(1.4)', boxShadow: '0 0 10px rgba(92,171,62,0.7)',
}
const dotDoneStyle: React.CSSProperties = {
  background: 'rgba(92,171,62,0.5)',
}

const panelWrapStyle: React.CSSProperties = {
  width: '100%', aspectRatio: '8 / 5', maxHeight: '56vh',
  borderRadius: 14, overflow: 'hidden',
  border: '3px solid rgba(255,255,255,0.1)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  animation: 'introPanelIn 0.45s ease-out',
}

const captionBoxStyle: React.CSSProperties = {
  width: '100%',
  background: 'linear-gradient(180deg, rgba(20,22,28,0.95), rgba(14,15,20,0.95))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '16px 20px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const captionTextStyle: React.CSSProperties = {
  margin: 0, minHeight: 52,
  color: '#f0ede6', fontSize: 19, lineHeight: 1.5,
  fontFamily: "'Georgia', 'Times New Roman', serif",
  fontStyle: 'italic',
}

const caretStyle: React.CSSProperties = {
  color: '#7CC55A', animation: 'caretBlink 0.9s steps(1) infinite', marginLeft: 1,
}

const hintRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginTop: 12, gap: 12,
}

const hintStyle: React.CSSProperties = {
  fontSize: 11, color: '#6a6f78', letterSpacing: 1,
  fontFamily: '-apple-system, sans-serif',
}

const nextBtnStyle: React.CSSProperties = {
  padding: '8px 18px', border: 'none', borderRadius: 8,
  background: 'linear-gradient(135deg, #66BB6A, #5CAB3E)',
  color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 1.5,
  cursor: 'pointer', boxShadow: '0 3px 12px rgba(92,171,62,0.4)',
}

const skipBtnStyle: React.CSSProperties = {
  position: 'absolute', top: 'calc(7vh + 14px)', right: 18, zIndex: 4,
  padding: '8px 16px', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#cfd3d8', fontWeight: 600, fontSize: 11, letterSpacing: 2,
  cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
}
