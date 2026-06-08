import type { GameState, UpgradeId, MowerState } from './types'
import { GRID_SIZE, MAX_GRASS_HEIGHT } from './constants'

export function createDefaultMower(): MowerState {
  return {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
    load: 0,
    mounted: true,
  }
}

export function createDefaultGrass(): number[][] {
  const grid: number[][] = []
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = []
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r][c] = Math.floor(Math.random() * (MAX_GRASS_HEIGHT + 1))
    }
  }
  return grid
}

export function createDefaultState(): GameState {
  return {
    money: 0,
    upgrades: { speed: 0, capacity: 0, width: 0, blade: 0, income: 0 },
    areas: [true, false, false, false, false, false, false, false, false],
    mower: createDefaultMower(),
    grass: createDefaultGrass(),
    stats: {
      totalEarned: 0,
      totalCut: 0,
      totalDeposits: 0,
      playTime: 0,
    },
  }
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
}
