import { useGameStore } from '../store/gameStore'
import { SEEDS } from '../game/constants'
import { isSeedUnlocked, seedBuyCap, canBuySeed, seedEffectiveCost } from '../game/economy'
import { ShopModal, type ShopItem } from './ShopModal'

export function SeedShopOverlay() {
  const state = useGameStore((s) => s.state)
  const show = useGameStore((s) => s.showSeedShop)
  const toggle = useGameStore((s) => s.toggleSeedShop)
  const buySeed = useGameStore((s) => s.buySeed)
  const unlockSeed = useGameStore((s) => s.unlockSeed)
  const selectSeed = useGameStore((s) => s.selectSeed)

  if (!show) return null

  const items: ShopItem[] = SEEDS.map((seed) => {
    const unlocked = isSeedUnlocked(state, seed.id)
    const inv = state.seeds[seed.id] ?? 0
    const cap = seedBuyCap(state, seed.tier)

    if (!unlocked) {
      // Solo el tier inmediatamente superior puede desbloquearse.
      const isNext = seed.tier === state.seedTierUnlocked + 1
      const canUnlock = isNext && state.money >= seed.unlockCost
      return {
        id: seed.id,
        icon: seed.icon,
        name: seed.name,
        sub: isNext ? 'Desbloquear categoría' : 'Bloqueado',
        price: isNext ? seed.unlockCost : undefined,
        badge: isNext ? undefined : '🔒 BLOQUEADO',
        buyLabel: 'DESBLOQUEAR',
        buyHidden: !isNext,
        buyDisabled: !canUnlock,
        onBuy: () => unlockSeed(seed.id),
      }
    }

    const freeNote = seed.tier === 0 && state.freeStarterSeeds > 0
      ? `  ·  GRATIS (${state.freeStarterSeeds})`
      : ''
    return {
      id: seed.id,
      icon: seed.icon,
      name: seed.name,
      sub: `Tienes ${inv}/${cap}  ·  Vende $${seed.sellValue}${freeNote}`,
      price: seedEffectiveCost(state, seed.id),
      buyLabel: inv >= cap ? 'MÁX' : 'COMPRAR',
      buyDisabled: !canBuySeed(state, seed.id),
      onBuy: () => buySeed(seed.id),
      selectable: true,
      selected: state.selectedSeed === seed.id,
      onSelect: () => selectSeed(seed.id),
    }
  })

  return (
    <ShopModal
      title="Semillas"
      money={state.money}
      items={items}
      onClose={toggle}
    />
  )
}
