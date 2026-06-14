import { create } from 'zustand'
import type { GameState, InputState, UpgradeId, SeedId, Debt, FamilyMember, FamilyHealth } from '../game/types'
import { createDefaultState } from '../game/gameState'
import { loadGame, saveGame, hasSaveData, deleteSave } from '../game/save'
import { calculateDeposit, getUpgradeCost, isUpgradeMaxed, getSeedDef, canBuySeed, seedEffectiveCost } from '../game/economy'
import { generateDailyBills, paidCount, isMandatoryMet, rescuePlan, totalPaid } from '../game/bills'
import { getMap, isMapOwned, travelCost, canTravel, canBuyTicket } from '../game/maps'
import { getMapObjectiveBlockReason } from '../game/missions'
import { isNearBarn } from '../game/physics'
import { TOOLS, DAY_LENGTH_MS, MIN_WALLET_RESERVE, INHERITED_DEBT_TOTAL, FAMILY, getDayLength } from '../game/constants'
import { audioManager } from '../audio/AudioManager'

const freshFamily = (): FamilyMember[] => FAMILY.map((name) => ({ name, status: 'bien' as const }))

// Escala de salud: pagar sube (hacia 'bien'), no pagar baja (hacia 'muerte').
const HEALTH: FamilyHealth[] = ['bien', 'mal', 'muymal', 'muerte']
const healthUp = (s: FamilyHealth): FamilyHealth => HEALTH[Math.max(0, HEALTH.indexOf(s) - 1)]
const healthDown = (s: FamilyHealth): FamilyHealth => HEALTH[Math.min(HEALTH.length - 1, HEALTH.indexOf(s) + 1)]
const livingNames = (family: FamilyMember[]): string[] =>
  family.filter((m) => m.status !== 'muerte').map((m) => m.name)

interface GameStore {
  state: GameState
  input: InputState
  isPlaying: boolean
  showSeedShop: boolean
  showToolShop: boolean
  nearSeedShop: boolean
  nearToolShop: boolean
  nearCorral: boolean
  showCorral: boolean
  showSettings: boolean
  showInventory: boolean
  activeSlot: number
  message: string | null
  messageTimer: number
  mobileActionE: string
  mobileActionF: string

  // --- Día / Cobrador / Mapas (runtime, no persistido) ---
  dayClock: number          // ms restantes del día actual
  dayLength: number         // duración total del día en curso (para la barra)
  bills: Debt[] | null      // deudas del día cuando el cobrador está activo
  showBills: boolean        // modal del cobrador abierto
  gameOver: boolean
  nearBusStop: boolean
  showBusStop: boolean
  family: FamilyMember[]    // estado/salud de la familia
  dayStartMoney: number     // dinero al empezar el día (para AHORROS/JORNAL)
  deathNews: string[]       // cola de familiares muertos pendientes de su periódico

  init: () => void
  newGame: () => void
  load: () => void
  save: () => void
  resetGame: () => void

  setInput: (input: Partial<InputState>) => void
  tickClock: (dt: number) => void

  buyUpgrade: (id: UpgradeId) => void
  deposit: () => void

  // Cultivo
  buySeed: (id: SeedId) => void
  unlockSeed: (id: SeedId) => void
  selectSeed: (id: SeedId) => void
  buyTool: (idx: number) => void

  // Cobrador de cuentas
  payDebt: (index: number) => void
  autoPayAbueloDebt: () => void
  resolveDay: () => void
  dismissDeath: () => void
  triggerGameOver: () => void
  depositSavings: () => void   // guardar sobrante dejando MIN_WALLET_RESERVE en mano
  withdrawSavings: () => void  // retirar todo el colchón al dinero

  // Mapas / parada de autobús
  buyTicket: (mapId: number) => void
  travelTo: (mapId: number) => void
  setNearBusStop: (near: boolean) => void
  toggleBusStop: () => void

  toggleSeedShop: () => void
  toggleToolShop: () => void
  setNearCorral: (near: boolean) => void
  toggleCorral: () => void
  toggleSettings: () => void
  setShowSettings: (v: boolean) => void
  toggleInventory: () => void
  setActiveSlot: (slot: number) => void
  setNearShops: (near: { seed: boolean; tool: boolean }) => void
  showMessage: (msg: string) => void
  setPlaying: (v: boolean) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createDefaultState(),
  input: { up: false, down: false, left: false, right: false, interact: false, interact2: false },
  isPlaying: false,
  showSeedShop: false,
  showToolShop: false,
  nearSeedShop: false,
  nearToolShop: false,
  nearCorral: false,
  showCorral: false,
  showSettings: false,
  showInventory: false,
  activeSlot: 0,
  message: null,
  messageTimer: 0,
  mobileActionE: 'Usar',
  mobileActionF: 'Interactuar',

  dayClock: DAY_LENGTH_MS,
  dayLength: DAY_LENGTH_MS,
  bills: null,
  showBills: false,
  gameOver: false,
  nearBusStop: false,
  showBusStop: false,
  family: freshFamily(),
  dayStartMoney: 0,
  deathNews: [],

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
    const state = createDefaultState()
    const len = getDayLength(state.seedTierUnlocked)
    set({
      state, isPlaying: true,
      dayClock: len, dayLength: len, bills: null, showBills: false, gameOver: false,
      family: freshFamily(), dayStartMoney: state.money, deathNews: [],
    })
  },

  load: () => {
    const loaded = loadGame()
    const len = getDayLength(loaded.seedTierUnlocked)
    set({
      state: loaded, isPlaying: true,
      dayClock: len, dayLength: len, bills: null, showBills: false, gameOver: false,
      family: freshFamily(), dayStartMoney: loaded.money, deathNews: [],
    })
  },

  save: () => {
    const { state } = get()
    saveGame(state)
  },

  resetGame: () => {
    deleteSave()
    set({
      state: createDefaultState(), isPlaying: false, showCorral: false, showSettings: false,
      dayClock: DAY_LENGTH_MS, dayLength: DAY_LENGTH_MS, bills: null, showBills: false, gameOver: false,
      nearBusStop: false, showBusStop: false,
      family: freshFamily(), dayStartMoney: 0, deathNews: [],
    })
  },

  setInput: (input) => {
    set((s) => ({ input: { ...s.input, ...input } }))
  },

  // Temporizador de día (llamado por frame desde Game3DScreen). Al agotarse el
  // día, en el mapa 0 aparece el cobrador de cuentas.
  tickClock: (dt) => {
    const s = get()
    if (!s.isPlaying || s.gameOver) return
    // Pausar el reloj mientras hay un modal/cobrador abierto.
    if (s.showBills || s.showBusStop || s.showCorral || s.showSeedShop || s.showToolShop || s.showSettings) return

    const next = s.dayClock - dt * 1000
    if (next > 0) {
      set({ dayClock: next })
      return
    }
    // Fin del día.
    if (s.state.currentMap === 0) {
      const bills = generateDailyBills(s.state.day, livingNames(s.family))
      audioManager.playCinePanel?.()
      set({ dayClock: 0, bills, showBills: true })
    } else {
      // En otros mapas el cobrador no aparece (se paga por teléfono, Parte 2+).
      const nextDay = s.state.day + 1
      const len = getDayLength(s.state.seedTierUnlocked)
      set({ dayClock: len, dayLength: len, state: { ...s.state, day: nextDay } })
    }
  },

  buyUpgrade: (id) => {
    const { state } = get()
    const cost = getUpgradeCost(state, id)
    if (cost === null || isUpgradeMaxed(state, id)) return
    if (state.money < cost) {
      audioManager.playError()
      get().showMessage('No tienes suficiente dinero')
      return
    }

    const newState: GameState = {
      ...state,
      money: state.money - cost,
      upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 },
    }
    audioManager.playPurchase()
    set({ state: newState })
  },

  // --- Cobrador de cuentas ---

  // Marca/desmarca el pago de una cuenta (selector tipo Papers Please).
  autoPayAbueloDebt: () => {
    const s = get()
    if (!s.bills) return
    const idx = s.bills.findIndex((d) => d.member === '')
    if (idx < 0) return
    const debt = s.bills[idx]
    if (debt.paid || s.state.money < debt.amount) return
    const bills = s.bills.map((d, i) => (i === idx ? { ...d, paid: true } : d))
    audioManager.playSell()
    set({ bills, state: { ...s.state, money: s.state.money - debt.amount } })
  },

  payDebt: (index) => {
    const s = get()
    if (!s.bills) return
    const debt = s.bills[index]
    if (!debt) return
    if (debt.member === '') return
    if (debt.paid) {
      // Desmarcar → devolver el dinero.
      audioManager.playClick()
      const bills = s.bills.map((d, i) => (i === index ? { ...d, paid: false } : d))
      set({ bills, state: { ...s.state, money: s.state.money + debt.amount } })
      return
    }
    if (s.state.money < debt.amount) {
      audioManager.playError()
      get().showMessage('No te alcanza para esa cuenta')
      return
    }
    const bills = s.bills.map((d, i) => (i === index ? { ...d, paid: true } : d))
    audioManager.playSell()
    set({ bills, state: { ...s.state, money: s.state.money - debt.amount } })
  },

  resolveDay: () => {
    const s = get()
    if (!s.bills) return
    let bills = s.bills
    let savings = s.state.savings
    // Regla: pagar la DEUDA DEL ABUELO + al menos MIN cuentas. Si no se cumple,
    // los AHORROS (colchón) cubren automáticamente lo que falte; si no alcanzan → game over.
    if (!isMandatoryMet(bills)) {
      const plan = rescuePlan(bills)
      if (savings >= plan.cost) {
        savings -= plan.cost
        bills = plan.bills
        get().showMessage(`Tu colchón cubrió las cuentas: -$${plan.cost}`)
      } else {
        get().triggerGameOver()
        return
      }
    }
    // Salud de la familia: por cada familiar VIVO, si TODAS sus cuentas asignadas
    // están pagadas → sube de salud; si alguna quedó impaga → baja. Muere al llegar a 'muerte'.
    const newlyDead: string[] = []
    const family = s.family.map((m) => {
      if (m.status === 'muerte') return m
      const assigned = bills.filter((d) => d.member === m.name)
      const allPaid = assigned.length > 0 && assigned.every((d) => d.paid)
      const status = allPaid ? healthUp(m.status) : healthDown(m.status)
      if (status === 'muerte') newlyDead.push(m.name)
      return { ...m, status }
    })
    if (s.state.money < MIN_WALLET_RESERVE) {
      get().showMessage(`Sin $${MIN_WALLET_RESERVE} no puedes comprar semillas mañana.`)
      get().triggerGameOver()
      return
    }

    const paidToDebt = totalPaid(bills)
    const inheritedDebtPaid = Math.min(
      INHERITED_DEBT_TOTAL,
      s.state.inheritedDebtPaid + paidToDebt,
    )

    audioManager.playUnlock()
    const nextDay = s.state.day + 1
    const len = getDayLength(s.state.seedTierUnlocked)
    set({
      bills: null, showBills: false,
      dayClock: len, dayLength: len,
      dayStartMoney: s.state.money,
      family,
      deathNews: newlyDead,
      state: { ...s.state, day: nextDay, savings, inheritedDebtPaid },
    })
  },

  // Mueve TODO el dinero al colchón de ahorros (y al revés).
  depositSavings: () => {
    const s = get()
    if (s.state.money <= MIN_WALLET_RESERVE) {
      get().showMessage(`Debes conservar al menos $${MIN_WALLET_RESERVE} para jugar`)
      return
    }
    const toDeposit = s.state.money - MIN_WALLET_RESERVE
    audioManager.playClick()
    set({
      state: {
        ...s.state,
        savings: s.state.savings + toDeposit,
        money: MIN_WALLET_RESERVE,
      },
    })
  },
  withdrawSavings: () => {
    const s = get()
    if (s.state.savings <= 0) return
    audioManager.playClick()
    set({ state: { ...s.state, money: s.state.money + s.state.savings, savings: 0 } })
  },

  // Cierra el periódico de un muerto; al vaciarse la cola, si murieron todos → game over.
  dismissDeath: () => {
    const s = get()
    const rest = s.deathNews.slice(1)
    if (rest.length === 0) {
      if (s.family.every((m) => m.status === 'muerte')) {
        set({ deathNews: [] })
        get().triggerGameOver()
        return
      }
    }
    audioManager.playClick()
    set({ deathNews: rest })
  },

  triggerGameOver: () => {
    audioManager.playCineStinger?.()
    set({ gameOver: true, showBills: false, bills: null, deathNews: [] })
  },

  // --- Mapas / parada de autobús ---

  buyTicket: (mapId) => {
    const s = get()
    const map = getMap(mapId)
    if (!map || isMapOwned(s.state, mapId)) return
    if (map.comingSoon) {
      audioManager.playError()
      get().showMessage('Ese destino aún no está disponible')
      return
    }
    if (!canBuyTicket(s.state, mapId)) {
      audioManager.playError()
      const reason = getMapObjectiveBlockReason(s.state, mapId)
      get().showMessage(reason ?? 'Completa el objetivo principal de este mapa antes de comprar el boleto.')
      return
    }
    if (s.state.money < map.ticketCost) {
      audioManager.playError()
      get().showMessage('No tienes para el boleto')
      return
    }
    const mapsOwned = [...s.state.mapsOwned]
    mapsOwned[mapId] = true
    audioManager.playUnlock()
    // Comprar el boleto te lleva directo a ese mapa (no se cobra tarifa extra).
    set({
      showBusStop: false,
      state: { ...s.state, money: s.state.money - map.ticketCost, mapsOwned, currentMap: mapId },
    })
  },

  travelTo: (mapId) => {
    const s = get()
    if (mapId === s.state.currentMap) return
    if (!canTravel(s.state, mapId)) {
      audioManager.playError()
      get().showMessage('No puedes viajar ahí ahora')
      return
    }
    const cost = travelCost(s.state, mapId)
    audioManager.playPurchase()
    set({
      showBusStop: false,
      state: { ...s.state, money: s.state.money - cost, currentMap: mapId },
    })
  },

  setNearBusStop: (near) => set((s) => (s.nearBusStop === near ? {} : { nearBusStop: near })),
  toggleBusStop: () => {
    const opening = !get().showBusStop
    audioManager[opening ? 'playOpen' : 'playClose']()
    set((s) => ({ showBusStop: !s.showBusStop }))
  },

  deposit: () => {
    const { state } = get()
    if (!isNearBarn(state)) {
      audioManager.playError()
      get().showMessage('Ve al granero para depositar')
      return
    }
    if (state.mower.load <= 0) {
      audioManager.playError()
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
    audioManager.playSell()
    get().showMessage(`+$${earned}`)
    set({ state: newState })
  },

  buySeed: (id) => {
    const { state } = get()
    if (!canBuySeed(state, id)) {
      audioManager.playError()
      get().showMessage('No puedes comprar esa semilla')
      return
    }
    const def = getSeedDef(id)
    const cost = seedEffectiveCost(state, id)
    const usedFree = def.tier === 0 && state.freeStarterSeeds > 0
    const newState: GameState = {
      ...state,
      money: state.money - cost,
      seeds: { ...state.seeds, [id]: state.seeds[id] + 1 },
      freeStarterSeeds: usedFree ? state.freeStarterSeeds - 1 : state.freeStarterSeeds,
      // Autoseleccionar lo que acabas de comprar para plantarlo directo con E.
      selectedSeed: id,
    }
    audioManager.playPurchase()
    set({ state: newState })
  },

  unlockSeed: (id) => {
    const { state } = get()
    const def = getSeedDef(id)
    // Desbloqueo secuencial: solo el tier inmediatamente superior.
    if (def.tier !== state.seedTierUnlocked + 1) return
    if (state.money < def.unlockCost) {
      audioManager.playError()
      get().showMessage('No tienes suficiente dinero')
      return
    }
    const newState: GameState = {
      ...state,
      money: state.money - def.unlockCost,
      seedTierUnlocked: def.tier,
      // Dejar seleccionada la categoría recién desbloqueada.
      selectedSeed: id,
    }
    audioManager.playUnlock()
    set({ state: newState })
  },

  selectSeed: (id) => {
    const { state } = get()
    if (getSeedDef(id).tier > state.seedTierUnlocked) return
    audioManager.playSelect()
    set({ state: { ...state, selectedSeed: id } })
  },

  buyTool: (idx) => {
    const { state } = get()
    const def = TOOLS[idx]
    if (!def) return
    if (idx <= state.tool) return // ya la tienes (o es anterior)
    if (idx !== state.tool + 1) {
      audioManager.playError()
      get().showMessage('Compra la herramienta anterior primero')
      return
    }
    if (state.money < def.cost) {
      audioManager.playError()
      get().showMessage('No tienes suficiente dinero')
      return
    }
    const newState: GameState = {
      ...state,
      money: state.money - def.cost,
      tool: idx,
    }
    audioManager.playPurchase()
    set({ state: newState })
  },

  setNearCorral: (near) => set((s) => (s.nearCorral === near ? {} : { nearCorral: near })),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setShowSettings: (v) => set({ showSettings: v }),
  toggleInventory: () => {
    const opening = !get().showInventory
    audioManager[opening ? 'playOpen' : 'playClose']()
    set((s) => ({ showInventory: !s.showInventory }))
  },
  setActiveSlot: (slot: number) => {
    const s = get()
    // Sincronizar selectedSeed si se selecciona una de las casillas de semillas (1 = pasto, 2 = trebol, 3 = trigo, 4 = girasol, 5 = cannabis)
    const seedIds: SeedId[] = ['pasto', 'trebol', 'trigo', 'girasol', 'cannabis']
    let patchState = { ...s.state }
    if (slot >= 1 && slot <= 5) {
      const selectedSeedId = seedIds[slot - 1]
      // Solo seleccionamos si el tier de esa semilla está desbloqueado
      if (getSeedDef(selectedSeedId).tier <= s.state.seedTierUnlocked) {
        patchState.selectedSeed = selectedSeedId
      }
    }
    set({ activeSlot: slot, state: patchState })
  },
  toggleCorral: () => {
    const opening = !get().showCorral
    audioManager[opening ? 'playOpen' : 'playClose']()
    set((s) => ({ showCorral: !s.showCorral, showSeedShop: false, showToolShop: false }))
  },
  toggleSeedShop: () => {
    const opening = !get().showSeedShop
    audioManager[opening ? 'playOpen' : 'playClose']()
    set((s) => ({ showSeedShop: !s.showSeedShop, showToolShop: false, showCorral: false }))
  },
  toggleToolShop: () => {
    const opening = !get().showToolShop
    audioManager[opening ? 'playOpen' : 'playClose']()
    set((s) => ({ showToolShop: !s.showToolShop, showSeedShop: false, showCorral: false }))
  },
  setNearShops: ({ seed, tool }) => set((s) => {
    if (s.nearSeedShop === seed && s.nearToolShop === tool) return {}
    // Si te alejas del vendedor, cierra su modal.
    const patch: Partial<GameStore> = { nearSeedShop: seed, nearToolShop: tool }
    if (!seed && s.showSeedShop) patch.showSeedShop = false
    if (!tool && s.showToolShop) patch.showToolShop = false
    return patch
  }),

  showMessage: (msg) => {
    set({ message: msg, messageTimer: 2000 })
    setTimeout(() => {
      set((s) => (s.message === msg ? { message: null, messageTimer: 0 } : {}))
    }, 2000)
  },

  setPlaying: (v) => set({ isPlaying: v }),
}))
