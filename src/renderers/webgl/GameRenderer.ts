import * as THREE from 'three'
import type { GameState, InputState } from '../../game/types'
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
  UPGRADES,
  DEPOSIT_RADIUS,
  BAR_CENTER_X,
  BAR_CENTER_Y,
} from '../../game/constants'
import { getUpgradeValue, getCapacity } from '../../game/economy'
import { audioManager } from '../../audio/AudioManager'
import { useGameStore } from '../../store/gameStore'

const ROWS = 30
const COLS = 30
const MAX_GRASS = 5
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
  private enemyRenderer!: EnemyRenderer
  private effectRenderer!: EffectRenderer

  private ticks = 0
  private grassMap: Record<string, number> = {}
  private lastEPressed = false
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
    this.enemyRenderer = new EnemyRenderer(this.scene)
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

    this.updatePlayer(dt, input)
    this.npcRenderer.update(dt, this.ticks)
    this.enemyRenderer.update(
      dt,
      this.playerRenderer.person.x,
      this.playerRenderer.person.z,
      state.mower.x,
      state.mower.y,
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
    this.grassRenderer.updateSway(this.ticks)
    this.updateCamera()
    this.updateMountHint(input)

    this.renderer.render(this.scene, this.camera)

    this.effectRenderer.renderHitEffects()
    this.effectRenderer.renderScreenShake('game-wrap')

    this.lastEPressed = input.interact
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
    this.grassRenderer.initGrassMap(this.grassMap)
    this.worldBuilder.build(this.grassMap)
    this.mowerRenderer.build()
    this.playerRenderer.build()
    this.npcRenderer.build(BARN_C + 0.7, BARN_R + 1.6)

    const mowerGroup = this.mowerRenderer.group!
    mowerGroup.position.set(state.mower.x, 0, state.mower.y)

    this.enemyRenderer.buildAll(this.grassMap)
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

      const nx = p.x + dx * mv
      const nz = p.z + dz * mv
      p.x = Math.max(0.3, Math.min(ROWS - 0.3, nx))
      p.z = Math.max(0.3, Math.min(COLS - 0.3, nz))

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

      const md = Math.sqrt(
        (p.x - state.mower.x) ** 2 + (p.z - state.mower.y) ** 2
      )
      if (md < 2 && eJust) {
        p.state = 'mount'
        p.mountTimer = 0
        audioManager.playMount()
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

      const nx = state.mower.x + dx * mv
      const nz = state.mower.y + dz * mv

      useGameStore.setState((s) => ({
        state: {
          ...s.state,
          mower: {
            ...s.state.mower,
            x: Math.max(0.3, Math.min(ROWS - 0.3, nx)),
            y: Math.max(0.3, Math.min(COLS - 0.3, nz)),
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
        p.group.position.set(
          state.mower.x,
          0.55 + Math.sin(this.ticks * 0.15) * 0.025,
          state.mower.y
        )
        p.group.rotation.y = mowerGroup?.rotation.y ?? 0
        if (p.parts) {
          p.parts.lArm.group.rotation.x = -0.8 + Math.sin(this.ticks * 0.3) * 0.05
          p.parts.rArm.group.rotation.x = -0.8 - Math.sin(this.ticks * 0.3) * 0.05
          p.parts.lArm.group.rotation.z = 0.15
          p.parts.rArm.group.rotation.z = -0.15
        }
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
        p.group!.scale.set(0.01, 0.01, 0.01)
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

  private mowGrass(r: number, c: number): void {
    const state = this.state
    const bladePower = getUpgradeValue(state, 'blade')
    const cutWidth = getUpgradeValue(state, 'width')
    const capacity = getCapacity(state)
    if (state.mower.load >= capacity) return

    const tw = Math.ceil(cutWidth)
    let anyMowed = false

    for (let dr = -Math.floor(tw / 2); dr <= Math.floor(tw / 2); dr++) {
      for (let dc = -Math.floor(tw / 2); dc <= Math.floor(tw / 2); dc++) {
        if (cutWidth === 2 && !((dr === 0 || dr === -1) && (dc === 0 || dc === -1))) continue
        if (cutWidth > 2 && Math.abs(dr) + Math.abs(dc) > cutWidth) continue

        const tr = r + dr
        const tc = c + dc
        if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) continue

        const key = tr + ',' + tc
        const gh = this.grassMap[key]
        if (gh === undefined || gh <= 0) continue

        const cut = Math.min(gh, bladePower)
        this.grassMap[key] = gh - cut

        const newLoad = Math.min(capacity, state.mower.load + cut)
        useGameStore.setState((s) => ({
          state: {
            ...s.state,
            mower: { ...s.state.mower, load: newLoad },
            stats: {
              ...s.state.stats,
              totalCut: s.state.stats.totalCut + cut,
              playTime: s.state.stats.playTime,
            },
          },
        }))

        this.grassRenderer.updateTile(tr, tc, this.grassMap[key])
        this.worldBuilder.updateGroundTile(tr, tc, this.grassMap[key] > 0)

        for (let i = 0; i < cut; i++) {
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
    const state = this.state
    if (state.mower.load <= 0) return

    const incomeMult = getUpgradeValue(state, 'income')
    const earned = Math.floor(state.mower.load * incomeMult)

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
        mower: { ...s.state.mower, load: 0 },
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
        mower: { ...s.state.mower, load: 0 },
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

    // Generar tiles de pasto para el área comprada
    const areaTiles: Array<{ r: number; c: number; h: number }> = []
    for (let r = area.rowStart; r < area.rowEnd; r++) {
      for (let c = area.colStart; c < area.colEnd; c++) {
        const key = r + ',' + c
        if (!this.grassMap[key] || this.grassMap[key] === 0) {
          const h = Math.min(MAX_GRASS, 2 + ((Math.random() * 4) | 0)) + area.grassBonus
          this.grassMap[key] = h
          this.worldBuilder.updateGroundTile(r, c, true)
          areaTiles.push({ r, c, h })
        }
      }
    }

    if (areaTiles.length === 0) return

    // Calcular centro del área para la cámara
    const centerR = (area.rowStart + area.rowEnd) / 2
    const centerC = (area.colStart + area.colEnd) / 2

    // Iniciar animación de expansión con movimiento de cámara
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
    const state = this.state

    if (p.state === 'walk') {
      const md = Math.sqrt(
        (p.x - state.mower.x) ** 2 + (p.z - state.mower.y) ** 2
      )
      this.mountHint.style.opacity = md < 2.5 ? '1' : '0'
      this.mountHint.innerHTML = 'Presiona <b>E</b> para subirte'
    } else if (p.state === 'ride') {
      this.mountHint.style.opacity = '1'
      this.mountHint.innerHTML = 'Presiona <b>E</b> para bajarte'
    } else {
      this.mountHint.style.opacity = '0'
    }
  }
}
