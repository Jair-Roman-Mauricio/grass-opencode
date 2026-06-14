import { useEffect, useState } from 'react'
import { audioManager } from '../audio/AudioManager'
import { voiceManager } from '../audio/VoiceManager'

/* ── Paleta inventario / Stardew ── */
const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
const PIXEL_FONT = "'VT323', monospace"
const TEXT_DARK = '#3a2010'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [volume, setVolume] = useState(audioManager.getVolume() * 100)
  const [muted, setMuted] = useState(!audioManager.isEnabled())
  const [musicOn, setMusicOn] = useState(audioManager.isMusicEnabled())
  const [sfxOn, setSfxOn] = useState(audioManager.isSfxEnabled())
  const [voiceOn, setVoiceOn] = useState(voiceManager.isEnabled())

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    audioManager.setVolume(v / 100)
    if (v > 0 && muted) {
      setMuted(false)
      audioManager.setEnabled(true)
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    audioManager.setEnabled(!next)
    if (!next) audioManager.setVolume(volume / 100)
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    audioManager.setMusicEnabled(next)
  }

  const toggleSfx = () => {
    const next = !sfxOn
    setSfxOn(next)
    audioManager.setSfxEnabled(next)
  }

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    voiceManager.setEnabled(next)
  }

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
      <div
        className="modal-content"
        style={outerFrameStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pestaña superior */}
        <div style={tabBarStyle}>
          <div style={activeTabStyle}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span style={tabLabelStyle}>Ajustes</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={closeTabBtnStyle} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Panel interior */}
        <div style={innerPlaqueStyle}>
          <h2 style={titleStyle}>CONFIGURACIÓN</h2>

          <div style={dividerStyle} />

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>AUDIO</div>

            <div style={rowStyle}>
              <label style={labelStyle}>Volumen maestro</label>
              <div style={sliderRowStyle}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={muted}
                  className="settings-slider"
                  style={{ flex: 1, opacity: muted ? 0.45 : 1 }}
                />
                <span style={valueStyle}>{Math.round(volume)}%</span>
              </div>
            </div>

            <SettingToggle
              label="Silenciar"
              on={!muted}
              onClick={toggleMute}
            />
            <SettingToggle
              label="Música"
              on={musicOn && !muted}
              onClick={toggleMusic}
              disabled={muted}
            />
            <SettingToggle
              label="Efectos"
              on={sfxOn && !muted}
              onClick={toggleSfx}
              disabled={muted}
            />
            <SettingToggle
              label="Voces"
              on={voiceOn && !muted}
              onClick={toggleVoice}
              disabled={muted}
            />
          </section>

          <div style={dividerStyle} />

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>PRÓXIMAMENTE</div>
            <div style={placeholderStyle}>
              <div style={placeholderItemStyle}>· Controles</div>
              <div style={placeholderItemStyle}>· Gráficos</div>
              <div style={placeholderItemStyle}>· Idioma</div>
            </div>
          </section>

          <div style={footerStyle}>
            <button onClick={onClose} style={woodBtnStyle}>CERRAR</button>
          </div>
        </div>

        <style>{`
          .settings-slider {
            -webkit-appearance: none;
            appearance: none;
            height: 10px;
            border-radius: 4px;
            background: linear-gradient(180deg, #8b5a2b 0%, #d4af75 100%);
            border: 2px solid ${WOOD_DARK};
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.25);
            outline: none;
            cursor: pointer;
          }
          .settings-slider:disabled { cursor: not-allowed; }
          .settings-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 22px;
            border-radius: 4px;
            background: linear-gradient(180deg, ${LIGHT_CREAM} 0%, ${CREAM} 100%);
            border: 2px solid ${WOOD_DARK};
            box-shadow: 0 2px 4px rgba(0,0,0,0.35);
            cursor: pointer;
          }
          .settings-slider::-moz-range-thumb {
            width: 18px;
            height: 22px;
            border-radius: 4px;
            background: linear-gradient(180deg, ${LIGHT_CREAM} 0%, ${CREAM} 100%);
            border: 2px solid ${WOOD_DARK};
            box-shadow: 0 2px 4px rgba(0,0,0,0.35);
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  )
}

function SettingToggle({
  label,
  on,
  onClick,
  disabled,
}: {
  label: string
  on: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div style={rowStyle}>
      <label style={labelStyle}>{label}</label>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...toggleBaseStyle,
          ...(on && !disabled ? toggleOnStyle : toggleOffStyle),
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {on && !disabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const outerFrameStyle: React.CSSProperties = {
  width: 480,
  maxWidth: '92vw',
  background: `linear-gradient(135deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  border: `5px solid ${WOOD_DARK}`,
  borderRadius: 12,
  padding: '8px 12px 14px 12px',
  boxShadow: '0 12px 36px rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.4)',
  position: 'relative',
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
  padding: '6px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6)',
}

const tabLabelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 16,
  fontWeight: 'bold',
  color: WOOD_DARK,
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
  padding: '16px 20px 20px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: PIXEL_FONT,
  fontSize: 28,
  fontWeight: 'bold',
  color: WOOD_DARK,
  letterSpacing: 3,
  textAlign: 'center',
}

const dividerStyle: React.CSSProperties = {
  height: 2,
  background: `${WOOD_MID}55`,
  margin: '14px 0',
  borderRadius: 1,
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  fontWeight: 'bold',
  color: WOOD_MID,
  letterSpacing: 2,
  textTransform: 'uppercase',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
}

const labelStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  color: TEXT_DARK,
  minWidth: 120,
}

const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flex: 1,
}

const valueStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1b5e20',
  minWidth: 48,
  textAlign: 'right',
}

const toggleBaseStyle: React.CSSProperties = {
  padding: '6px 18px',
  minWidth: 64,
  borderRadius: 4,
  fontFamily: PIXEL_FONT,
  fontSize: 18,
  fontWeight: 'bold',
  letterSpacing: 1,
  border: `2px solid ${WOOD_DARK}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)',
}

const toggleOnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #6aab4e 0%, #4a8a2e 50%, #2a6a0e 100%)',
  color: CREAM,
  textShadow: `0 1px 0 ${WOOD_DARK}`,
}

const toggleOffStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, #c4a070 0%, #a08050 50%, ${WOOD_MID} 100%)`,
  color: WOOD_DARK,
}

const placeholderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 14px',
  background: '#d4af75',
  borderRadius: 6,
  border: `2px dashed ${SLOT_BORDER}`,
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
}

const placeholderItemStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 18,
  color: WOOD_DARK,
  opacity: 0.65,
}

const footerStyle: React.CSSProperties = {
  marginTop: 18,
  display: 'flex',
  justifyContent: 'flex-end',
}

const woodBtnStyle: React.CSSProperties = {
  border: `2px solid ${WOOD_DARK}`,
  borderRadius: 4,
  padding: '8px 28px',
  background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
  color: CREAM,
  cursor: 'pointer',
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  letterSpacing: 2,
  textTransform: 'uppercase',
  textShadow: `0 1px 0 ${WOOD_DARK}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)',
}
