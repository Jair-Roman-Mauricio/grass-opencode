import { useGameStore } from '../store/gameStore'
import { TOOLS } from '../game/constants'
import { ShopModal, type ShopItem } from './ShopModal'

export function ToolShopOverlay() {
  const state = useGameStore((s) => s.state)
  const show = useGameStore((s) => s.showToolShop)
  const toggle = useGameStore((s) => s.toggleToolShop)
  const buyTool = useGameStore((s) => s.buyTool)

  if (!show) return null

  const items: ShopItem[] = TOOLS.map((tool, idx) => {
    const owned = idx <= state.tool
    const isNext = idx === state.tool + 1
    const locked = idx > state.tool + 1

    return {
      id: tool.id,
      icon: tool.icon,
      name: tool.name,
      sub: `Ancho ${tool.cutWidth}${tool.rideable ? ' · se monta' : ''}`,
      price: locked ? undefined : tool.cost,
      badge: owned ? (idx === state.tool ? 'EQUIPADO' : 'COMPRADO') : locked ? '🔒 BLOQUEADO' : undefined,
      buyLabel: 'BUY',
      buyHidden: owned || locked,
      buyDisabled: !isNext || state.money < tool.cost,
      onBuy: () => buyTool(idx),
    }
  })

  return (
    <ShopModal
      title="Herramientas"
      money={state.money}
      items={items}
      onClose={toggle}
    />
  )
}
