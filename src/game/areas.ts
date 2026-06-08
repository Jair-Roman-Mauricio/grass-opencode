import type { GameState, AreaDef } from './types'
import { AREAS } from './constants'

export function getAreaDef(id: number): AreaDef | undefined {
  return AREAS.find(a => a.id === id)
}

export function isAreaOwned(state: GameState, id: number): boolean {
  return state.areas[id] ?? false
}

export function canAffordArea(state: GameState, id: number): boolean {
  const area = getAreaDef(id)
  if (!area) return false
  return state.money >= area.cost
}

export function isAreaAdjacent(state: GameState, id: number): boolean {
  const area = getAreaDef(id)
  if (!area) return false

  for (let i = 0; i < state.areas.length; i++) {
    if (!state.areas[i]) continue
    const owned = getAreaDef(i)
    if (!owned) continue

    const sharesRowBorder =
      area.rowStart === owned.rowEnd || area.rowEnd === owned.rowStart
    const sharesColBorder =
      area.colStart === owned.colEnd || area.colEnd === owned.colStart
    const overlaps =
      area.rowStart < owned.rowEnd &&
      area.rowEnd > owned.rowStart &&
      area.colStart < owned.colEnd &&
      area.colEnd > owned.colStart

    if (overlaps && (sharesRowBorder || sharesColBorder)) return true
  }

  return false
}

export function isAreaUnlockable(state: GameState, id: number): boolean {
  return !isAreaOwned(state, id) && isAreaAdjacent(state, id)
}

export function getMowerAreaId(state: GameState): number {
  for (const area of AREAS) {
    if (
      state.mower.x >= area.rowStart &&
      state.mower.x < area.rowEnd &&
      state.mower.y >= area.colStart &&
      state.mower.y < area.colEnd
    ) {
      return area.id
    }
  }
  return -1
}

export function getOwnedAreaCount(state: GameState): number {
  return state.areas.filter(Boolean).length
}
