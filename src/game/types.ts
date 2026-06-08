export type UpgradeId = 'speed' | 'capacity' | 'width' | 'blade' | 'income'

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
  load: number
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
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  interact: boolean
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
