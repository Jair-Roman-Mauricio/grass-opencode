import type { GameState, InputState } from '../game/types'

export interface GameRenderer {
  init(canvas: HTMLCanvasElement, state: GameState): void
  render(state: GameState, input: InputState, dt: number): void
  resize(width: number, height: number): void
  destroy(): void
}
