import type { GameState, SaveData } from './types'
import { SAVE_VERSION, SAVE_KEY } from './constants'
import { createDefaultState } from './gameState'

export function saveGame(state: GameState): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      state,
      timestamp: Date.now(),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save game:', e)
  }
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createDefaultState()

    const data: SaveData = JSON.parse(raw)
    if (data.version !== SAVE_VERSION) {
      return migrateSave(data)
    }

    return data.state
  } catch {
    return createDefaultState()
  }
}

export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

function migrateSave(data: SaveData): GameState {
  return createDefaultState()
}
