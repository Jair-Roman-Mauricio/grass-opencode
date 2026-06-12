import type { GameState, UpgradeId, SeedId, SeedDef, ToolDef, PlotData } from './types'
import { UPGRADES, AREAS, SEEDS, TOOLS, SEED_CAP_PER_TIER } from './constants'

export function getUpgradeLevel(state: GameState, id: UpgradeId): number {
  return state.upgrades[id]
}

export function getUpgradeValue(state: GameState, id: UpgradeId): number {
  const level = state.upgrades[id]
  const def = UPGRADES.find(u => u.id === id)
  if (!def) return 0
  return def.levels[level]?.value ?? 0
}

export function getUpgradeCost(state: GameState, id: UpgradeId): number | null {
  const level = state.upgrades[id]
  const def = UPGRADES.find(u => u.id === id)
  if (!def || level >= def.levels.length - 1) return null
  return def.levels[level + 1].cost
}

export function isUpgradeMaxed(state: GameState, id: UpgradeId): boolean {
  const level = state.upgrades[id]
  const def = UPGRADES.find(u => u.id === id)
  if (!def) return true
  return level >= def.levels.length - 1
}

export function canAffordUpgrade(state: GameState, id: UpgradeId): boolean {
  const cost = getUpgradeCost(state, id)
  return cost !== null && state.money >= cost
}

export function calculateDeposit(state: GameState): number {
  const load = state.mower.load
  const incomeMult = getUpgradeValue(state, 'income')
  const area = getCurrentAreaDef(state)
  const areaBonus = area ? area.grassBonus : 0
  return Math.floor(load * incomeMult * (1 + areaBonus * 0.1))
}

export function getCapacity(state: GameState): number {
  return getUpgradeValue(state, 'capacity')
}

export function getSpeed(state: GameState): number {
  return getUpgradeValue(state, 'speed')
}

export function getCutWidth(state: GameState): number {
  return getCurrentTool(state).cutWidth
}

export function getBladePower(state: GameState): number {
  return getCurrentTool(state).bladePower
}

// --- Herramientas ---

export function getCurrentTool(state: GameState): ToolDef {
  return TOOLS[Math.min(state.tool, TOOLS.length - 1)]
}

export function getToolDef(idx: number): ToolDef | undefined {
  return TOOLS[idx]
}

export function isRiding(state: GameState): boolean {
  return getCurrentTool(state).rideable
}

// --- Semillas ---

export function getSeedDef(id: SeedId): SeedDef {
  return SEEDS.find(s => s.id === id) ?? SEEDS[0]
}

/** ¿Está desbloqueada esta categoría de semilla? */
export function isSeedUnlocked(state: GameState, id: SeedId): boolean {
  return getSeedDef(id).tier <= state.seedTierUnlocked
}

/** Tope de semillas que puede tener el jugador de un tier dado. */
export function seedBuyCap(state: GameState, tier: number): number {
  if (tier > state.seedTierUnlocked) return 0
  return SEED_CAP_PER_TIER * (state.seedTierUnlocked - tier + 1)
}

/** Coste real de la próxima semilla: las primeras 5 de pasto (tier 0) son gratis. */
export function seedEffectiveCost(state: GameState, id: SeedId): number {
  const def = getSeedDef(id)
  if (def.tier === 0 && state.freeStarterSeeds > 0) return 0
  return def.seedCost
}

/** ¿Puede comprar una semilla más de este tipo (desbloqueada y por debajo del tope)? */
export function canBuySeed(state: GameState, id: SeedId): boolean {
  const def = getSeedDef(id)
  if (!isSeedUnlocked(state, id)) return false
  if (state.seeds[id] >= seedBuyCap(state, def.tier)) return false
  return state.money >= seedEffectiveCost(state, id)
}

/** Hay semilla seleccionada disponible para plantar. */
export function canPlant(state: GameState): boolean {
  return (state.seeds[state.selectedSeed] ?? 0) > 0
}

/** Valor monetario de una planta madura cosechada (a income×1). */
export function plotCutValue(plot: PlotData): number {
  return getSeedDef(plot.type).sellValue
}

export function getIncomeMultiplier(state: GameState): number {
  return getUpgradeValue(state, 'income')
}

function getCurrentAreaDef(state: GameState) {
  for (const area of AREAS) {
    if (
      state.mower.x >= area.rowStart &&
      state.mower.x < area.rowEnd &&
      state.mower.y >= area.colStart &&
      state.mower.y < area.colEnd
    ) {
      return area
    }
  }
  return null
}
