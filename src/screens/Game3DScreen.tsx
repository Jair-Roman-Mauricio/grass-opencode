import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { WebGLRenderer } from '../renderers/webgl/GameRenderer'
import { assetLoader } from '../renderers/webgl/AssetLoader'
import { audioManager } from '../audio/AudioManager'
import { HUD } from '../components/HUD'
import { SeedShopOverlay } from '../components/SeedShopOverlay'
import { ToolShopOverlay } from '../components/ToolShopOverlay'
import { CorralModal } from '../components/CorralModal'
import { BusStopModal } from '../components/BusStopModal'
import { DeathNewspaperOverlay } from '../components/DeathNewspaperOverlay'
import { SettingsModal } from '../components/SettingsModal'
import { BillCollectorOverlay } from '../components/BillCollectorOverlay'
import { GameOverScreen } from '../components/GameOverScreen'
import { InventoryOverlay } from '../components/InventoryOverlay'

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
  const currentMap = useGameStore((s) => s.state.currentMap)
  const showSettings = useGameStore((s) => s.showSettings)
  const [showHint, setShowHint] = useState(true)
  const [assetsReady, setAssetsReady] = useState(false)

  useEffect(() => {
    useGameStore.getState().setPlaying(true)
  }, [])

  // Precargar modelos 3D (GLTF) antes de construir el mundo
  useEffect(() => {
    let cancelled = false
    assetLoader.preloadModels().then(() => {
      if (!cancelled) setAssetsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!assetsReady) return
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new WebGLRenderer()
    renderer.init(canvas)
    renderer.resize(window.innerWidth, window.innerHeight)
    rendererRef.current = renderer

    const handleResize = () => renderer.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', handleResize)

    // Música de fondo mientras se juega.
    audioManager.startMusic()

    let lastTime = performance.now()
    let frameId: number

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const storeState = useGameStore.getState()
      if (storeState.isPlaying) {
        storeState.tickClock(dt)
        renderer.render(storeState.state, storeState.input, dt)
      }

      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    // Autosave cada 10 segundos
    const autosaveId = setInterval(() => {
      useGameStore.getState().save()
    }, 10000)

    return () => {
      useGameStore.getState().save()
      audioManager.stopMusic()
      cancelAnimationFrame(frameId)
      clearInterval(autosaveId)
      window.removeEventListener('resize', handleResize)
      renderer.destroy()
    }
    // Reconstruir el mundo al viajar de mapa (parcela ⇄ pueblo).
  }, [assetsReady, currentMap])

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

      if (e.key === 'f' || e.key === 'F') {
        setInput({ interact2: true })
        e.preventDefault()
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        useGameStore.getState().toggleInventory()
      }

      if (e.key >= '1' && e.key <= '6') {
        const slotIdx = parseInt(e.key) - 1
        useGameStore.getState().setActiveSlot(slotIdx)
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        // ESC abre/cierra el menú de ajustes (ya no sale al menú; eso es el botón MENU).
        useGameStore.getState().save()
        useGameStore.getState().toggleSettings()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = KEY_RELEASE_MAP[e.key]
      if (action) action()

      if (e.key === 'e' || e.key === 'E') {
        setInput({ interact: false })
      }

      if (e.key === 'f' || e.key === 'F') {
        setInput({ interact2: false })
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
        key={currentMap}
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />


      {!assetsReady && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16,
            background: '#0d2818', color: '#cfe8d4',
            fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: 2,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,.2)', borderTopColor: '#8fd19e',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: 18 }}>Cargando…</div>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}

      <div
        style={{
          position: 'absolute', bottom: '50%', left: '50%',
          transform: 'translate(-50%, 50%)',
          color: '#fff', fontSize: 14, zIndex: 5, textAlign: 'center',
          pointerEvents: 'none', textShadow: '0 2px 8px rgba(0,0,0,.5)',
          background: 'rgba(0,0,0,.5)', padding: '12px 24px',
          borderRadius: 12, backdropFilter: 'blur(4px)',
          transition: 'opacity 1s',
          opacity: showHint ? 1 : 0,
        }}
      >
        WASD: mover · E: plantar/cosechar · F: tienda del vendedor · Granero: depositar
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
          <InventoryOverlay />
          <SeedShopOverlay />
          <ToolShopOverlay />
          <CorralModal />
          <BusStopModal />
          <BillCollectorOverlay />
          <DeathNewspaperOverlay />
          {showSettings && <SettingsModal onClose={() => useGameStore.getState().setShowSettings(false)} />}
          <GameOverScreen onExit={onBack} />
        </>
      )}

      <button
        onClick={() => { useGameStore.getState().save(); onBack() }}
        style={menuBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(180deg, #e8a050 0%, #c87828 50%, #8b4513 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(180deg, #d4883a 0%, #b15e1a 50%, #5d2c00 100%)'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.4)'
          e.currentTarget.style.transform = 'translateY(1px)'
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        Inicio
      </button>
    </div>
  )
}

const menuBtnStyle: React.CSSProperties = {
  position: 'absolute', top: 8, left: 8, zIndex: 20,
  width: 110, height: 52,
  border: '3px solid #5d2c00',
  borderRadius: 8,
  background: 'linear-gradient(180deg, #d4883a 0%, #b15e1a 50%, #5d2c00 100%)',
  color: '#f8d6a4',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: 2,
  fontFamily: "'VT323', monospace",
  textShadow: '0 1px 0 #5d2c00',
  textTransform: 'none',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45)',
  transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
}
