import { useGameStore } from '../store/gameStore'
import { AREAS } from '../game/constants'
import { isAreaOwned, isAreaAdjacent, canAffordArea } from '../game/areas'
import { formatNum } from '../utils/utils'

export function ExpandOverlay() {
  const state = useGameStore((s) => s.state)
  const showExpand = useGameStore((s) => s.showExpand)
  const toggleExpand = useGameStore((s) => s.toggleExpand)
  const buyArea = useGameStore((s) => s.buyArea)

  if (!showExpand) return null

  return (
    <div style={overlayStyle} onClick={toggleExpand}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#fff', margin: '0 0 16px', textAlign: 'center', fontSize: 20 }}>
          EXPANDIR TERRENO
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AREAS.map((area) => {
            const owned = isAreaOwned(state, area.id)
            const adjacent = isAreaAdjacent(state, area.id)
            const affordable = canAffordArea(state, area.id)
            const canBuy = !owned && adjacent && affordable

            return (
              <div key={area.id} style={{
                ...cardStyle,
                opacity: owned ? 0.6 : 1,
                borderLeft: owned ? '4px solid #4CAF50' : adjacent ? '4px solid #FFA726' : '4px solid #555',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                    {area.name}
                  </div>
                  <div style={{ color: '#888', fontSize: 11 }}>
                    {owned ? 'PROPIEDAD' : adjacent ? 'ADYACENTE' : 'BLOQUEADO'}
                    {area.grassBonus > 0 && ` | Bonus: +${area.grassBonus}`}
                  </div>
                </div>
                {!owned && (
                  <button
                    onClick={() => buyArea(area.id)}
                    disabled={!canBuy}
                    style={{
                      ...btnStyle,
                      background: canBuy ? '#FFA726' : '#444',
                      opacity: canBuy ? 1 : 0.5,
                      cursor: canBuy ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ${formatNum(area.cost)}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, color: '#4CAF50', fontWeight: 'bold' }}>
          ${formatNum(state.money)}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100,
}

const panelStyle: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: 16, padding: 20,
  width: '90%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', borderRadius: 10,
  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
}

const btnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 8, padding: '8px 14px',
  color: '#fff', fontWeight: 'bold', fontSize: 12,
  whiteSpace: 'nowrap',
}
