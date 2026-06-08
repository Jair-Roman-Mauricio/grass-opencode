import { create } from 'zustand'
import type { GameState, InputState, UpgradeId } from '../game/types'
import { createDefaultState } from '../game/gameState'
import { loadGame, saveGame, hasSaveData, deleteSave } from '../game/save'
import { calculateDeposit, getCapacity, getUpgradeCost, isUpgradeMaxed } from '../game/economy'
import { isAreaAdjacent, isAreaOwned, getAreaDef } from '../game/areas'
import { processMovement, isNearBarn } from '../game/physics'
import { AREAS } from '../game/constants'
import { audioManager } from '../audio/AudioManager'

interface GameStore {
  state: GameState
  input: InputState
  isPlaying: boolean
  showShop: boolean
  showExpand: boolean
  message: string | null
  messageTimer: number

  init: () => void
  newGame: () => void
  load: () => void
  save: () => void
  resetGame: () => void

  setInput: (input: Partial<InputState>) => void
  update: (dt: number) => void

  buyUpgrade: (id: UpgradeId) => void
  buyArea: (id: number) => void
  deposit: () => void

  toggleShop: () => void
  toggleExpand: () => void
  showMessage: (msg: string) => void
  setPlaying: (v: boolean) => void

  // Callbacks para eventos del juego
  onAreaPurchased?: (areaId: number) => void
  setOnAreaPurchased: (callback: (areaId: number) => void) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createDefaultState(),
  input: { up: false, down: false, left: false, right: false, interact: false },
  isPlaying: false,
  showShop: false,
  showExpand: false,
  message: null,
  messageTimer: 0,

  init: () => {
    const { state } = get()
    audioManager.init()
    if (hasSaveData()) {
      const loaded = loadGame()
      set({ state: loaded })
    }
  },

  newGame: () => {
    deleteSave()
    set({ state: createDefaultState(), isPlaying: true })
  },

  load: () => {
    const loaded = loadGame()
    set({ state: loaded, isPlaying: true })
  },

  save: () => {
    const { state } = get()
    saveGame(state)
  },

  resetGame: () => {
    deleteSave()
    set({ state: createDefaultState(), isPlaying: false, showShop: false, showExpand: false })
  },

  setInput: (input) => {
    set((s) => ({ input: { ...s.input, ...input } }))
  },

  update: (dt) => {
    const { state, input, isPlaying } = get()
    if (!isPlaying) return

    const result = processMovement(state, input, dt)

    const newState: GameState = {
      ...state,
      mower: result.mower,
      stats: {
        ...state.stats,
        totalCut: state.stats.totalCut + result.grassCut,
        playTime: state.stats.playTime + dt,
      },
    }

    if (result.grassCut > 0) {
      // grass-to-bill chime handled by GameRenderer for accurate load tracking
    }

    if (newState.mower.load >= getCapacity(newState) && isNearBarn(newState)) {
      audioManager.playCash()
    }

    set({ state: newState })
  },

  buyUpgrade: (id) => {
    const { state } = get()
    const cost = getUpgradeCost(state, id)
    if (cost === null || isUpgradeMaxed(state, id)) return
    if (state.money < cost) {
      get().showMessage('No tienes suficiente dinero')
      return
    }

    const newState: GameState = {
      ...state,
      money: state.money - cost,
      upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 },
    }
    audioManager.playClick()
    set({ state: newState })
  },

  buyArea: (id) => {
    const { state } = get()
    const area = getAreaDef(id)
    if (!area) return
    if (isAreaOwned(state, id)) return
    if (!isAreaAdjacent(state, id)) {
      get().showMessage('Debes comprar un area adyacente primero')
      return
    }
    if (state.money < area.cost) {
      get().showMessage('No tienes suficiente dinero')
      return
    }

    const newAreas = [...state.areas]
    newAreas[id] = true
    const newState: GameState = {
      ...state,
      money: state.money - area.cost,
      areas: newAreas,
    }
    audioManager.playClick()
    set({ state: newState })

    // Llamar al callback si existe
    const { onAreaPurchased } = get()
    if (onAreaPurchased) {
      onAreaPurchased(id)
    }
  },

  deposit: () => {
    const { state } = get()
    if (!isNearBarn(state)) {
      get().showMessage('Ve al granero para depositar')
      return
    }
    if (state.mower.load <= 0) {
      get().showMessage('No hay pasto para depositar')
      return
    }

    const earned = calculateDeposit(state)
    const newState: GameState = {
      ...state,
      money: state.money + earned,
      mower: { ...state.mower, load: 0 },
      stats: {
        ...state.stats,
        totalEarned: state.stats.totalEarned + earned,
        totalDeposits: state.stats.totalDeposits + 1,
      },
    }
    audioManager.playCash()
    get().showMessage(`+$${earned}`)
    set({ state: newState })
  },

  toggleShop: () => set((s) => ({ showShop: !s.showShop, showExpand: false })),
  toggleExpand: () => set((s) => ({ showExpand: !s.showExpand, showShop: false })),

  showMessage: (msg) => {
    set({ message: msg, messageTimer: 2000 })
    setTimeout(() => {
      set((s) => (s.message === msg ? { message: null, messageTimer: 0 } : {}))
    }, 2000)
  },

  setPlaying: (v) => set({ isPlaying: v }),

  setOnAreaPurchased: (callback: (areaId: number) => void) => set({ onAreaPurchased: callback }),
}))
