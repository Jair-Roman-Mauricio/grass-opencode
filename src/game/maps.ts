import type { GameState, MapDef } from './types'
import { MAPS, RETURN_FARE } from './constants'
import { isMapMainObjectiveComplete } from './missions'

export function getMap(id: number): MapDef | undefined {
  return MAPS.find((m) => m.id === id)
}

export function isMapOwned(state: GameState, id: number): boolean {
  return state.mapsOwned[id] ?? false
}

/**
 * Coste de viajar al mapa `to`:
 *  - Volver al mapa 0 (La Parcela): gratis.
 *  - Estás ahí mismo: gratis.
 *  - Mapa ya desbloqueado: tarifa de regreso.
 *  - Mapa nuevo: el precio del boleto (lo desbloquea).
 */
export function travelCost(state: GameState, to: number): number {
  if (to === state.currentMap) return 0
  if (to === 0) return 0
  if (isMapOwned(state, to)) return RETURN_FARE
  return getMap(to)?.ticketCost ?? Infinity
}

export function canTravel(state: GameState, to: number): boolean {
  const map = getMap(to)
  if (!map) return false
  if (map.comingSoon) return false
  return state.money >= travelCost(state, to)
}

/** Comprar boleto a un mapa nuevo: exige objetivo principal del mapa actual. */
export function canBuyTicket(state: GameState, targetMapId: number): boolean {
  const map = getMap(targetMapId)
  if (!map || map.comingSoon) return false
  if (isMapOwned(state, targetMapId)) return false
  if (targetMapId > state.currentMap && !isMapMainObjectiveComplete(state, state.currentMap)) {
    return false
  }
  return state.money >= map.ticketCost
}
