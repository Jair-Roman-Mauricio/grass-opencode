import type { GameState, InputState, MowerState } from './types'
import { GRID_SIZE, BUYER_X, BUYER_Z, BUYER_RADIUS } from './constants'
import { getSpeed, getCutWidth, getBladePower, getCapacity } from './economy'
import { isInBounds } from './gameState'

export interface MovementResult {
  mower: MowerState
  grassCut: number
  earned: number
}

export function processMovement(
  state: GameState,
  input: InputState,
  dt: number
): MovementResult {
  const speed = getSpeed(state)
  const pixelsPerSecond = speed * 60
  const moveAmount = pixelsPerSecond * dt

  let newX = state.mower.x
  let newY = state.mower.y
  let grassCut = 0

  if (input.left) newX -= moveAmount
  if (input.right) newX += moveAmount
  if (input.up) newY -= moveAmount
  if (input.down) newY += moveAmount

  newX = Math.max(0, Math.min(GRID_SIZE - 1, newX))
  newY = Math.max(0, Math.min(GRID_SIZE - 1, newY))

  const bladePower = getBladePower(state)
  const cutWidth = getCutWidth(state)

  grassCut = cutGrass(state, Math.round(newX), Math.round(newY), bladePower, cutWidth)

  const newLoad = Math.min(state.mower.load + grassCut, getCapacity(state))

  return {
    mower: { ...state.mower, x: newX, y: newY, load: newLoad },
    grassCut,
    earned: 0,
  }
}

function cutGrass(
  state: GameState,
  cx: number,
  cy: number,
  bladePower: number,
  width: number
): number {
  let cut = 0
  const halfW = Math.floor(width / 2)

  for (let dx = -halfW; dx <= halfW; dx++) {
    for (let dy = -halfW; dy <= halfW; dy++) {
      const gx = cx + dx
      const gy = cy + dy
      if (!isInBounds(gx, gy)) continue

      const current = state.grass[gy][gx]
      if (current > 0) {
        const reduction = Math.min(current, bladePower)
        state.grass[gy][gx] = current - reduction
        cut += reduction
      }
    }
  }

  return cut
}

export function isNearBarn(state: GameState): boolean {
  // "Cerca del granero" = junto al COMPRADOR (no al edificio).
  const dx = state.mower.x - BUYER_X
  const dy = state.mower.y - BUYER_Z
  return Math.sqrt(dx * dx + dy * dy) <= BUYER_RADIUS
}
