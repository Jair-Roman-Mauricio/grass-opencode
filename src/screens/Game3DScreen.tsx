import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { WebGLRenderer } from '../renderers/webgl/GameRenderer'
import { HUD } from '../components/HUD'
import { ShopOverlay } from '../components/ShopOverlay'
import { ExpandOverlay } from '../components/ExpandOverlay'

interface Game3DScreenProps {
  onBack: () => void
}

const KEY_MAP: Record<string, () => void> = {
  ArrowUp: () => useGameStore.getState().setInput({ up: true }),
  ArrowDown: () => useGameStore.getState().setInput({ down: true }),
  ArrowLeft: () => useGameStore.getState().setInput({ left: true }),
  ArrowRight: () => useGameStore.getState().setInput({ right: true }),
  w: () => useGameStore.getState().setInput({ up: true }),
  s: () => useGameStore.getState().setInput({ down: true }),
  a: () => useGameStore.getState().setInput({ left: true }),
  d: () => useGameStore.getState().setInput({ right: true }),
  W: () => useGameStore.getState().setInput({ up: true }),
  S: () => useGameStore.getState().setInput({ down: true }),
  A: () => useGameStore.getState().setInput({ left: true }),
  D: () => useGameStore.getState().setInput({ right: true }),
}

const KEY_RELEASE_MAP: Record<string, () => void> = {
  ArrowUp: () => useGameStore.getState().setInput({ up: false }),
  ArrowDown: () => useGameStore.getState().setInput({ down: false }),
  ArrowLeft: () => useGameStore.getState().setInput({ left: false }),
  ArrowRight: () => useGameStore.getState().setInput({ right: false }),
  w: () => useGameStore.getState().setInput({ up: false }),
  s: () => useGameStore.getState().setInput({ down: false }),
  a: () => useGameStore.getState().setInput({ left: false }),
  d: () => useGameStore.getState().setInput({ right: false }),
  W: () => useGameStore.getState().setInput({ up: false }),
  S: () => useGameStore.getState().setInput({ down: false }),
  A: () => useGameStore.getState().setInput({ left: false }),
  D: () => useGameStore.getState().setInput({ right: false }),
}

export function Game3DScreen({ onBack }: Game3DScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const setInput = useGameStore((s) => s.setInput)
  const isPlaying = useGameStore((s) => s.isPlaying)

  useEffect(() => {
    useGameStore.getState().setPlaying(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new WebGLRenderer()
    renderer.init(canvas)
    renderer.resize(window.innerWidth, window.innerHeight)
    rendererRef.current = renderer

    const handleResize = () => renderer.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', handleResize)

    let lastTime = performance.now()
    let frameId: number

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const storeState = useGameStore.getState()
      if (storeState.isPlaying) {
        renderer.render(storeState.state, storeState.input, dt)
      }

      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      renderer.destroy()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key]
      if (action) {
        e.preventDefault()
        action()
      }

      if (e.key === 'e' || e.key === 'E') {
        setInput({ interact: true })
        e.preventDefault()
      }

      if (e.key === 'Escape') {
        useGameStore.getState().setPlaying(false)
        onBack()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = KEY_RELEASE_MAP[e.key]
      if (action) action()

      if (e.key === 'e' || e.key === 'E') {
        setInput({ interact: false })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setInput, onBack])

  return (
    <div
      id="game-wrap"
      style={{
        width: '100vw', height: '100vh', overflow: 'hidden',
        background: '#0d2818', position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      <div
        id="controls-hint"
        style={{
          position: 'absolute', bottom: '50%', left: '50%',
          transform: 'translate(-50%, 50%)',
          color: '#fff', fontSize: 14, zIndex: 5, textAlign: 'center',
          pointerEvents: 'none', textShadow: '0 2px 8px rgba(0,0,0,.5)',
          background: 'rgba(0,0,0,.5)', padding: '12px 24px',
          borderRadius: 12, backdropFilter: 'blur(4px)',
          transition: 'opacity 1s',
        }}
      >
        WASD / Flechas: mover · Acércate al granero para depositar
      </div>

      <div
        id="mount-hint"
        style={{
          position: 'absolute', bottom: '50%', left: '50%',
          transform: 'translate(-50%, 50%)',
          color: '#fff', fontSize: 13, zIndex: 6, textAlign: 'center',
          pointerEvents: 'none', textShadow: '0 2px 8px rgba(0,0,0,.6)',
          background: 'rgba(0,0,0,.5)', padding: '8px 18px',
          borderRadius: 10, backdropFilter: 'blur(4px)',
          opacity: 0, transition: 'opacity .3s',
        }}
      >
        Presiona <b>E</b> para subirte
      </div>

      <div
        id="popup-container"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none', zIndex: 15, overflow: 'hidden',
        }}
      />

      {isPlaying && (
        <>
          <HUD />
          <ShopOverlay />
          <ExpandOverlay />
        </>
      )}

      <button
        onClick={onBack}
        style={menuBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(180deg, #7a8498 0%, #5a6478 50%, #3a4258 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(180deg, #6a7488 0%, #4a5468 50%, #2a3142 100%)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 0 rgba(0,0,0,0.3), 0 0 0 1px #1a1a25'
          e.currentTarget.style.transform = 'translateY(1px)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.4)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        MENU
      </button>
    </div>
  )
}

const menuBtnStyle: React.CSSProperties = {
  position: 'absolute', top: 8, left: 8, zIndex: 20,
  width: 110, height: 52,
  border: '2px solid #7a8498',
  borderRadius: 8,
  background: 'linear-gradient(180deg, #6a7488 0%, #4a5468 50%, #2a3142 100%)',
  color: '#e8eaf0',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 4,
  fontFamily: "'Cinzel', 'Times New Roman', serif",
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  textTransform: 'uppercase',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.4)',
  transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
}
