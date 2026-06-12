import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { audioManager } from '../audio/AudioManager'

// Titulares cómicos (humor negro) por familiar. Si no hay específico, uno genérico.
const HEADLINES: Record<string, string> = {
  Esposa: 'MUJER MUERE ESPERANDO QUE SU MARIDO CORTARA EL PASTO',
  Hijo: 'NIÑO FALLECE DE HAMBRE; "CREÍ QUE EL PASTO ERA COMIDA", DICE EL PADRE',
  Suegra: 'SUEGRA MUERE DE FRÍO; VECINOS DICEN QUE "AL MENOS DEJÓ DE QUEJARSE"',
}

export function DeathNewspaperOverlay() {
  const deathNews = useGameStore((s) => s.deathNews)
  const dismiss = useGameStore((s) => s.dismissDeath)
  const showBills = useGameStore((s) => s.showBills)

  const name = deathNews[0]

  useEffect(() => {
    if (!name || showBills) return
    audioManager.startCinematic()
    audioManager.playCineStinger()
    return () => audioManager.endCinematic()
  }, [name, showBills])

  // No mostrar mientras el modal del cobrador sigue abierto.
  if (!name || showBills) return null

  const headline = HEADLINES[name] ?? `${name.toUpperCase()} MUERE EN CIRCUNSTANCIAS RIDÍCULAS`

  return (
    <div style={overlayStyle} onClick={dismiss}>
      <div style={paperWrapStyle} onClick={(e) => e.stopPropagation()}>
        <NewspaperSVG headline={headline} />
        <button style={btnStyle} onClick={dismiss}>CONTINUAR ▶</button>
      </div>
    </div>
  )
}

function NewspaperSVG({ headline }: { headline: string }) {
  const C = { paper: '#e7e0c8', ink: '#241f18', line: '#8a8064', gray: '#6f7681', gray2: '#4a505a' }
  // Partir el titular en ~2 líneas
  const words = headline.split(' ')
  const mid = Math.ceil(words.length / 2)
  const l1 = words.slice(0, mid).join(' ')
  const l2 = words.slice(mid).join(' ')
  return (
    <svg viewBox="0 0 320 220" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges" style={{ display: 'block', imageRendering: 'pixelated' }}>
      <rect x={0} y={0} width={320} height={220} fill="#15140f" />
      <rect x={18} y={12} width={284} height={196} fill={C.paper} />
      <text x={160} y={38} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="22" fill={C.ink}>El Clarín del Campo</text>
      <rect x={30} y={46} width={260} height={2} fill={C.ink} />
      <text x={32} y={60} fontFamily="monospace" fontSize="8" fill={C.gray2}>OBITUARIOS · EDICIÓN DE LUTO</text>
      <text x={32} y={84} fontFamily="Georgia, serif" fontWeight="800" fontSize="13" fill={C.ink}>{l1}</text>
      {l2 && <text x={32} y={102} fontFamily="Georgia, serif" fontWeight="800" fontSize="13" fill={C.ink}>{l2}</text>}
      {/* foto: lápida */}
      <rect x={32} y={116} width={64} height={74} fill={C.gray} />
      <rect x={32} y={116} width={64} height={2} fill={C.ink} />
      <path d="M48 178 h32 v-30 a16 16 0 0 0 -32 0 z" fill={C.gray2} />
      <rect x={62} y={150} width={4} height={16} fill="#cfc7b0" />
      <rect x={56} y={154} width={16} height={4} fill="#cfc7b0" />
      {/* columnas */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={'a' + i} x={106} y={120 + i * 9} width={82} height={3} fill={C.line} />)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={'b' + i} x={200} y={120 + i * 9} width={88} height={3} fill={C.line} />)}
      <text x={106} y={114} fontFamily="Georgia, serif" fontSize="9" fill={C.ink}>"No alcanzó el dinero", dijo el cobrador.</text>
    </svg>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 240,
  background: 'radial-gradient(ellipse at center, #14140f 0%, #050505 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}
const paperWrapStyle: React.CSSProperties = {
  width: 'min(560px, 92vw)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  animation: 'introPanelIn 0.45s ease-out',
}
const btnStyle: React.CSSProperties = {
  padding: '12px 26px', border: 'none', borderRadius: 6,
  background: 'linear-gradient(135deg, #66BB6A, #5CAB3E)', color: '#fff',
  fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer',
  fontFamily: "'Courier New', monospace",
}
