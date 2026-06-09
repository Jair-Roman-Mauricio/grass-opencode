import * as THREE from 'three'
import type { ToolId } from '../../game/types'
import { assetLoader } from './AssetLoader'

export interface PersonParts {
  lArm: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  rArm: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  lLeg: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  rLeg: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  body: THREE.Mesh
}

export interface PersonState {
  x: number
  z: number
  dir: number
  moving: boolean
  group: THREE.Group | null
  parts: PersonParts | null
  walkPhase: number
  state: 'walk' | 'mount' | 'ride' | 'dismount'
  mountTimer: number
  mountDuration: number
}

// --- Ajustes del modelo GLTF (fáciles de afinar visualmente) ---
const CHAR_TARGET_HEIGHT = 0.95 // altura del personaje en unidades del mundo
const CHAR_YAW_OFFSET = Math.PI // orientación: gira el modelo para que "frente" = +Z
// Nombres de clips del character.glb (RobotExpressive)
const CLIP_WALK = 'Walking'
const CLIP_IDLE = 'Idle'
const CLIP_SIT = 'Sitting'

export class PlayerRenderer {
  person: PersonState
  private scene: THREE.Scene
  private lastStepPhase = 0
  onStep?: () => void

  // GLTF / animación
  mixer: THREE.AnimationMixer | null = null
  private usingModel = false
  private actions: Record<string, THREE.AnimationAction> = {}
  private currentClip = ''
  private stepTimer = 0
  private bodyBaseY = 0.5 // altura base del torso (lo usa el bobbing al caminar)

  // --- Herramientas de mano (corte a pie) ---
  private currentToolId: ToolId = 'tijera'
  private toolRideable = false
  private toolTime = 0
  private cutPulse = 0
  private toolTijera: THREE.Group | null = null
  private toolTijerasGrandes: THREE.Group | null = null
  private toolSerrucho: THREE.Group | null = null
  private bladesSmall: THREE.Group[] = []
  private bladesBig: THREE.Group[] = []
  private sawBlade: THREE.Group | null = null
  private sawBaseZ = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.person = {
      x: 17,
      z: 17,
      dir: 0,
      moving: false,
      group: null,
      parts: null,
      walkPhase: 0,
      state: 'walk',
      mountTimer: 0,
      mountDuration: 0.6,
    }
  }

  get hasModel(): boolean {
    return this.usingModel
  }

  build(): THREE.Group {
    const model = assetLoader.cloneScene('character')
    if (model) {
      return this.buildFromModel(model)
    }
    return this.buildProcedural()
  }

  private buildFromModel(model: THREE.Group): THREE.Group {
    const g = new THREE.Group()

    // Normalizar escala y centrar pies en y=0
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    const scale = CHAR_TARGET_HEIGHT / (size.y || 1)
    model.scale.setScalar(scale)
    model.position.y = -box.min.y * scale
    model.rotation.y = CHAR_YAW_OFFSET

    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        // Los SkinnedMesh calculan su bounding sphere en bind-pose; tras escalar y
        // animar, three puede descartarlos por frustum culling y desaparecen.
        mesh.frustumCulled = false
      }
    })

    g.add(model)
    g.position.set(this.person.x, 0, this.person.z)
    this.scene.add(g)

    // Animaciones
    const clips = assetLoader.get('character')?.animations ?? []
    this.mixer = new THREE.AnimationMixer(model)
    for (const name of [CLIP_IDLE, CLIP_WALK, CLIP_SIT]) {
      const clip = THREE.AnimationClip.findByName(clips, name)
      if (clip) this.actions[name] = this.mixer.clipAction(clip)
    }
    this.usingModel = true
    this.person.group = g
    this.person.parts = null
    this.setAnim(CLIP_IDLE, 0)
    return g
  }

  /** Cambia de clip con crossfade suave. */
  private setAnim(name: string, fade = 0.25): void {
    if (!this.usingModel || this.currentClip === name) return
    const next = this.actions[name]
    if (!next) return
    const prev = this.actions[this.currentClip]
    next.reset().setEffectiveWeight(1).fadeIn(fade).play()
    if (prev) prev.fadeOut(fade)
    this.currentClip = name
  }

  /** Llamado cada frame: actualiza el mixer y elige el clip según el estado. */
  update(dt: number): void {
    if (!this.usingModel) return
    this.mixer?.update(dt)

    const p = this.person
    let desired = CLIP_IDLE
    if (p.state === 'ride' || p.state === 'mount') desired = CLIP_SIT
    else if (p.state === 'dismount') desired = CLIP_WALK
    else desired = p.moving ? CLIP_WALK : CLIP_IDLE
    this.setAnim(desired)

    // Pasos (sonido) mientras camina
    if (desired === CLIP_WALK) {
      this.stepTimer += dt
      if (this.stepTimer >= 0.34) {
        this.stepTimer = 0
        this.onStep?.()
      }
    } else {
      this.stepTimer = 0.34
    }
  }

  // ---------- Fallback procedural (cuando no hay GLTF) ----------

  private buildProcedural(): THREE.Group {
    // Personaje estilo VOXEL (cubos), a juego con la vaca/enemigo.
    const g = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xe6a878, roughness: 0.7 })
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.7 })
    const pants = new THREE.MeshStandardMaterial({ color: 0x34506b, roughness: 0.75 })
    const boots = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd2a24c, roughness: 0.8 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.6 })

    const box = (w: number, h: number, d: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    // Torso — el bobbing al caminar mueve body.position.y alrededor de bodyBaseY
    const body = box(0.30, 0.32, 0.17, shirt)
    body.position.y = this.bodyBaseY
    g.add(body)
    // Cinturón
    const belt = box(0.31, 0.05, 0.18, dark)
    belt.position.y = this.bodyBaseY - 0.135
    g.add(belt)

    // Cabeza (cubo)
    const head = box(0.24, 0.24, 0.24, skin)
    head.position.y = 0.80
    g.add(head)
    // Ojos
    for (const ex of [-0.055, 0.055]) {
      const e = box(0.035, 0.05, 0.02, dark)
      e.position.set(ex, 0.82, 0.125)
      g.add(e)
    }
    // Sombrero de paja voxel (ala + copa + cinta)
    const brim = box(0.40, 0.035, 0.40, hatMat)
    brim.position.y = 0.925
    g.add(brim)
    const crown = box(0.24, 0.13, 0.24, hatMat)
    crown.position.y = 1.0
    g.add(crown)
    const band = box(0.25, 0.04, 0.25, dark)
    band.position.y = 0.95
    g.add(band)

    // Brazos: pivote en el hombro, cuelgan hacia abajo
    const SHOULDER_Y = 0.63
    const makeArm = (side: number) => {
      const grp = new THREE.Group()
      const sleeve = box(0.10, 0.16, 0.11, shirt)
      sleeve.position.y = -0.08
      grp.add(sleeve)
      const forearm = box(0.095, 0.14, 0.105, skin)
      forearm.position.y = -0.23
      grp.add(forearm)
      grp.position.set(side * 0.205, SHOULDER_Y, 0)
      g.add(grp)
      return { group: grp, upper: sleeve, lower: forearm }
    }
    const lArm = makeArm(-1)
    const rArm = makeArm(1)

    // Piernas: pivote en la cadera
    const HIP_Y = 0.36
    const makeLeg = (side: number) => {
      const grp = new THREE.Group()
      const thigh = box(0.12, 0.18, 0.14, pants)
      thigh.position.y = -0.09
      grp.add(thigh)
      const shin = box(0.115, 0.16, 0.135, pants)
      shin.position.y = -0.25
      grp.add(shin)
      const boot = box(0.13, 0.07, 0.18, boots)
      boot.position.set(0, -0.345, 0.02)
      grp.add(boot)
      grp.position.set(side * 0.085, HIP_Y, 0)
      g.add(grp)
      return { group: grp, upper: thigh, lower: shin }
    }
    const lLeg = makeLeg(-1)
    const rLeg = makeLeg(1)

    // Herramientas de mano ancladas a los brazos
    this.buildHeldTools(lArm.group, rArm.group)

    g.position.set(this.person.x, 0, this.person.z)
    this.scene.add(g)

    this.person.group = g
    this.person.parts = { lArm, rArm, lLeg, rLeg, body }
    return g
  }

  /** Construye las 3 herramientas de mano (voxel) y las ancla a las manos. */
  private buildHeldTools(lArmG: THREE.Group, rArmG: THREE.Group): void {
    const metal = new THREE.MeshStandardMaterial({ color: 0xc0c6cf, roughness: 0.35, metalness: 0.7 })
    const handleRed = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })
    const handleBlue = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 })
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d5a2b, roughness: 0.8 })
    const box = (w: number, h: number, d: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.castShadow = true
      return mesh
    }
    // Posición de la mano en el espacio del grupo de brazo (final del antebrazo).
    const HAND_Y = -0.31

    // --- Tijera (genérica) ---
    // Devuelve { group, blades:[bladeL,bladeR] } orientada hacia +Z (hojas) y -Z (asas).
    const makeScissors = (s: number, handleMat: THREE.Material) => {
      const group = new THREE.Group()
      // Tornillo central
      const screw = box(0.03 * s, 0.03 * s, 0.03 * s, metal)
      group.add(screw)
      const blades: THREE.Group[] = []
      for (const side of [-1, 1]) {
        const bg = new THREE.Group() // pivota en el tornillo (eje Y → abre/cierra)
        const blade = box(0.018 * s, 0.012 * s, 0.16 * s, metal)
        blade.position.set(side * 0.012 * s, 0, 0.085 * s)
        bg.add(blade)
        // Asa hacia atrás
        const handle = box(0.05 * s, 0.018 * s, 0.06 * s, handleMat)
        handle.position.set(side * 0.03 * s, 0, -0.07 * s)
        bg.add(handle)
        const handleBar = box(0.012 * s, 0.012 * s, 0.06 * s, handleMat)
        handleBar.position.set(side * 0.012 * s, 0, -0.035 * s)
        bg.add(handleBar)
        group.add(bg)
        blades.push(bg)
      }
      return { group, blades }
    }

    // Tijera pequeña → mano derecha
    {
      const { group, blades } = makeScissors(1.0, handleRed)
      group.position.set(0, HAND_Y, 0.04)
      group.rotation.x = 0.35
      rArmG.add(group)
      this.toolTijera = group
      this.bladesSmall = blades
    }
    // Tijeras grandes → mano derecha (la izquierda se posa sobre el asa al cortar)
    {
      const { group, blades } = makeScissors(1.7, handleBlue)
      group.position.set(0, HAND_Y, 0.05)
      group.rotation.x = 0.35
      rArmG.add(group)
      this.toolTijerasGrandes = group
      this.bladesBig = blades
    }
    // Serrucho → mano derecha
    {
      const group = new THREE.Group()
      const grip = box(0.05, 0.09, 0.12, wood)
      grip.position.set(0, 0, -0.02)
      group.add(grip)
      // Hoja con dientes (subgrupo que se desliza en vaivén)
      const sawBlade = new THREE.Group()
      const blade = box(0.012, 0.06, 0.26, metal)
      blade.position.set(0, 0, 0.17)
      sawBlade.add(blade)
      for (let i = 0; i < 7; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 3), metal)
        tooth.rotation.x = Math.PI
        tooth.position.set(0, -0.05, 0.07 + i * 0.035)
        sawBlade.add(tooth)
      }
      group.add(sawBlade)
      group.position.set(0, HAND_Y, 0.04)
      group.rotation.x = 0.4
      rArmG.add(group)
      this.toolSerrucho = group
      this.sawBlade = sawBlade
      this.sawBaseZ = sawBlade.position.z
    }

    // Visibilidad inicial: solo la tijera básica.
    void lArmG
    this.setActiveTool('tijera', false)
  }

  /** Selecciona la herramienta visible en la mano (oculta el resto). */
  setActiveTool(id: ToolId, rideable: boolean): void {
    this.currentToolId = id
    this.toolRideable = rideable
    const onFoot = this.person.state === 'walk' && !rideable
    if (this.toolTijera) this.toolTijera.visible = onFoot && id === 'tijera'
    if (this.toolTijerasGrandes) this.toolTijerasGrandes.visible = onFoot && id === 'tijerasGrandes'
    if (this.toolSerrucho) this.toolSerrucho.visible = onFoot && id === 'cortadoraMano'
  }

  /** Dispara la animación de corte (decae sola). */
  triggerCut(duration = 0.35): void {
    this.cutPulse = duration
  }

  /** Anima la herramienta de mano (abrir/cerrar tijeras, serruchado) cada frame. */
  updateHeldTool(dt: number): void {
    this.toolTime += dt
    if (this.cutPulse > 0) this.cutPulse = Math.max(0, this.cutPulse - dt)
    const cutting = this.cutPulse > 0
    const t = this.toolTime

    // Apertura/cierre de tijeras (hojas opuestas; reposo ligeramente abiertas).
    const open = cutting ? Math.abs(Math.sin(t * 16)) * 0.5 : 0.14
    if (this.bladesSmall[0]) this.bladesSmall[0].rotation.y = open
    if (this.bladesSmall[1]) this.bladesSmall[1].rotation.y = -open
    if (this.bladesBig[0]) this.bladesBig[0].rotation.y = open
    if (this.bladesBig[1]) this.bladesBig[1].rotation.y = -open

    // Serruchado (vaivén de la hoja).
    if (this.sawBlade) {
      this.sawBlade.position.z = this.sawBaseZ + (cutting ? Math.sin(t * 18) * 0.06 : 0)
    }

    // Pose de brazos al cortar.
    const parts = this.person.parts
    const onFoot = parts && this.person.state === 'walk' && !this.toolRideable
    if (!onFoot || !parts) return
    if (this.currentToolId === 'tijerasGrandes') {
      // Sujetar con las dos manos.
      parts.rArm.group.rotation.x = -1.05
      parts.rArm.group.rotation.z = -0.12
      parts.lArm.group.rotation.x = -1.05
      parts.lArm.group.rotation.z = 0.34
    } else if (cutting) {
      // Una mano: levantar el brazo derecho hacia el cultivo.
      parts.rArm.group.rotation.x = -1.0 + Math.sin(t * 16) * 0.12
    }
  }

  /** Pose de sentado (conduciendo): muslos hacia adelante, brazos al volante. */
  setSeated(on: boolean): void {
    const pa = this.person.parts
    if (!pa) return
    if (on) {
      pa.lLeg.group.rotation.x = 1.45
      pa.rLeg.group.rotation.x = 1.45
      pa.lLeg.group.rotation.z = 0.12
      pa.rLeg.group.rotation.z = -0.12
      pa.lArm.group.rotation.x = -1.1
      pa.rArm.group.rotation.x = -1.1
      pa.lArm.group.rotation.z = 0.18
      pa.rArm.group.rotation.z = -0.18
      pa.body.position.y = this.bodyBaseY
    } else {
      pa.lLeg.group.rotation.set(0, 0, 0)
      pa.rLeg.group.rotation.set(0, 0, 0)
      pa.lArm.group.rotation.set(0, 0, 0)
      pa.rArm.group.rotation.set(0, 0, 0)
    }
  }

  animateWalk(dt: number, speed: number): void {
    const p = this.person
    const pa = p.parts
    if (!pa) return // modelo GLTF: la animación la maneja update()

    if (p.moving) {
      p.walkPhase += dt * 8 * Math.max(1, speed * 0.8)
      const w = Math.sin(p.walkPhase)
      const w2 = Math.sin(p.walkPhase + Math.PI)
      pa.lLeg.group.rotation.x = w * 0.5
      pa.rLeg.group.rotation.x = w2 * 0.5
      pa.lArm.group.rotation.x = w2 * 0.4
      pa.rArm.group.rotation.x = w * 0.4
      pa.lArm.group.rotation.z = 0
      pa.rArm.group.rotation.z = 0
      pa.lLeg.group.rotation.z = 0
      pa.rLeg.group.rotation.z = 0
      pa.body.position.y = this.bodyBaseY + Math.abs(w) * 0.03

      const phaseNorm = p.walkPhase % (Math.PI * 2)
      const prevNorm = this.lastStepPhase % (Math.PI * 2)
      if ((prevNorm < Math.PI && phaseNorm >= Math.PI) || (prevNorm < 0 && phaseNorm >= 0)) {
        this.onStep?.()
      }
      this.lastStepPhase = phaseNorm
    } else {
      pa.lLeg.group.rotation.x *= 0.9
      pa.rLeg.group.rotation.x *= 0.9
      pa.lArm.group.rotation.x *= 0.9
      pa.rArm.group.rotation.x *= 0.9
      pa.body.position.y += (this.bodyBaseY - pa.body.position.y) * 0.1
    }
  }

  updateMountDismount(dt: number, mowerX: number, mowerY: number, mowerZ: number, mowerDir: number, onDismountPlaced?: (x: number, z: number) => void): void {
    if (this.usingModel) {
      this.updateMountDismountModel(dt, mowerX, mowerZ, mowerDir, onDismountPlaced)
      return
    }
    this.updateMountDismountProcedural(dt, mowerX, mowerY, mowerZ, mowerDir, onDismountPlaced)
  }

  /** Montar/desmontar para el modelo GLTF: solo transiciones de posición/rotación
   *  (la pose la dan los clips vía update()). */
  private updateMountDismountModel(dt: number, mowerX: number, mowerZ: number, mowerDir: number, onDismountPlaced?: (x: number, z: number) => void): void {
    const p = this.person
    p.mountTimer += dt
    const t = Math.min(1, p.mountTimer / p.mountDuration)
    const ease = 1 - Math.pow(1 - t, 3)
    const g = p.group
    if (!g) return
    g.visible = true

    if (p.state === 'mount') {
      // Acercarse y subir al asiento
      g.position.x += (mowerX - g.position.x) * 0.18
      g.position.z += (mowerZ - g.position.z) * 0.18
      g.position.y = Math.sin(ease * Math.PI) * 0.25 // pequeño hop
      g.rotation.y = mowerDir
      p.dir = mowerDir
      if (t >= 1) {
        p.state = 'ride'
        g.position.set(mowerX, 0, mowerZ)
        p.mountTimer = 0
      }
    } else if (p.state === 'dismount') {
      const isFirstFrame = p.mountTimer <= dt + 0.001
      if (isFirstFrame) {
        p.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 0.9
        p.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 0.9
        onDismountPlaced?.(p.x, p.z)
      }
      const tx = p.x
      const tz = p.z
      g.position.x += (tx - g.position.x) * 0.15
      g.position.z += (tz - g.position.z) * 0.15
      g.position.y = Math.sin(ease * Math.PI) * 0.2
      p.dir = mowerDir + Math.PI / 2
      g.rotation.y += (p.dir - g.rotation.y) * 0.15
      if (t >= 1) {
        p.state = 'walk'
        g.position.set(tx, 0, tz)
        p.x = tx
        p.z = tz
        p.mountTimer = 0
      }
    }
  }

  private updateMountDismountProcedural(dt: number, mowerX: number, _mowerY: number, mowerZ: number, mowerDir: number, onDismountPlaced?: (x: number, z: number) => void): void {
    const p = this.person
    const a = p
    a.mountTimer += dt
    const t = Math.min(1, a.mountTimer / a.mountDuration)

    if (p.state === 'mount') {
      const g = p.group
      if (!g) return
      g.visible = true

      if (t < 0.4) {
        const targetX = mowerX + Math.sin(mowerDir) * 0.3
        const targetZ = mowerZ + Math.cos(mowerDir) * 0.3
        g.position.x += (targetX - g.position.x) * 0.12
        g.position.z += (targetZ - g.position.z) * 0.12
        g.rotation.y = mowerDir
        p.dir = mowerDir
        p.moving = true
        this.animateWalk(dt, 1)
      } else if (t < 0.8) {
        p.moving = false
        g.scale.set(1, 1, 1)
        g.position.x = mowerX
        g.position.z = mowerZ
        const hopT = (t - 0.4) / 0.4
        g.position.y = Math.sin(hopT * Math.PI) * 0.3
        g.rotation.y = mowerDir
        p.dir = mowerDir
      } else {
        p.moving = false
        g.scale.set(1, 1, 1)
        g.position.x = mowerX
        g.position.z = mowerZ
        const sitT = (t - 0.8) / 0.2
        g.position.y = (1 - sitT) * 0.3
        g.rotation.y = mowerDir
        p.dir = mowerDir
        if (p.parts) {
          p.parts.lArm.group.rotation.x = -sitT
          p.parts.rArm.group.rotation.x = -sitT
          p.parts.lArm.group.rotation.z = sitT * 0.25
          p.parts.rArm.group.rotation.z = -sitT * 0.25
        }
      }
      if (t >= 1) {
        p.state = 'ride'
        g.scale.set(1, 1, 1)
        g.position.y = 0
        a.mountTimer = 0
      }
    } else if (p.state === 'dismount') {
      const g = p.group
      if (!g) return
      g.visible = true

      const isFirstFrame = a.mountTimer <= dt + 0.001
      if (isFirstFrame) {
        p.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 0.8
        p.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 0.8
        onDismountPlaced?.(p.x, p.z)
      }

      if (t < 0.3) {
        const pt = t / 0.3
        g.scale.set(1, 1, 1)
        g.position.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 0.5 * pt
        g.position.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 0.5 * pt
        g.position.y = (1 - pt) * 0.2
        g.rotation.y = mowerDir + Math.PI
        p.dir = mowerDir + Math.PI
        if (p.parts) {
          p.parts.lArm.group.rotation.x = (1 - pt) * -0.8
          p.parts.rArm.group.rotation.x = (1 - pt) * -0.8
          p.parts.lArm.group.rotation.z = (1 - pt) * 0.25
          p.parts.rArm.group.rotation.z = (1 - pt) * -0.25
        }
      } else if (t < 0.7) {
        g.scale.set(1, 1, 1)
        g.position.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 0.8
        g.position.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 0.8
        const hopT = (t - 0.3) / 0.4
        g.position.y = Math.sin(hopT * Math.PI) * 0.25
        g.rotation.y = mowerDir + Math.PI
        p.dir = mowerDir + Math.PI
      } else {
        p.moving = true
        g.position.x += (p.x - g.position.x) * 0.1
        g.position.z += (p.z - g.position.z) * 0.1
        g.rotation.y += (p.dir - g.rotation.y) * 0.1
        g.position.y *= 0.9
        this.animateWalk(dt, 1)
      }
      if (t >= 1) {
        p.state = 'walk'
        g.scale.set(1, 1, 1)
        g.position.y = 0
        p.x = g.position.x
        p.z = g.position.z
        a.mountTimer = 0
      }
    }
  }
}
