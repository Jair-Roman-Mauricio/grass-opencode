import { useGameStore } from '../store/gameStore'
import { UPGRADES } from '../game/constants'
import { getUpgradeCost, isUpgradeMaxed, canAffordUpgrade } from '../game/economy'
import { formatNum } from '../utils/utils'

export function ShopOverlay() {
  const state = useGameStore((s) => s.state)
  const showShop = useGameStore((s) => s.showShop)
  const toggleShop = useGameStore((s) => s.toggleShop)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)

  if (!showShop) return null

  return (
    <div style={overlayStyle} onClick={toggleShop}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#fff', margin: '0 0 16px', textAlign: 'center', fontSize: 20 }}>
          TIENDA
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {UPGRADES.map((upgrade) => {
            const level = state.upgrades[upgrade.id]
            const maxed = isUpgradeMaxed(state, upgrade.id)
            const cost = getUpgradeCost(state, upgrade.id)
            const canBuy = canAffordUpgrade(state, upgrade.id)

            return (
              <div key={upgrade.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 20 }}>{upgrade.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                      {upgrade.name}
                    </div>
                    <div style={{ color: '#888', fontSize: 11 }}>{upgrade.desc}</div>
                    <div style={{ color: '#aaa', fontSize: 11 }}>
                      Nv.{level} {maxed ? '(MAX)' : `-> ${level + 1}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', textAlign: 'right' }}>
                    <div>{upgrade.levels[level]?.value}</div>
                    {!maxed && (
                      <div style={{ color: '#4CAF50' }}>
                        {'>'} {upgrade.levels[level + 1]?.value}
                      </div>
                    )}
                  </div>
                </div>
                {!maxed && (
                  <button
                    onClick={() => buyUpgrade(upgrade.id)}
                    disabled={!canBuy}
                    style={{
                      ...buyBtnStyle,
                      background: canBuy ? '#4CAF50' : '#444',
                      opacity: canBuy ? 1 : 0.5,
                      cursor: canBuy ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ${formatNum(cost!)}
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

const buyBtnStyle: React.CSSProperties = {
  border: 'none', borderRadius: 8, padding: '8px 14px',
  color: '#fff', fontWeight: 'bold', fontSize: 12,
  whiteSpace: 'nowrap',
}
