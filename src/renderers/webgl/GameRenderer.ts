import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { GameState, InputState, PlotData } from '../../game/types'
import type { GameRenderer } from '../types'
import { WorldBuilder } from './WorldBuilder'
import { GrassRenderer3D } from './GrassRenderer'
import { MowerRenderer3D } from './MowerRenderer'
import { PlayerRenderer } from './PlayerRenderer'
import { NPCRenderer } from './NPCRenderer'
import { TownBuilder } from './TownBuilder'
import { EffectRenderer } from './EffectRenderer'
import {
  BUYER_X,
  BUYER_Z,
  BUYER_RADIUS,
} from '../../game/constants'
import { getUpgradeValue, getCapacity, getSeedDef, getCutWidth, getCurrentTool, getSpeed } from '../../game/economy'
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
  private townBuilder!: TownBuilder
  private grassRenderer!: GrassRenderer3D
  private mowerRenderer!: MowerRenderer3D
  private playerRenderer!: PlayerRenderer
  private npcRenderer!: NPCRenderer
  private seedNpc!: NPCRenderer
  private toolNpc!: NPCRenderer
  private effectRenderer!: EffectRenderer

  private ambientLight!: THREE.AmbientLight
  private hemiLight!: THREE.HemisphereLight
  private sunLight!: THREE.DirectionalLight

  /** Mapa que se está renderizando (0 = parcela, 1 = pueblo). */
  private map = 0
  private nearLab = false

  private ticks = 0
  private plots: Record<string, PlotData> = {}
  private lastEPressed = false
  private lastFPressed = false
  private controlsHint: HTMLElement | null = null
  private mountHint: HTMLElement | null = null
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

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4)
    this.scene.add(this.ambientLight)

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a7d3a, 0.6)
    this.scene.add(this.hemiLight)

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    this.sunLight.position.set(20, 30, 10)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.set(2048, 2048)
    const sc = this.sunLight.shadow.camera as THREE.OrthographicCamera
    sc.near = 0.5
    sc.far = 80
    sc.left = -40
    sc.right = 40
    sc.top = 40
    sc.bottom = -40
    this.scene.add(this.sunLight)

    this.worldBuilder = new WorldBuilder(this.scene)
    this.townBuilder = new TownBuilder(this.scene)
    this.grassRenderer = new GrassRenderer3D(this.scene)
    this.mowerRenderer = new MowerRenderer3D(this.scene)
    this.playerRenderer = new PlayerRenderer(this.scene)
    this.npcRenderer = new NPCRenderer(this.scene)
    this.seedNpc = new NPCRenderer(this.scene)
    this.toolNpc = new NPCRenderer(this.scene)
    this.effectRenderer = new EffectRenderer(this.scene)

    this.playerRenderer.onStep = () => {
      if (this.playerRenderer.person.moving && this.playerRenderer.person.state === 'walk') {
        audioManager.playStep()
      }
    }

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

    this.updateLighting()

    if (this.map === 1) {
      this.renderTown(dt, input)
      return
    }

    this.effectRenderer.hitFlash = Math.max(0, this.effectRenderer.hitFlash - dt * 2)
    this.effectRenderer.shake = Math.max(0, this.effectRenderer.shake - dt * 3)

    this.updatePlotsGrowth(dt)
    this.updateShopProximity(input)
    this.updatePlayer(dt, input)
    this.playerRenderer.update(dt)
    this.npcRenderer.update(dt, this.ticks)
    this.seedNpc.update(dt, this.ticks + 30)
    this.toolNpc.update(dt, this.ticks + 60)
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

  /** Loop mínimo del Pueblo: solo caminar + proximidad a laboratorio/parada. */
  private renderTown(dt: number, input: InputState): void {
    this.updateTownPlayer(dt, input)
    this.playerRenderer.update(dt)
    this.playerRenderer.updateHeldTool(dt)
    this.updateTownProximity(input)
    this.updateCamera()
    this.renderer!.render(this.scene!, this.camera!)
    this.lastEPressed = input.interact
    this.lastFPressed = input.interact2
  }

  /** Movimiento a pie en el pueblo (sin plantar/montar/depositar). */
  private updateTownPlayer(dt: number, input: InputState): void {
    const p = this.playerRenderer.person
    const mv = getSpeed(this.state) * 4.5 * dt
    let dx = 0, dz = 0
    if (input.left) dx -= 1
    if (input.right) dx += 1
    if (input.up) dz -= 1
    if (input.down) dz += 1
    if (dx !== 0 && dz !== 0) { dx *= Math.SQRT1_2; dz *= Math.SQRT1_2 }

    let nx = Math.max(0.3, Math.min(ROWS - 0.3, p.x + dx * mv))
    let nz = Math.max(0.3, Math.min(COLS - 0.3, p.z + dz * mv))
    const halfR = 0.3
    if (this.blockedAny(nx, nz, halfR)) {
      if (this.blockedAny(nx, p.z, halfR)) nx = p.x
      else if (this.blockedAny(p.x, nz, halfR)) nz = p.z
      else { nx = p.x; nz = p.z }
    }
    p.x = nx; p.z = nz
    if (dx !== 0 || dz !== 0) { p.dir = Math.atan2(dx, dz); p.moving = true }
    else p.moving = false
    if (p.group) p.group.position.set(p.x, 0, p.z)
  }

  /** Proximidad en el pueblo: parada de autobús (F) y laboratorio (hint). */
  private updateTownProximity(input: InputState): void {
    const p = this.playerRenderer.person
    const bus = this.townBuilder.busStopPos
    const lab = this.townBuilder.labPos
    const dBus = Math.hypot(p.x - bus.x, p.z - bus.z)
    const dLab = Math.hypot(p.x - lab.x, p.z - lab.z)
    const nearBus = dBus < SHOP_RADIUS + 0.8
    this.nearLab = dLab < SHOP_RADIUS + 1.2 && !nearBus

    const store = useGameStore.getState()
    store.setNearBusStop(nearBus)

    if (this.mountHint) {
      if (nearBus) {
        this.mountHint.style.opacity = '1'
        this.mountHint.innerHTML = 'Presiona <b>F</b> para tomar el autobús'
      } else if (this.nearLab) {
        this.mountHint.style.opacity = '1'
        this.mountHint.innerHTML = '🔬 Laboratorio — próximamente'
      } else {
        this.mountHint.style.opacity = '0'
      }
    }

    const fJust = input.interact2 && !this.lastFPressed
    if (fJust && nearBus) store.toggleBusStop()
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

    // Parada de autobús (viaje entre mapas).
    const busPos = this.worldBuilder.busStopPos
    const dBus = Math.sqrt((p.x - busPos.x) ** 2 + (p.z - busPos.z) ** 2)
    const nearBus = dBus < SHOP_RADIUS + 0.6 && !nearSeed && !nearTool

    // Corral (mejora de capacidad).
    const corralPos = this.worldBuilder.corralPos
    const dCorral = Math.sqrt((p.x - corralPos.x) ** 2 + (p.z - corralPos.z) ** 2)
    const nearCorral = dCorral < SHOP_RADIUS && !nearSeed && !nearTool && !nearBus

    const store = useGameStore.getState()
    store.setNearShops({ seed: nearSeed, tool: nearTool })
    store.setNearBusStop(nearBus)
    store.setNearCorral(nearCorral)

    const fJust = input.interact2 && !this.lastFPressed
    if (fJust) {
      if (nearSeed) store.toggleSeedShop()
      else if (nearTool) store.toggleToolShop()
      else if (nearBus) store.toggleBusStop()
      else if (nearCorral) store.toggleCorral()
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
    this.grassRenderer.clearAll()
    this.renderer?.dispose()
    this.renderer = null
    this.scene = null
    this.camera = null
    this.canvas = null
  }

  private buildWorld(): void {
    const state = this.state
    this.map = state.currentMap
    if (this.map === 1) {
      this.buildTown()
      return
    }
    this.buildParcela()
  }

  /** Mundo de la parcela (mapa 0). */
  private buildParcela(): void {
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
  }

  /** Mundo de El Pueblo (mapa 1): calles, casas, laboratorio y parada. */
  private buildTown(): void {
    this.townBuilder.build()
    // Solo el jugador a pie; sin césped, cortadora ni vendedores.
    this.plots = {}
    this.playerRenderer.build()
    this.playerRenderer.setActiveTool('tijera', false)
    const spawn = this.townBuilder.playerSpawn
    const person = this.playerRenderer.person
    person.x = spawn.x
    person.z = spawn.z
    person.state = 'walk'
    if (person.group) person.group.position.set(spawn.x, 0, spawn.z)
    // Cámara cerca del jugador para no entrar con un barrido largo.
    this.camera!.position.set(spawn.x + 7, 8, spawn.z + 7)
    this.camera!.lookAt(spawn.x, 0, spawn.z)
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

      // Bloquear contra objetos sólidos (tiendas, granero, parada): eje a eje
      // para permitir "deslizarse" a lo largo de la pared.
      const halfR = 0.3 // radio aproximado del jugador
      if (this.blockedAny(nx, nz, halfR)) {
        const tryX = this.blockedAny(nx, p.z, halfR)
        const tryZ = this.blockedAny(p.x, nz, halfR)
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

      // Vender a pie SOLO al acercarse al comprador (no al edificio).
      const distBuyer = Math.sqrt((p.x - BUYER_X) ** 2 + (p.z - BUYER_Z) ** 2)
      if (distBuyer < BUYER_RADIUS && useGameStore.getState().state.mower.load > 0) {
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

      // Bloquear cortadora contra objetos sólidos (AABB deslizante).
      const halfR = 0.35 // la cortadora es un poco más grande
      if (this.blockedAny(nx, nz, halfR)) {
        const tryX = this.blockedAny(nx, state.mower.y, halfR)
        const tryZ = this.blockedAny(state.mower.x, nz, halfR)
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
        (state.mower.x - BUYER_X) ** 2 + (state.mower.y - BUYER_Z) ** 2
      )
      if (dist < BUYER_RADIUS && state.mower.load > 0) {
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
    audioManager.playPlant()
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
        const value = def.sellValue

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
        audioManager.playCut()
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
    audioManager.playSell()
    this.effectRenderer.showEarnPopup(earned)
  }

  private updateBillStack(): void {
    const state = this.state
    const maxCap = getCapacity(state)
    // El dinero/carga se apila DENTRO del corral (no junto a la cortadora).
    const corral = this.worldBuilder.corralPos
    this.effectRenderer.updateBillStack(
      corral.x,
      corral.z,
      0,
      state.mower.load,
      maxCap
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
    if (store.nearBusStop) {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>F</b> para tomar el autobús'
      return
    }
    if (store.nearCorral) {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>F</b> para ampliar la capacidad'
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

  /** ¿El punto (con radio) choca con algún objeto sólido del mapa actual? */
  private blockedAny(px: number, pz: number, radius: number): boolean {
    const solids = this.map === 1
      ? this.townBuilder.getSolidAABBs()
      : this.worldBuilder.getSolidAABBs()
    for (const aabb of solids) {
      if (this.pointHitsAABB(px, pz, radius, aabb)) return true
    }
    return false
  }

  private updateLighting(): void {
    if (!this.scene) return
    const store = useGameStore.getState()
    const dayClock = store.dayClock
    const dayLength = store.dayLength || 180000
    const f = 1 - Math.max(0, Math.min(1, dayClock / dayLength))

    const skyColor = new THREE.Color()
    const fogColor = new THREE.Color()
    const ambientColor = new THREE.Color()
    let ambientIntensity = 0.4
    const hemiSkyColor = new THREE.Color()
    const hemiGroundColor = new THREE.Color()
    let hemiIntensity = 0.6
    const dirLightColor = new THREE.Color()
    let dirLightIntensity = 1.5
    let dirLightX = 20
    let dirLightY = 30
    let dirLightZ = 10

    // Colores clave para el cielo y niebla
    const daySky = new THREE.Color(0x7ec8e3)
    const dayFog = new THREE.Color(0x7ec8e3)

    const sunsetSky = new THREE.Color(0xd95d39) // naranja-rojizo cálido
    const sunsetFog = new THREE.Color(0x502840) // púrpura profundo

    const nightSky = new THREE.Color(0x070b1a) // azul-negro noche profunda
    const nightFog = new THREE.Color(0x070b1a)

    const sunriseSky = new THREE.Color(0xfca25d)

    // Lógica de interpolación según fases del día (f = 0.0 es 6:00 AM, f = 1.0 es ~2:00 AM)
    if (f < 0.12) {
      // Amanecer: noche -> amanecer -> día
      const t = f / 0.12
      if (t < 0.5) {
        const t2 = t * 2
        skyColor.copy(nightSky).lerp(sunriseSky, t2)
        fogColor.copy(nightFog).lerp(sunriseSky, t2)
        ambientColor.setHex(0x101428).lerp(new THREE.Color(0x3a2a30), t2)
        ambientIntensity = 0.15 + t2 * 0.15
        hemiSkyColor.setHex(0x1a2040).lerp(new THREE.Color(0x995040), t2)
        hemiGroundColor.setHex(0x102010).lerp(new THREE.Color(0x2a3d2a), t2)
        hemiIntensity = 0.15 + t2 * 0.25
        dirLightColor.setHex(0xffaa44)
        dirLightIntensity = t2 * 0.8
      } else {
        const t2 = (t - 0.5) * 2
        skyColor.copy(sunriseSky).lerp(daySky, t2)
        fogColor.copy(sunriseSky).lerp(dayFog, t2)
        ambientColor.setHex(0x3a2a30).lerp(new THREE.Color(0x404060), t2)
        ambientIntensity = 0.3 + t2 * 0.1
        hemiSkyColor.setHex(0x995040).lerp(new THREE.Color(0x87ceeb), t2)
        hemiGroundColor.setHex(0x2a3d2a).lerp(new THREE.Color(0x3a7d3a), t2)
        hemiIntensity = 0.4 + t2 * 0.2
        dirLightColor.copy(new THREE.Color(0xffaa44)).lerp(new THREE.Color(0xffeedd), t2)
        dirLightIntensity = 0.8 + t2 * 0.7
      }
      const angle = t * (Math.PI / 3)
      dirLightX = -30 * Math.cos(angle)
      dirLightY = 30 * Math.sin(angle)
      dirLightZ = 10
    } else if (f < 0.55) {
      // Día pleno constante
      skyColor.copy(daySky)
      fogColor.copy(dayFog)
      ambientColor.setHex(0x404060)
      ambientIntensity = 0.4
      hemiSkyColor.setHex(0x87ceeb)
      hemiGroundColor.setHex(0x3a7d3a)
      hemiIntensity = 0.6
      dirLightColor.setHex(0xffeedd)
      dirLightIntensity = 1.5

      const t = (f - 0.12) / (0.55 - 0.12)
      const angle = (Math.PI / 3) + t * (Math.PI / 3)
      dirLightX = -30 * Math.cos(angle)
      dirLightY = 30 * Math.sin(angle)
      dirLightZ = 10
    } else if (f < 0.70) {
      // Atardecer: día -> sunset -> noche
      const t = (f - 0.55) / (0.70 - 0.55)
      if (t < 0.5) {
        const t2 = t * 2
        skyColor.copy(daySky).lerp(sunsetSky, t2)
        fogColor.copy(dayFog).lerp(sunsetFog, t2)
        ambientColor.setHex(0x404060).lerp(new THREE.Color(0x503550), t2)
        ambientIntensity = 0.4 - t2 * 0.1
        hemiSkyColor.setHex(0x87ceeb).lerp(new THREE.Color(0xc05050), t2)
        hemiGroundColor.setHex(0x3a7d3a).lerp(new THREE.Color(0x2d3a1f), t2)
        hemiIntensity = 0.6 - t2 * 0.3
        dirLightColor.setHex(0xffeedd).lerp(new THREE.Color(0xff4500), t2)
        dirLightIntensity = 1.5 - t2 * 1.0
      } else {
        const t2 = (t - 0.5) * 2
        skyColor.copy(sunsetSky).lerp(nightSky, t2)
        fogColor.copy(sunsetFog).lerp(nightFog, t2)
        ambientColor.setHex(0x503550).lerp(new THREE.Color(0x101428), t2)
        ambientIntensity = 0.3 - t2 * 0.15
        hemiSkyColor.setHex(0xc05050).lerp(new THREE.Color(0x1a2040), t2)
        hemiGroundColor.setHex(0x2d3a1f).lerp(new THREE.Color(0x102010), t2)
        hemiIntensity = 0.3 - t2 * 0.15
        dirLightColor.setHex(0xff4500).lerp(new THREE.Color(0xb0c4de), t2)
        dirLightIntensity = 0.5 - t2 * 0.1
      }
      const angle = (2 * Math.PI / 3) + t * (Math.PI / 3)
      dirLightX = -30 * Math.cos(angle)
      dirLightY = 30 * Math.sin(angle)
      dirLightZ = 10
    } else {
      // Noche (Luz de Luna)
      skyColor.copy(nightSky)
      fogColor.copy(nightFog)
      ambientColor.setHex(0x101428)
      ambientIntensity = 0.15
      hemiSkyColor.setHex(0x1a2040)
      hemiGroundColor.setHex(0x102010)
      hemiIntensity = 0.15
      dirLightColor.setHex(0xb0c4de)
      dirLightIntensity = 0.4

      const t = (f - 0.70) / (1.0 - 0.70)
      const angle = Math.PI + t * (Math.PI * 0.6)
      dirLightX = -35 * Math.cos(angle)
      dirLightY = Math.max(10, 35 * Math.sin(angle))
      dirLightZ = -10
    }

    this.scene.background = skyColor
    if (this.scene.fog) {
      this.scene.fog.color = fogColor
    }

    if (this.ambientLight) {
      this.ambientLight.color.copy(ambientColor)
      this.ambientLight.intensity = ambientIntensity
    }
    if (this.hemiLight) {
      this.hemiLight.color.copy(hemiSkyColor)
      this.hemiLight.groundColor.copy(hemiGroundColor)
      this.hemiLight.intensity = hemiIntensity
    }
    if (this.sunLight) {
      this.sunLight.color.copy(dirLightColor)
      this.sunLight.intensity = dirLightIntensity
      this.sunLight.position.set(dirLightX, dirLightY, dirLightZ)
    }
  }
}
