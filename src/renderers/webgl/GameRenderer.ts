import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { GameState, InputState, PlotData, SeedId } from '../../game/types'
import type { GameRenderer } from '../types'
import { WorldBuilder } from './WorldBuilder'
import { GrassRenderer3D } from './GrassRenderer'
import { MowerRenderer3D } from './MowerRenderer'
import { PlayerRenderer } from './PlayerRenderer'
import { NPCRenderer } from './NPCRenderer'
import { EnemyRenderer } from './EnemyRenderer'
import { EffectRenderer } from './EffectRenderer'
import {
  AREAS,
  DEPOSIT_RADIUS,
  BAR_CENTER_X,
  BAR_CENTER_Y,
} from '../../game/constants'
import { getUpgradeValue, getCapacity, getSeedDef, getCutWidth, getCurrentTool } from '../../game/economy'
import { saveGame } from '../../game/save'
import { audioManager } from '../../audio/AudioManager'
import { useGameStore } from '../../store/gameStore'

const SHOP_RADIUS = 2.4 // distancia para activar el modal de un vendedor

const ROWS = 30
const COLS = 30
const BARN_R = 15
const BARN_C = 15

export class WebGLRenderer implements GameRenderer {
  private canvas: HTMLCanvasElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null

  private worldBuilder!: WorldBuilder
  private grassRenderer!: GrassRenderer3D
  private mowerRenderer!: MowerRenderer3D
  private playerRenderer!: PlayerRenderer
  private npcRenderer!: NPCRenderer
  private seedNpc!: NPCRenderer
  private toolNpc!: NPCRenderer
  private enemyRenderer!: EnemyRenderer
  private effectRenderer!: EffectRenderer

  private ticks = 0
  private plots: Record<string, PlotData> = {}
  private lastEPressed = false
  private lastFPressed = false
  private controlsHint: HTMLElement | null = null
  private mountHint: HTMLElement | null = null
  private invincible = 0
  private lastChimeTime = 0
  private wasLoadFull = false
  private cinematicCamera: {
    active: boolean
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startLookAt: THREE.Vector3
    endLookAt: THREE.Vector3
    progress: number
    duration: number
  } | null = null

  private state: GameState = useGameStore.getState().state

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x7ec8e3)
    this.scene.fog = new THREE.Fog(0x7ec8e3, 45, 75)

    this.camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 100)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // Tone mapping filmico + environment map para que los materiales PBR (modelos
    // GLTF y clearcoat) tengan reflejos suaves y luzcan profesionales.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    const ambient = new THREE.AmbientLight(0x404060, 0.4)
    this.scene.add(ambient)

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d3a, 0.6)
    this.scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xffeedd, 1.5)
    sun.position.set(20, 30, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera as THREE.OrthographicCamera
    sc.near = 0.5
    sc.far = 80
    sc.left = -40
    sc.right = 40
    sc.top = 40
    sc.bottom = -40
    this.scene.add(sun)

    this.worldBuilder = new WorldBuilder(this.scene)
    this.grassRenderer = new GrassRenderer3D(this.scene)
    this.mowerRenderer = new MowerRenderer3D(this.scene)
    this.playerRenderer = new PlayerRenderer(this.scene)
    this.npcRenderer = new NPCRenderer(this.scene)
    this.seedNpc = new NPCRenderer(this.scene)
    this.toolNpc = new NPCRenderer(this.scene)
    this.enemyRenderer = new EnemyRenderer(
      this.scene,
      () => this.worldBuilder.getBarnAABB()
    )
    this.effectRenderer = new EffectRenderer(this.scene)

    this.playerRenderer.onStep = () => {
      if (this.playerRenderer.person.moving && this.playerRenderer.person.state === 'walk') {
        audioManager.playStep()
      }
    }

    // Suscribirse al callback de compra de áreas
    useGameStore.getState().setOnAreaPurchased((areaId: number) => {
      this.handleAreaPurchased(areaId)
    })

    this.buildWorld()
    this.camera!.position.set(24, 8, 24)
    this.camera!.lookAt(17, 0, 17)

    this.controlsHint = document.getElementById('controls-hint')
    this.mountHint = document.getElementById('mount-hint')
    this.effectRenderer.init('popup-container')
  }

  render(state: GameState, input: InputState, dt: number): void {
    if (!this.scene || !this.camera || !this.renderer) return
    this.state = state

    this.ticks++

    this.invincible = Math.max(0, this.invincible - dt)
    this.effectRenderer.hitFlash = Math.max(0, this.effectRenderer.hitFlash - dt * 2)
    this.effectRenderer.shake = Math.max(0, this.effectRenderer.shake - dt * 3)

    this.updatePlotsGrowth(dt)
    this.updateShopProximity(input)
    this.updatePlayer(dt, input)
    this.playerRenderer.update(dt)
    this.npcRenderer.update(dt, this.ticks)
    this.seedNpc.update(dt, this.ticks + 30)
    this.toolNpc.update(dt, this.ticks + 60)
    // Solo el carrito cuenta como objetivo cuando vas montado; a pie el objetivo
    // es el jugador (el carrito oculto no debe recibir golpes fantasma).
    const riding = this.playerRenderer.person.state === 'ride'
    this.enemyRenderer.update(
      dt,
      this.playerRenderer.person.x,
      this.playerRenderer.person.z,
      riding ? state.mower.x : -999,
      riding ? state.mower.y : -999,
      (lost) => this.onEnemyHit(lost)
    )
    this.effectRenderer.updateFlyingBills(
      state.mower.x,
      state.mower.y,
      state.mower.mounted ? 0 : 0
    )
    this.effectRenderer.updateScatterBills(dt)
    this.effectRenderer.updateDepositingBills()
    this.updateBillStack()
    this.grassRenderer.updateAnimation()
    this.grassRenderer.tick(dt)
    this.updateCamera()
    this.updateMountHint(input)

    // El carrito solo es visible cuando se ha comprado (herramienta rideable).
    const curTool = getCurrentTool(state)
    if (this.mowerRenderer.group) {
      this.mowerRenderer.group.visible = curTool.rideable
    }
    // Herramienta de mano: refleja la herramienta actual y anima el corte.
    this.playerRenderer.setActiveTool(curTool.id, curTool.rideable)
    this.playerRenderer.updateHeldTool(dt)

    this.renderer.render(this.scene, this.camera)

    this.effectRenderer.renderHitEffects()
    this.effectRenderer.renderScreenShake('game-wrap')

    this.lastEPressed = input.interact
    this.lastFPressed = input.interact2
  }

  /** Avanza el crecimiento de las parcelas plantadas y reescala su render. */
  private updatePlotsGrowth(dt: number): void {
    let changed = false
    for (const key of Object.keys(this.plots)) {
      const plot = this.plots[key]
      if (plot.growth >= 1) continue
      const def = getSeedDef(plot.type)
      const prevH = Math.round(plot.growth * def.maxHeight)
      plot.growth = Math.min(1, plot.growth + dt / def.growSeconds)
      const newH = Math.round(plot.growth * def.maxHeight)
      const [r, c] = key.split(',').map(Number)
      this.grassRenderer.setTileGrowth(r, c, plot.growth)
      if (newH !== prevH) changed = true
    }
    if (changed) this.persistPlots()
  }

  /** Detecta cercanía a los vendedores y abre su modal al pulsar F. */
  private updateShopProximity(input: InputState): void {
    const p = this.playerRenderer.person
    const seedPos = this.worldBuilder.seedVendorPos
    const toolPos = this.worldBuilder.toolVendorPos
    const dSeed = Math.sqrt((p.x - seedPos.x) ** 2 + (p.z - seedPos.z) ** 2)
    const dTool = Math.sqrt((p.x - toolPos.x) ** 2 + (p.z - toolPos.z) ** 2)
    const nearSeed = dSeed < SHOP_RADIUS
    const nearTool = dTool < SHOP_RADIUS && !nearSeed

    const store = useGameStore.getState()
    store.setNearShops({ seed: nearSeed, tool: nearTool })

    const fJust = input.interact2 && !this.lastFPressed
    if (fJust) {
      if (nearSeed) store.toggleSeedShop()
      else if (nearTool) store.toggleToolShop()
    }
  }

  resize(width: number, height: number): void {
    if (this.camera) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
    if (this.renderer) {
      this.renderer.setSize(width, height)
    }
  }

  destroy(): void {
    this.effectRenderer.clearAll()
    this.enemyRenderer.clearAll()
    this.grassRenderer.clearAll()
    this.renderer?.dispose()
    this.renderer = null
    this.scene = null
    this.camera = null
    this.canvas = null
  }

  private buildWorld(): void {
    const state = this.state

    // Hidratar parcelas plantadas desde el estado persistido (parcela vacía si no hay).
    this.plots = {}
    if (state.plots) {
      for (const k of Object.keys(state.plots)) {
        this.plots[k] = { ...state.plots[k] }
      }
    }

    this.grassRenderer.init()
    this.grassRenderer.hydrate(this.plots)
    this.worldBuilder.build()
    // Pintar de verde el suelo de los tiles plantados.
    for (const k of Object.keys(this.plots)) {
      const [r, c] = k.split(',').map(Number)
      this.worldBuilder.updateGroundTile(r, c, true)
    }

    this.mowerRenderer.build()
    // El carrito solo es visible/usable cuando se ha comprado.
    if (this.mowerRenderer.group) {
      this.mowerRenderer.group.visible = getCurrentTool(state).rideable
    }
    this.playerRenderer.build()
    const startTool = getCurrentTool(state)
    this.playerRenderer.setActiveTool(startTool.id, startTool.rideable)
    this.npcRenderer.build(BARN_C + 0.7, BARN_R + 2.2)
    // Vendedores de semillas y herramientas en sus puestos.
    this.seedNpc.build(this.worldBuilder.seedVendorPos.x, this.worldBuilder.seedVendorPos.z)
    this.toolNpc.build(this.worldBuilder.toolVendorPos.x, this.worldBuilder.toolVendorPos.z)

    const mowerGroup = this.mowerRenderer.group!
    mowerGroup.position.set(state.mower.x, 0, state.mower.y)

    this.enemyRenderer.buildAll({})
  }

  private persistTimer = 0

  private persistPlots(): void {
    const now = Date.now()
    if (now - this.persistTimer < 1000) return
    this.persistTimer = now

    const snap: Record<string, PlotData> = {}
    for (const k of Object.keys(this.plots)) {
      snap[k] = { ...this.plots[k] }
    }

    useGameStore.setState((s) => {
      const updated = { ...s.state, plots: snap }
      saveGame(updated)
      return { state: updated }
    })
  }

  private updatePlayer(dt: number, input: InputState): void {
    const state = this.state
    const p = this.playerRenderer.person
    const speed = getUpgradeValue(state, 'speed')
    const mv = speed * 4.5 * dt

    const ePressed = input.interact
    const eJust = ePressed && !this.lastEPressed

    if (p.state === 'walk') {
      let dx = 0
      let dz = 0
      if (input.left) dx = -1
      if (input.right) dx = 1
      if (input.up) dz = -1
      if (input.down) dz = 1

      if (dx !== 0 && dz !== 0) {
        dx *= Math.SQRT1_2
        dz *= Math.SQRT1_2
      }

      let nx = p.x + dx * mv
      let nz = p.z + dz * mv
      nx = Math.max(0.3, Math.min(ROWS - 0.3, nx))
      nz = Math.max(0.3, Math.min(COLS - 0.3, nz))

      // Bloquear contra la tienda (AABB eje a eje para permitir "deslizarse").
      const aabb = this.worldBuilder.getBarnAABB()
      const halfR = 0.3 // radio aproximado del jugador
      if (this.pointHitsAABB(nx, nz, halfR, aabb)) {
        const tryX = this.pointHitsAABB(nx, p.z, halfR, aabb)
        const tryZ = this.pointHitsAABB(p.x, nz, halfR, aabb)
        if (tryX) {
          nx = p.x
        } else if (tryZ) {
          nz = p.z
        } else {
          nx = p.x
          nz = p.z
        }
      }
      p.x = nx
      p.z = nz

      if (dx !== 0 || dz !== 0) {
        p.dir = Math.atan2(dx, dz)
        p.moving = true
      } else {
        p.moving = false
      }

      if (p.group) {
        p.group.position.set(p.x, 0, p.z)
        p.group.rotation.y = p.dir
      }
      this.playerRenderer.animateWalk(dt, speed)

      // Cortar a pie con la herramienta actual mientras se camina.
      if (p.moving) {
        this.mowGrass(Math.floor(p.z), Math.floor(p.x))
      }

      // Depositar a pie al acercarse al granero.
      const distBarn = Math.sqrt((p.z - BARN_R) ** 2 + (p.x - BARN_C) ** 2)
      if (distBarn < DEPOSIT_RADIUS && useGameStore.getState().state.mower.load > 0) {
        this.deposit()
      }

      const md = Math.sqrt(
        (p.x - state.mower.x) ** 2 + (p.z - state.mower.y) ** 2
      )
      const rideable = getCurrentTool(state).rideable
      if (eJust) {
        if (rideable && md < 2) {
          // Subir al carrito.
          p.state = 'mount'
          p.mountTimer = 0
          audioManager.playMount()
        } else {
          // Si no, intentar plantar la semilla seleccionada en este tile.
          this.tryPlant(Math.floor(p.z), Math.floor(p.x))
        }
      }
    } else if (p.state === 'ride') {
      let dx = 0
      let dz = 0
      if (input.left) dx = -1
      if (input.right) dx = 1
      if (input.up) dz = -1
      if (input.down) dz = 1

      if (dx !== 0 && dz !== 0) {
        dx *= Math.SQRT1_2
        dz *= Math.SQRT1_2
      }

      let nx = state.mower.x + dx * mv
      let nz = state.mower.y + dz * mv
      nx = Math.max(0.3, Math.min(ROWS - 0.3, nx))
      nz = Math.max(0.3, Math.min(COLS - 0.3, nz))

      // Bloquear cortadora contra la tienda (AABB deslizante).
      const aabb = this.worldBuilder.getBarnAABB()
      const halfR = 0.35 // la cortadora es un poco más grande
      if (this.pointHitsAABB(nx, nz, halfR, aabb)) {
        const tryX = this.pointHitsAABB(nx, state.mower.y, halfR, aabb)
        const tryZ = this.pointHitsAABB(state.mower.x, nz, halfR, aabb)
        if (tryX) {
          nx = state.mower.x
        } else if (tryZ) {
          nz = state.mower.y
        } else {
          nx = state.mower.x
          nz = state.mower.y
        }
      }

      useGameStore.setState((s) => ({
        state: {
          ...s.state,
          mower: {
            ...s.state.mower,
            x: nx,
            y: nz,
            mounted: true,
          },
        },
      }))

      const mowerGroup = this.mowerRenderer.group
      if (mowerGroup) {
        const newState = useGameStore.getState().state
        mowerGroup.position.set(newState.mower.x, 0, newState.mower.y)
        if (dx !== 0 || dz !== 0) {
          const dir = Math.atan2(dx, dz)
          mowerGroup.rotation.y = dir
          mowerGroup.position.y = Math.sin(this.ticks * 0.15) * 0.025
          this.mowGrass(Math.floor(newState.mower.y), Math.floor(newState.mower.x))
        }
      }

      if (p.group) {
        const sa = this.mowerRenderer.seatAnchor
        const dir = mowerGroup?.rotation.y ?? 0
        const bob = mowerGroup?.position.y ?? 0
        // Colocar al jugador SOBRE el asiento (offset local de asiento rotado por dir)
        p.group.position.set(
          state.mower.x + Math.sin(dir) * sa.z,
          sa.y + bob,
          state.mower.y + Math.cos(dir) * sa.z
        )
        p.group.rotation.y = dir
        // Pose de sentado (piernas adelante, brazos al volante)
        this.playerRenderer.setSeated(true)
      }

      this.mowGrass(
        Math.floor(state.mower.y),
        Math.floor(state.mower.x)
      )

      const dist = Math.sqrt(
        (state.mower.y - BARN_R) ** 2 + (state.mower.x - BARN_C) ** 2
      )
      if (dist < DEPOSIT_RADIUS && state.mower.load > 0) {
        this.deposit()
      }

      if (eJust) {
        p.state = 'dismount'
        p.mountTimer = 0
        p.group!.visible = true
        p.group!.scale.set(1, 1, 1)
        this.playerRenderer.setSeated(false)
      }
    }

    if (p.state === 'mount' || p.state === 'dismount') {
      this.playerRenderer.updateMountDismount(
        dt,
        state.mower.x,
        0,
        state.mower.y,
        this.mowerRenderer.group?.rotation.y ?? 0,
        (x, z) => {
          p.x = x
          p.z = z
        }
      )
    }
  }

  /** Planta la semilla seleccionada en el tile (r,c) si está vacío y hay inventario. */
  private tryPlant(r: number, c: number): void {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return
    const key = r + ',' + c
    if (this.plots[key]) return // ya hay algo plantado

    const store = useGameStore.getState()
    const state = store.state
    const seed = state.selectedSeed
    if ((state.seeds[seed] ?? 0) <= 0) {
      store.showMessage('No tienes semillas de ese tipo')
      return
    }

    this.plots[key] = { type: seed, growth: 0 }
    this.grassRenderer.addTile(r, c, seed, 0)
    this.worldBuilder.updateGroundTile(r, c, true)
    this.persistPlots()

    useGameStore.setState((s) => ({
      state: { ...s.state, seeds: { ...s.state.seeds, [seed]: s.state.seeds[seed] - 1 } },
    }))
    audioManager.playClick()
  }

  private mowGrass(r: number, c: number): void {
    const state = this.state
    const cutWidth = getCutWidth(state)
    const capacity = getCapacity(state)
    let load = useGameStore.getState().state.mower.load
    if (load >= capacity) return

    const tw = Math.ceil(cutWidth)
    let anyMowed = false

    for (let dr = -Math.floor(tw / 2); dr <= Math.floor(tw / 2); dr++) {
      for (let dc = -Math.floor(tw / 2); dc <= Math.floor(tw / 2); dc++) {
        if (cutWidth === 2 && !((dr === 0 || dr === -1) && (dc === 0 || dc === -1))) continue
        if (cutWidth > 2 && Math.abs(dr) + Math.abs(dc) > cutWidth) continue

        const tr = r + dr
        const tc = c + dc
        if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) continue
        if (load >= capacity) break

        const key = tr + ',' + tc
        const plot = this.plots[key]
        if (!plot) continue
        const def = getSeedDef(plot.type)
        // Solo se cosecha cuando la planta está madura (crecida del todo).
        if (plot.growth < 1) continue

        const cut = def.maxHeight
        const value = cut * def.valueMult

        delete this.plots[key]
        this.grassRenderer.removeTile(tr, tc)
        this.worldBuilder.updateGroundTile(tr, tc, false)
        this.persistPlots()

        load = Math.min(capacity, load + cut)
        useGameStore.setState((s) => ({
          state: {
            ...s.state,
            mower: {
              ...s.state.mower,
              load: Math.min(capacity, s.state.mower.load + cut),
              value: s.state.mower.value + value,
            },
            stats: {
              ...s.state.stats,
              totalCut: s.state.stats.totalCut + cut,
              playTime: s.state.stats.playTime,
            },
          },
        }))

        for (let i = 0; i < Math.min(cut, 5); i++) {
          this.effectRenderer.spawnFlyingBill(
            tc + 0.5 + (Math.random() - 0.5) * 0.3,
            tr + 0.5 + (Math.random() - 0.5) * 0.3,
            () => {}
          )
        }
        anyMowed = true
      }
    }

    if (anyMowed) {
      // Animación de corte de la herramienta de mano (solo a pie).
      if (this.playerRenderer.person.state === 'walk') {
        this.playerRenderer.triggerCut()
      }

      const now = performance.now()
      if (now - this.lastChimeTime > 80) {
        this.lastChimeTime = now
        audioManager.playLoadChime()
      }

      const afterState = useGameStore.getState().state
      if (afterState.mower.load >= capacity && !this.wasLoadFull) {
        this.wasLoadFull = true
        audioManager.playLoadFullChime()
      } else if (afterState.mower.load < capacity) {
        this.wasLoadFull = false
      }
    }
  }

  private deposit(): void {
    const state = useGameStore.getState().state
    if (state.mower.load <= 0) return

    const incomeMult = getUpgradeValue(state, 'income')
    const earned = Math.floor(state.mower.value * incomeMult)

    const barnPos = this.worldBuilder.barnGroup?.position
    if (barnPos) {
      this.effectRenderer.startDepositArc(
        barnPos.x,
        barnPos.z,
        state.mower.x,
        state.mower.y
      )
    }

    useGameStore.setState((s) => ({
      state: {
        ...s.state,
        money: s.state.money + earned,
        mower: { ...s.state.mower, load: 0, value: 0 },
        stats: {
          ...s.state.stats,
          totalEarned: s.state.stats.totalEarned + earned,
          totalDeposits: s.state.stats.totalDeposits + 1,
        },
      },
    }))

    this.npcRenderer.dance = 2.5
    audioManager.playCash()
    this.effectRenderer.showEarnPopup(earned)
  }

  private onEnemyHit(_lost: number): void {
    if (this.invincible > 0) return

    const state = this.state
    const lost = state.mower.load

    this.effectRenderer.scatterBills(state.mower.x, state.mower.y)

    useGameStore.setState((s) => ({
      state: {
        ...s.state,
        mower: { ...s.state.mower, load: 0, value: 0 },
      },
    }))

    this.effectRenderer.hitFlash = 1
    this.effectRenderer.shake = 1
    this.invincible = 2
    audioManager.playHit()

    if (lost > 0) {
      this.effectRenderer.showEarnPopup(-Math.max(1, Math.floor(lost * 0.5)))
    }
  }

  private updateBillStack(): void {
    const state = this.state
    const maxCap = getCapacity(state)
    this.effectRenderer.updateBillStack(
      state.mower.x,
      state.mower.y,
      this.mowerRenderer.group?.rotation.y ?? 0,
      state.mower.load,
      maxCap
    )
  }

  private handleAreaPurchased(areaId: number): void {
    const area = AREAS.find(a => a.id === areaId)
    if (!area) return

    // Regalo al comprar un área: pasto ya maduro listo para cosechar.
    const areaTiles: Array<{ r: number; c: number; type: SeedId; growth: number }> = []
    for (let r = area.rowStart; r < Math.min(area.rowEnd, ROWS); r++) {
      for (let c = area.colStart; c < Math.min(area.colEnd, COLS); c++) {
        if (r < 0 || c < 0) continue
        const key = r + ',' + c
        if (!this.plots[key]) {
          const plot: PlotData = { type: 'pasto', growth: 1 }
          this.plots[key] = plot
          this.worldBuilder.updateGroundTile(r, c, true)
          areaTiles.push({ r, c, type: 'pasto', growth: 1 })
        }
      }
    }

    if (areaTiles.length === 0) return

    this.persistPlots()

    const centerR = (area.rowStart + area.rowEnd) / 2
    const centerC = (area.colStart + area.colEnd) / 2

    this.grassRenderer.animateAreaExpansion(
      areaTiles,
      { x: centerC, z: centerR },
      (target) => {
        this.startCinematicCameraMove(target, 2.5)
      }
    )
  }

  startCinematicCameraMove(target: { x: number; z: number }, duration: number = 2.0): void {
    if (!this.camera) return

    const currentPos = this.camera.position.clone()
    const currentLookAt = new THREE.Vector3(
      this.camera.position.x - 7,
      0,
      this.camera.position.z - 7
    )

    const endPos = new THREE.Vector3(target.x + 7, 7, target.z + 7)
    const endLookAt = new THREE.Vector3(target.x, 0, target.z)

    this.cinematicCamera = {
      active: true,
      startPos: currentPos,
      endPos,
      startLookAt: currentLookAt,
      endLookAt,
      progress: 0,
      duration,
    }
  }

  private updateCamera(): void {
    // Si hay un movimiento cinemático activo, usarlo
    if (this.cinematicCamera?.active) {
      this.cinematicCamera.progress += 1 / (this.cinematicCamera.duration * 60) // Asumiendo 60 FPS

      if (this.cinematicCamera.progress >= 1) {
        this.cinematicCamera.active = false
        this.cinematicCamera = null
      } else {
        // Easing suave (ease-in-out)
        const t = this.cinematicCamera.progress
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

        if (this.camera) {
          this.camera.position.lerpVectors(
            this.cinematicCamera.startPos,
            this.cinematicCamera.endPos,
            eased
          )

          const lookAt = new THREE.Vector3().lerpVectors(
            this.cinematicCamera.startLookAt,
            this.cinematicCamera.endLookAt,
            eased
          )
          this.camera.lookAt(lookAt)
        }
        return
      }
    }

    // Comportamiento normal de la cámara
    const p = this.playerRenderer.person
    const isWalk = p.state === 'walk' || p.state === 'mount'
    const tx = isWalk ? p.x : this.state.mower.x
    const tz = isWalk ? p.z : this.state.mower.y

    if (this.camera) {
      this.camera.position.x += (tx + 7 - this.camera.position.x) * 0.04
      this.camera.position.z += (tz + 7 - this.camera.position.z) * 0.04
      this.camera.position.y += (7 - this.camera.position.y) * 0.04
      this.camera.lookAt(tx, 0, tz)
    }
  }

  private updateMountHint(_input: InputState): void {
    if (!this.mountHint) return
    const p = this.playerRenderer.person
    const store = useGameStore.getState()
    const state = store.state

    if (p.state !== 'walk') {
      this.mountHint.style.opacity = '0'
      return
    }

    // 1) Vendedor cercano → F para comprar
    if (store.nearSeedShop) {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>F</b> para comprar semillas'
      return
    }
    if (store.nearToolShop) {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>F</b> para comprar herramientas'
      return
    }

    // 2) Cerca del carrito (si lo tienes) → E para subir
    const md = Math.sqrt((p.x - state.mower.x) ** 2 + (p.z - state.mower.y) ** 2)
    if (getCurrentTool(state).rideable && md < 2.5) {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>E</b> para subirte'
      return
    }

    // 3) Tile vacío con semilla disponible → E para plantar
    const key = Math.floor(p.z) + ',' + Math.floor(p.x)
    if (!this.plots[key] && (state.seeds[state.selectedSeed] ?? 0) > 0) {
      this.mountHint.style.opacity = '1'
      const name = getSeedDef(state.selectedSeed).name
      this.mountHint.innerHTML = `Presiona <b>E</b> para plantar ${name}`
      return
    }

    this.mountHint.style.opacity = '0'
  }

  /**
   * Comprueba si un punto (con radio) intersecta un AABB 2D (ejes X y Z).
   * Se usa para阻挡 jugador/cortadora contra la tienda.
   */
  private pointHitsAABB(
    px: number,
    pz: number,
    radius: number,
    aabb: { minX: number; maxX: number; minZ: number; maxZ: number }
  ): boolean {
    const closestX = Math.max(aabb.minX, Math.min(px, aabb.maxX))
    const closestZ = Math.max(aabb.minZ, Math.min(pz, aabb.maxZ))
    const dx = px - closestX
    const dz = pz - closestZ
    return dx * dx + dz * dz < radius * radius
  }
}
