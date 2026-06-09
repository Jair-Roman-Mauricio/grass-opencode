import type { UpgradeDef, AreaDef, SeedDef, ToolDef } from './types'

export const SAVE_VERSION = 2
export const SAVE_KEY = 'stoneGrassSave'

export const TILE_SIZE = 32
export const GRID_SIZE = 40
export const MAX_GRASS_HEIGHT = 5
export const AUTO_SAVE_INTERVAL = 10000

export const BAR_CENTER_X = 19
export const BAR_CENTER_Y = 19
export const DEPOSIT_RADIUS = 3

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'speed',
    name: 'Velocidad',
    icon: '\u26A1',
    desc: 'Velocidad de la cortadora',
    levels: [
      { cost: 0, value: 1.0 },
      { cost: 50, value: 1.3 },
      { cost: 100, value: 1.6 },
      { cost: 200, value: 2.0 },
      { cost: 350, value: 2.5 },
      { cost: 500, value: 3.0 },
      { cost: 700, value: 3.5 },
      { cost: 1000, value: 4.0 },
      { cost: 1500, value: 4.5 },
      { cost: 2000, value: 5.0 },
    ],
  },
  {
    id: 'capacity',
    name: 'Capacidad',
    icon: '\uD83D\uDCE6',
    desc: 'Capacidad de carga',
    levels: [
      { cost: 0, value: 50 },
      { cost: 50, value: 80 },
      { cost: 100, value: 120 },
      { cost: 200, value: 180 },
      { cost: 350, value: 260 },
      { cost: 500, value: 400 },
      { cost: 750, value: 600 },
      { cost: 1000, value: 900 },
      { cost: 1500, value: 1200 },
      { cost: 2000, value: 1500 },
    ],
  },
  {
    id: 'income',
    name: 'Ingreso',
    icon: '\uD83D\uDCB0',
    desc: 'Multiplicador de ingreso',
    levels: [
      { cost: 0, value: 1.0 },
      { cost: 80, value: 1.2 },
      { cost: 160, value: 1.5 },
      { cost: 300, value: 2.0 },
      { cost: 500, value: 2.5 },
      { cost: 800, value: 3.0 },
      { cost: 1200, value: 3.5 },
      { cost: 1800, value: 4.0 },
    ],
  },
]

export const AREAS: AreaDef[] = [
  { id: 0, name: 'Centro', cost: 0, rowStart: 15, rowEnd: 25, colStart: 15, colEnd: 25, grassBonus: 0 },
  { id: 1, name: 'Norte', cost: 200, rowStart: 0, rowEnd: 15, colStart: 15, colEnd: 25, grassBonus: 1 },
  { id: 2, name: 'Sur', cost: 300, rowStart: 25, rowEnd: 40, colStart: 15, colEnd: 25, grassBonus: 1 },
  { id: 3, name: 'Este', cost: 400, rowStart: 15, rowEnd: 25, colStart: 25, colEnd: 40, grassBonus: 1 },
  { id: 4, name: 'Oeste', cost: 400, rowStart: 15, rowEnd: 25, colStart: 0, colEnd: 15, grassBonus: 1 },
  { id: 5, name: 'Noreste', cost: 1000, rowStart: 0, rowEnd: 15, colStart: 25, colEnd: 40, grassBonus: 2 },
  { id: 6, name: 'Noroeste', cost: 1200, rowStart: 0, rowEnd: 15, colStart: 0, colEnd: 15, grassBonus: 2 },
  { id: 7, name: 'Sureste', cost: 2000, rowStart: 25, rowEnd: 40, colStart: 25, colEnd: 40, grassBonus: 2 },
  { id: 8, name: 'Suroeste', cost: 3000, rowStart: 25, rowEnd: 40, colStart: 0, colEnd: 15, grassBonus: 2 },
]

// --- Semillas (tier 0 = pasto gratis, tier 4 = cannabis) ---
export const SEEDS: SeedDef[] = [
  { id: 'pasto',    name: 'Pasto',    icon: '🌱', tier: 0, unlockCost: 0,    seedCost: 0,   valueMult: 1,  growSeconds: 12, maxHeight: 5 },
  { id: 'trebol',   name: 'Trébol',   icon: '🍀', tier: 1, unlockCost: 150,  seedCost: 10,  valueMult: 2,  growSeconds: 18, maxHeight: 5 },
  { id: 'trigo',    name: 'Trigo',    icon: '🌾', tier: 2, unlockCost: 500,  seedCost: 30,  valueMult: 4,  growSeconds: 25, maxHeight: 5 },
  { id: 'girasol',  name: 'Girasol',  icon: '🌻', tier: 3, unlockCost: 1500, seedCost: 80,  valueMult: 8,  growSeconds: 35, maxHeight: 5 },
  { id: 'cannabis', name: 'Cannabis', icon: '🌿', tier: 4, unlockCost: 5000, seedCost: 250, valueMult: 20, growSeconds: 50, maxHeight: 5 },
]

/** Cuántas semillas de cada tier puede tener el jugador, según el tier desbloqueado. */
export const SEED_CAP_PER_TIER = 5

// --- Herramientas (nivel 0 = tijera gratis, nivel 3 = carrito) ---
export const TOOLS: ToolDef[] = [
  { id: 'tijera',         name: 'Tijera',           icon: '✂️', cost: 0,    cutWidth: 1, bladePower: 1, rideable: false },
  { id: 'tijerasGrandes', name: 'Tijeras grandes',  icon: '✂️', cost: 200,  cutWidth: 2, bladePower: 2, rideable: false },
  { id: 'cortadoraMano',  name: 'Cortadora de mano',icon: '🪚', cost: 800,  cutWidth: 2, bladePower: 3, rideable: false },
  { id: 'carrito',        name: 'Carrito cortadora',icon: '🚜', cost: 2500, cutWidth: 3, bladePower: 5, rideable: true  },
]
