import type { GameState, UpgradeId } from './types'
import { UPGRADES, AREAS } from './constants'

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
  return getUpgradeValue(state, 'width')
}

export function getBladePower(state: GameState): number {
  return getUpgradeValue(state, 'blade')
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
