import { useEffect, useState } from 'react'
import { audioManager } from '../audio/AudioManager'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [volume, setVolume] = useState(audioManager.getVolume() * 100)
  const [muted, setMuted] = useState(!audioManager.isEnabled())

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

  return (
    <div className='modal-overlay' style={overlayStyle} onClick={onClose}>
      <div className='modal-content' style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>CONFIGURACIÓN</h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label='Cerrar'>×</button>
        </div>

        <div style={dividerStyle} />

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>AUDIO</div>

          <div style={rowStyle}>
            <label style={labelStyle}>Volumen maestro</label>
            <div style={sliderRowStyle}>
              <input
                type='range'
                min={0}
                max={100}
                value={volume}
                onChange={handleVolumeChange}
                disabled={muted}
                style={sliderStyle(muted)}
              />
              <span style={valueStyle}>{Math.round(volume)}%</span>
            </div>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Silenciar</label>
            <button
              onClick={toggleMute}
              style={muted ? toggleOffStyle : toggleOnStyle}
            >
              {muted ? 'OFF' : 'ON'}
            </button>
          </div>
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
          <button onClick={onClose} style={closeFooterStyle}>CERRAR</button>
        </div>
      </div>
    </div>
  )
}

const GREEN = '#5CAB3E'
const GREEN_BRIGHT = '#66BB6A'

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 100,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modalStyle: React.CSSProperties = {
  width: 480, maxWidth: '90vw',
  background: 'linear-gradient(180deg, #1f1f1f 0%, #161616 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: 24,
  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(92,171,62,0.15)',
  color: '#eee',
  fontFamily: "'Cinzel', 'Times New Roman', serif",
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 12,
}

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: 4,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888',
  fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 0,
  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, transition: 'all 0.15s',
}

const dividerStyle: React.CSSProperties = {
  height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: GREEN_BRIGHT,
  letterSpacing: 3, textTransform: 'uppercase',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 16,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, color: '#ccc', fontFamily: '-apple-system, sans-serif',
}

const sliderRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, flex: 1,
}

const valueStyle: React.CSSProperties = {
  fontSize: 12, color: GREEN_BRIGHT, fontFamily: 'monospace',
  minWidth: 40, textAlign: 'right',
}

const sliderStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1, height: 4, appearance: 'none', WebkitAppearance: 'none',
  background: 'rgba(255,255,255,0.1)', borderRadius: 2, outline: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
})

const toggleOnStyle: React.CSSProperties = {
  padding: '6px 16px', minWidth: 60,
  background: `linear-gradient(135deg, ${GREEN_BRIGHT}, ${GREEN})`,
  color: '#fff', border: 'none', borderRadius: 6,
  fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer',
}

const toggleOffStyle: React.CSSProperties = {
  ...toggleOnStyle,
  background: 'rgba(255,255,255,0.08)', color: '#888',
}

const placeholderStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
  padding: 12, background: 'rgba(255,255,255,0.03)',
  borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)',
}

const placeholderItemStyle: React.CSSProperties = {
  fontSize: 12, color: '#666', fontFamily: '-apple-system, sans-serif',
}

const footerStyle: React.CSSProperties = {
  marginTop: 20, display: 'flex', justifyContent: 'flex-end',
}

const closeFooterStyle: React.CSSProperties = {
  padding: '10px 24px', background: 'rgba(255,255,255,0.06)',
  color: '#ddd', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6, fontSize: 12, fontWeight: 600,
  letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
  transition: 'all 0.15s',
}
