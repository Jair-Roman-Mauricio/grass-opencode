import { useGameStore } from '../store/gameStore'

interface GameOverScreenProps {
  onExit: () => void
}

export function GameOverScreen({ onExit }: GameOverScreenProps) {
  const gameOver = useGameStore((s) => s.gameOver)
  const day = useGameStore((s) => s.state.day)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!gameOver) return null

  const toMenu = () => { resetGame(); onExit() }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={skullStyle}>☠</div>
        <h1 style={titleStyle}>SE ACABÓ</h1>
        <p style={textStyle}>
          No pudiste cubrir tus deudas. El cobrador se quedó con la parcela,
          con tus semillas y, probablemente, con tus órganos.
        </p>
        <p style={dayStyle}>Sobreviviste <b>{day}</b> {day === 1 ? 'día' : 'días'}.</p>
        <div style={btnRowStyle}>
          <button style={retryBtnStyle} onClick={toMenu}>EMPEZAR DE NUEVO</button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 300,
  background: 'radial-gradient(ellipse at center, #2a0d0d 0%, #050505 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const cardStyle: React.CSSProperties = {
  width: 'min(520px, 90vw)', textAlign: 'center', padding: 36,
  background: 'linear-gradient(180deg, #1c1414 0%, #120d0d 100%)',
  border: '1px solid rgba(216,83,63,0.35)', borderRadius: 16,
  boxShadow: '0 20px 70px rgba(0,0,0,0.7), 0 0 60px rgba(216,83,63,0.15)',
  color: '#eee', fontFamily: "'Cinzel', 'Times New Roman', serif",
}

const skullStyle: React.CSSProperties = { fontSize: 64, lineHeight: 1, marginBottom: 8 }

const titleStyle: React.CSSProperties = {
  margin: '0 0 16px', fontSize: 38, letterSpacing: 8, fontWeight: 700,
  color: '#d8533f', textShadow: '0 0 24px rgba(216,83,63,0.5)',
}

const textStyle: React.CSSProperties = {
  margin: '0 auto 14px', maxWidth: 420, fontSize: 15, lineHeight: 1.6,
  color: '#cbb8b3', fontFamily: "'Georgia', serif", fontStyle: 'italic',
}

const dayStyle: React.CSSProperties = {
  margin: '0 0 24px', fontSize: 14, color: '#8a7d7a',
  fontFamily: '-apple-system, sans-serif',
}

const btnRowStyle: React.CSSProperties = {
  display: 'flex', gap: 12, justifyContent: 'center',
}

const retryBtnStyle: React.CSSProperties = {
  padding: '12px 24px', border: 'none', borderRadius: 8,
  background: 'linear-gradient(135deg, #e0654a, #c23a28)', color: '#fff',
  fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(216,83,63,0.4)',
}

const menuBtnStyle: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 8,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#ddd', fontWeight: 600, fontSize: 13, letterSpacing: 2, cursor: 'pointer',
}
