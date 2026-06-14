import { useIsLandscape, useIsMobile } from '../hooks/useIsMobile'

const PIXEL_FONT = "'VT323', monospace"

export function RotateDeviceOverlay() {
  const isMobile = useIsMobile()
  const isLandscape = useIsLandscape()

  if (!isMobile || isLandscape) return null

  return (
    <div className="rotate-device-overlay" style={overlayStyle}>
      <div style={cardStyle}>
        <div style={iconStyle} aria-hidden>📱</div>
        <h2 style={titleStyle}>Gira tu dispositivo</h2>
        <p style={descStyle}>
          Stone Grass se juega en horizontal para que los controles se distribuyan mejor.
        </p>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(0, 0, 0, 0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  pointerEvents: 'auto',
}

const cardStyle: React.CSSProperties = {
  maxWidth: 320,
  textAlign: 'center',
  color: '#f8d6a4',
}

const iconStyle: React.CSSProperties = {
  fontSize: 64,
  marginBottom: 16,
  display: 'inline-block',
  transform: 'rotate(90deg)',
  animation: 'rotatePhoneHint 2s ease-in-out infinite',
}

const titleStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 32,
  fontWeight: 'bold',
  margin: '0 0 12px',
  letterSpacing: 2,
}

const descStyle: React.CSSProperties = {
  fontFamily: PIXEL_FONT,
  fontSize: 20,
  lineHeight: 1.35,
  margin: 0,
  opacity: 0.85,
}
