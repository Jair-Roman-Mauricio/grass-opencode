import type { GameState, UpgradeId, MowerState } from './types'
import { GRID_SIZE, MAX_GRASS_HEIGHT } from './constants'

export function createDefaultMower(): MowerState {
  return {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
    load: 0,
    value: 0,
    mounted: false,
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
    savings: 0,
    upgrades: { speed: 0, capacity: 0, income: 0 },
    areas: [true, false, false, false, false, false, false, false, false],
    // Progresión por mapas: empiezas en La Parcela (mapa 0), Día 1.
    day: 1,
    currentMap: 0,
    mapsOwned: [true, false],
    inheritedDebtPaid: 0,
    mower: createDefaultMower(),
    grass: createDefaultGrass(),
    stats: {
      totalEarned: 0,
      totalCut: 0,
      totalDeposits: 0,
      playTime: 0,
    },
    // Sistema de cultivo: parcela vacía, solo pasto disponible, tijera.
    seeds: { pasto: 0, trebol: 0, trigo: 0, girasol: 0, cannabis: 0 },
    // Las primeras 5 semillas de pasto son gratis; después cuestan.
    freeStarterSeeds: 5,
    seedTierUnlocked: 0,
    selectedSeed: 'pasto',
    tool: 0,
    plots: {},
  }
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
}
