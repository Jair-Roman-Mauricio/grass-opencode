export type UpgradeId = 'speed' | 'capacity' | 'income'

export interface UpgradeLevel {
  cost: number
  value: number
}

export interface UpgradeDef {
  id: UpgradeId
  name: string
  icon: string
  desc: string
  levels: UpgradeLevel[]
}

// --- Semillas ---
// Orden del array SEEDS = tier (0 = pasto, ..., 4 = cannabis).
export type SeedId = 'pasto' | 'trebol' | 'trigo' | 'girasol' | 'cannabis'

export interface SeedDef {
  id: SeedId
  name: string
  icon: string
  tier: number
  /** Coste (una vez) para desbloquear esta categoría de semilla. */
  unlockCost: number
  /** Coste por cada semilla individual comprada. */
  seedCost: number
  /** Multiplicador de valor al cosechar (dinero por unidad de altura). */
  valueMult: number
  /** Segundos para crecer de 0 a altura máxima. */
  growSeconds: number
  /** Altura máxima (1-5). */
  maxHeight: number
}

// --- Herramientas ---
// Orden del array TOOLS = nivel (0 = tijera, ..., 3 = carrito).
export type ToolId = 'tijera' | 'tijerasGrandes' | 'cortadoraMano' | 'carrito'

export interface ToolDef {
  id: ToolId
  name: string
  icon: string
  cost: number
  cutWidth: number
  bladePower: number
  /** true = se monta (carrito); false = se corta a pie. */
  rideable: boolean
}

/** Parcela plantada: tipo de semilla y crecimiento 0..1. */
export interface PlotData {
  type: SeedId
  growth: number
}

export interface AreaDef {
  id: number
  name: string
  cost: number
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
  grassBonus: number
}

export interface MowerState {
  x: number
  y: number
  /** Unidades de carga (para la barra/capacidad). */
  load: number
  /** Valor monetario acumulado de la carga (ponderado por tipo de semilla). */
  value: number
  mounted: boolean
}

export interface GameStats {
  totalEarned: number
  totalCut: number
  totalDeposits: number
  playTime: number
}

export interface GameState {
  money: number
  upgrades: Record<UpgradeId, number>
  areas: boolean[]
  mower: MowerState
  grass: number[][]
  stats: GameStats
  /**
   * Mapa de césped persistido (30×30, clave "r,c" → altura 0-5).
   * Ausente o undefined = "nueva partida, generar fresco".
   * @deprecated Sustituido por `plots`; se mantiene por compatibilidad de save.
   */
  grassMap?: Record<string, number> | null

  // --- Sistema de cultivo ---
  /** Inventario de semillas compradas sin plantar, por tipo. */
  seeds: Record<SeedId, number>
  /** Tier de semilla más alto desbloqueado (0 = solo pasto). */
  seedTierUnlocked: number
  /** Semilla activa para plantar. */
  selectedSeed: SeedId
  /** Índice de la mejor herramienta poseída (0 = tijera). */
  tool: number
  /**
   * Parcelas plantadas (30×30, clave "r,c" → tipo + crecimiento).
   * Sustituye al césped autogenerado; la parcela arranca vacía.
   */
  plots?: Record<string, PlotData> | null
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  interact: boolean
  /** Segunda acción (tecla F): abrir tienda del vendedor cercano. */
  interact2: boolean
}

export interface SaveData {
  version: number
  state: GameState
  timestamp: number
}

export interface GameRenderer {
  init(canvas: HTMLCanvasElement, state: GameState): void
  render(state: GameState, input: InputState, dt: number): void
  resize(width: number, height: number): void
  destroy(): void
}
