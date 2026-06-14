import type { GameState } from './types'
import { MAPS, INHERITED_DEBT_TOTAL } from './constants'

export type MissionKind = 'main' | 'secondary'

export interface MissionView {
  id: string
  kind: MissionKind
  title: string
  progress: number
  completed: boolean
}

export function isMapMainObjectiveComplete(state: GameState, mapId: number): boolean {
  if (mapId === 0) {
    return state.inheritedDebtPaid >= INHERITED_DEBT_TOTAL
  }
  // El Pueblo: sin objetivo definido todavía.
  return true
}

export function getMissionsForMap(state: GameState, mapId: number): MissionView[] {
  if (mapId === 0) {
    const progress = Math.min(
      100,
      Math.round((state.inheritedDebtPaid / INHERITED_DEBT_TOTAL) * 100),
    )
    const completed = state.inheritedDebtPaid >= INHERITED_DEBT_TOTAL
    return [{
      id: 'parcela_debt',
      kind: 'main',
      title: 'Liquidar la deuda del abuelo',
      progress,
      completed,
    }]
  }
  return []
}

export function isTicketBlockedByObjective(state: GameState, targetMapId: number): boolean {
  const map = MAPS.find((m) => m.id === targetMapId)
  if (!map || map.comingSoon) return false
  if (state.mapsOwned[targetMapId]) return false
  return targetMapId > state.currentMap && !isMapMainObjectiveComplete(state, state.currentMap)
}

export function getMapObjectiveBlockReason(state: GameState, targetMapId: number): string | null {
  if (!isTicketBlockedByObjective(state, targetMapId)) return null
  if (state.currentMap === 0) {
    return 'No podrás viajar hasta que liquides la deuda del abuelo… o te romperemos las piernas. Si mueres, se las romperemos al cadáver.'
  }
  return 'Requiere: completar objetivo principal'
}
