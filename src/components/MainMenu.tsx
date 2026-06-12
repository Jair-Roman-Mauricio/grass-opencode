import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { audioManager } from '../audio/AudioManager'
import { SettingsModal } from './SettingsModal'
import { useIsMobile } from '../hooks/useIsMobile'

interface MainMenuProps {
  onStart: (withIntro: boolean) => void
}

const API_BASE = '/api'

interface SaveSummary {
  id: number
  created_at: string
  money: number
  total_cut: number
}

export function MainMenu({ onStart }: MainMenuProps) {
  const load = useGameStore((s) => s.load)
  const newGame = useGameStore((s) => s.newGame)
  const state = useGameStore((s) => s.state)
  const [saves, setSaves] = useState<SaveSummary[]>([])
  const [savesLoading, setSavesLoading] = useState(false)
  const [savesError, setSavesError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bgFailed, setBgFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchSaves = async () => {
      setSavesLoading(true)
      setSavesError(null)
      try {
        const res = await fetch(`${API_BASE}/saves`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: SaveSummary[] = await res.json()
        if (!cancelled) setSaves(data)
      } catch (err) {
        if (!cancelled) {
          setSaves([])
          setSavesError(err instanceof Error ? err.message : 'Error desconocido')
        }
      } finally {
        if (!cancelled) setSavesLoading(false)
      }
    }
    fetchSaves()
    return () => { cancelled = true }
  }, [])

  const handleClick = (fn: () => void) => {
    audioManager.resume()
    fn()
  }

  const handleNewGame = async () => {
    audioManager.resume()
    try {
      const res = await fetch(`${API_BASE}/saves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ money: 0, total_cut: 0 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.warn('No se pudo crear save remoto:', err)
    }
    newGame()
    onStart(true) // partida nueva → mostrar cinemática de introducción
  }

  const handleContinue = async () => {
    audioManager.resume()
    if (saves.length === 0) return
    try {
      const res = await fetch(`${API_BASE}/saves/${saves[0].id}`)
      if (res.ok) await res.json()
    } catch (err) {
      console.warn('No se pudo cargar save remoto:', err)
    }
    load()
    onStart(false) // continuar → entrar directo, sin cinemática
  }

  const hasSave = saves.length > 0
  const hasProgress = state.money > 0 || state.stats.totalCut > 0
  const isMobile = useIsMobile()

  return (
    <div style={containerStyle}>
      <div style={{
        ...sidebarStyle,
        ...(isMobile ? { width: '100%', borderRight: 'none', boxShadow: 'none' } : {}),
      }}>
        <div style={sidebarTextureStyle} />

        <div style={{
          ...sidebarContentStyle,
          ...(isMobile ? { padding: '40px 24px 24px' } : {}),
        }}>
          <Title isMobile={isMobile} />

          <div style={{
            ...subtitleStyle,
            ...(isMobile ? { fontSize: 10, marginBottom: 32, padding: '0 8px' } : {}),
          }}>
            Corta pasto · Gana dinero · Expande tu terreno
          </div>

          <div style={buttonsWrapStyle}>
            <PrimaryButton
              label='JUGAR PARTIDA'
              onClick={handleNewGame}
            />

            <SecondaryButton
              label='CONTINUAR'
              onClick={handleContinue}
              disabled={!hasSave || savesLoading}
              status={
                savesLoading
                  ? 'buscando...'
                  : savesError
                    ? 'sin conexión'
                    : hasSave
                      ? `última: $${saves[0].money} · ${saves[0].total_cut} cortes`
                      : 'sin partidas guardadas'
              }
              subtitle={
                hasSave
                  ? new Date(saves[0].created_at).toLocaleString()
                  : undefined
              }
            />

            <SecondaryButton
              label='CONFIGURACIÓN'
              onClick={() => { audioManager.resume(); setSettingsOpen(true) }}
            />
          </div>

          {hasProgress && (
            <div style={progressStyle}>
              Progreso local: ${state.money} · {state.stats.totalCut} cortes
            </div>
          )}

          <div style={versionStyle}>v1.0.0</div>
        </div>
      </div>

      {!isMobile && <div style={rightPanelStyle}>
        {bgFailed ? (
          <div style={bgFallbackStyle}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              Añade <code style={{ color: '#5CAB3E' }}>public/menu-bg/background.png</code>
            </div>
          </div>
        ) : (
          <img
            src='/menu-bg/background.png'
            alt='Stone Grass'
            onError={() => setBgFailed(true)}
            style={bgImageStyle}
          />
        )}
        <div style={bgVignetteStyle} />
      </div>}

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}

function Title({ isMobile }: { isMobile: boolean }) {
  const mobileTitle = isMobile ? { fontSize: 32, letterSpacing: 4 } : {}
  return (
    <div style={titleWrapStyle}>
      <div style={{ ...titleOrnamentStyle, ...(isMobile ? { fontSize: 12, letterSpacing: 6 } : {}) }}>— ✦ —</div>
      <h1 style={{ ...titleStyle, ...mobileTitle }}>STONE GRASS</h1>
      <div style={{ ...titleShadowStyle, ...mobileTitle }} aria-hidden>STONE GRASS</div>
    </div>
  )
}

interface PrimaryButtonProps {
  label: string
  onClick: () => void
}

function PrimaryButton({ label, onClick }: PrimaryButtonProps) {
  return (
    <button onClick={onClick} style={primaryBtnStyle}>
      <span style={primaryIconStyle} aria-hidden>❖</span>
      <span style={primaryLabelStyle}>{label}</span>
      <span style={primaryIconStyle} aria-hidden>❖</span>
    </button>
  )
}

interface SecondaryButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  status?: string
  subtitle?: string
}

function SecondaryButton({ label, onClick, disabled, status, subtitle }: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={disabled ? secondaryBtnDisabledStyle : secondaryBtnStyle}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'rgba(92,171,62,0.12)'
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
    >
      <span style={secondaryLabelStyle}>{label}</span>
      {status && <span style={secondaryStatusStyle}>{status}</span>}
      {subtitle && <span style={secondarySubtitleStyle}>{subtitle}</span>}
    </button>
  )
}

const GREEN = '#5CAB3E'
const GREEN_BRIGHT = '#66BB6A'
const SIDEBAR_BG = '#1a1a1a'

const containerStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex',
  background: '#0a0a1a', overflow: 'hidden',
}

const sidebarStyle: React.CSSProperties = {
  width: 360, flexShrink: 0, height: '100%',
  background: `linear-gradient(180deg, ${SIDEBAR_BG} 0%, #141414 100%)`,
  position: 'relative', display: 'flex', flexDirection: 'column',
  borderRight: '1px solid rgba(255,255,255,0.04)',
  boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
  zIndex: 2,
}

const sidebarTextureStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(circle at 20% 10%, rgba(92,171,62,0.06) 0%, transparent 50%)',
}

const sidebarContentStyle: React.CSSProperties = {
  position: 'relative', flex: 1, display: 'flex',
  flexDirection: 'column', alignItems: 'center',
  padding: '60px 32px 32px', textAlign: 'center',
}

const titleWrapStyle: React.CSSProperties = {
  position: 'relative', marginBottom: 8,
}

const titleOrnamentStyle: React.CSSProperties = {
  fontSize: 14, color: GREEN, letterSpacing: 8, marginBottom: 4,
}

const titleStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', 'Times New Roman', serif",
  fontSize: 42, fontWeight: 700,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT} 0%, ${GREEN} 50%, #2E7D32 100%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: 6, margin: 0,
  textShadow: '0 0 30px rgba(92,171,62,0.3)',
  position: 'relative',
}

const titleShadowStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0,
  fontFamily: "'Cinzel', 'Times New Roman', serif",
  fontSize: 42, fontWeight: 700, letterSpacing: 6,
  color: 'rgba(92,171,62,0.08)',
  filter: 'blur(6px)',
  pointerEvents: 'none',
  zIndex: -1,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 11, color: '#777', marginBottom: 48,
  letterSpacing: 1.5, textTransform: 'uppercase',
}

const buttonsWrapStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12, width: '100%',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '16px 20px', border: 'none',
  borderRadius: 10,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT} 0%, ${GREEN} 100%)`,
  color: '#fff', cursor: 'pointer', fontWeight: 700,
  fontSize: 15, textTransform: 'uppercase', letterSpacing: 3,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
  boxShadow: `0 4px 16px rgba(92,171,62,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`,
  transition: 'transform 0.15s, box-shadow 0.15s',
}

const primaryIconStyle: React.CSSProperties = {
  fontSize: 14, opacity: 0.9, color: 'rgba(255,255,255,0.85)',
}

const primaryLabelStyle: React.CSSProperties = {
  flex: 1, textAlign: 'center',
}

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8, background: 'rgba(255,255,255,0.04)',
  color: '#ddd', cursor: 'pointer', fontWeight: 600,
  fontSize: 13, textTransform: 'uppercase', letterSpacing: 2,
  transition: 'background 0.2s, border-color 0.2s',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
}

const secondaryBtnDisabledStyle: React.CSSProperties = {
  ...secondaryBtnStyle,
  background: 'rgba(255,255,255,0.02)',
  color: '#555', cursor: 'not-allowed',
  borderColor: 'rgba(255,255,255,0.03)',
}

const secondaryLabelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600,
}

const secondaryStatusStyle: React.CSSProperties = {
  fontSize: 9, color: GREEN_BRIGHT, letterSpacing: 1,
  textTransform: 'none', fontWeight: 500,
}

const secondarySubtitleStyle: React.CSSProperties = {
  fontSize: 8, color: '#666', letterSpacing: 0.5,
  textTransform: 'none', fontWeight: 400,
}

const progressStyle: React.CSSProperties = {
  marginTop: 24, padding: '6px 12px',
  background: 'rgba(255,255,255,0.04)', borderRadius: 6,
  fontSize: 10, color: '#888', letterSpacing: 1,
}

const versionStyle: React.CSSProperties = {
  marginTop: 'auto', fontSize: 10, color: '#444', letterSpacing: 1,
}

const rightPanelStyle: React.CSSProperties = {
  flex: 1, position: 'relative', overflow: 'hidden',
  background: '#0a0a1a',
}

const bgImageStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
}

const bgFallbackStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, #2d4a1f 0%, #0a0a1a 100%)',
}

const bgVignetteStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
}
