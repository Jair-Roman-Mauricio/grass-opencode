import { useGameStore } from '../store/gameStore'
import { getMissionsForMap } from '../game/missions'
import { INHERITED_DEBT_TOTAL } from '../game/constants'
import { formatNum } from '../utils/utils'

const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const CREAM = '#f8d6a4'
const PIXEL_FONT = "'VT323', monospace"

export function MissionPanel() {
  const state = useGameStore((s) => s.state)
  const missions = getMissionsForMap(state, state.currentMap)

  if (state.currentMap === 1 && missions.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={soonStyle}>Misiones del pueblo — próximamente</div>
      </div>
    )
  }

  if (missions.length === 0) return null

  return (
    <div style={panelStyle}>
      {missions.map((m) => (
        <div key={m.id} style={rowStyle}>
          <span style={circleStyle(m.completed)}>{m.completed ? '⊘' : '○'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titleRowStyle}>
              <span style={titleStyle}>
                {m.kind === 'main' ? '★ ' : ''}{m.title}
              </span>
              <span style={pctStyle}>{m.progress}%</span>
            </div>
            <div style={barTrackStyle}>
              <div style={{ ...barFillStyle, width: `${m.progress}%` }} />
            </div>
            {m.id === 'parcela_debt' && (
              <div style={subStyle}>
                ${formatNum(state.inheritedDebtPaid)} / ${formatNum(INHERITED_DEBT_TOTAL)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  marginTop: 4,
  padding: '6px 8px',
  minWidth: 168,
  maxWidth: 220,
  background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
  border: `2px solid ${WOOD_DARK}`,
  borderRadius: 6,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 6px rgba(0,0,0,0.35)',
  fontFamily: PIXEL_FONT,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
}

const circleStyle = (done: boolean): React.CSSProperties => ({
  color: done ? '#4a8a2e' : WOOD_MID,
  fontSize: 14,
  lineHeight: 1.2,
  flexShrink: 0,
})

const titleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 4,
}

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 'bold',
  color: WOOD_DARK,
  lineHeight: 1.1,
}

const pctStyle: React.CSSProperties = {
  fontSize: 12,
  color: WOOD_MID,
  flexShrink: 0,
}

const barTrackStyle: React.CSSProperties = {
  height: 5,
  marginTop: 3,
  background: 'rgba(93,44,0,0.2)',
  borderRadius: 3,
  overflow: 'hidden',
}

const barFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #4a8a2e, #6aab4e)',
  borderRadius: 3,
  transition: 'width 0.3s ease',
}

const subStyle: React.CSSProperties = {
  fontSize: 11,
  color: WOOD_MID,
  marginTop: 2,
}

const soonStyle: React.CSSProperties = {
  fontSize: 12,
  color: WOOD_MID,
  textAlign: 'center',
  lineHeight: 1.2,
}
