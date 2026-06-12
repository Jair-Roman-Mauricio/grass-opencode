import * as THREE from 'three'
import type { ToolId } from '../../game/types'
import { assetLoader } from './AssetLoader'

const CHAR_TARGET_HEIGHT = 0.95
const CHAR_YAW_OFFSET = Math.PI

export type PreviewHeldItem =
  | { kind: 'tool'; toolId: ToolId }
  | { kind: 'seed'; icon: string }
  | { kind: 'none' }

/** Mini escena Three.js para el panel de inventario (personaje en idle + objeto equipado). */
export class CharacterPreview {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private character: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null
  private idleAction: THREE.AnimationAction | null = null
  private heldItemGroup: THREE.Group | null = null
  private rArm: THREE.Group | null = null
  private frameId = 0
  private disposed = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)

    this.scene = new THREE.Scene()

    const amb = new THREE.AmbientLight(0xffffff, 0.55)
    this.scene.add(amb)
    const key = new THREE.DirectionalLight(0xfff0dd, 1.1)
    key.position.set(2, 4, 3)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35)
    fill.position.set(-2, 2, -1)
    this.scene.add(fill)

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20)
    this.camera.position.set(0, 1.05, 2.35)
    this.camera.lookAt(0, 0.75, 0)

    // Suelo suave para anclar sombras visuales
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.01
    floor.receiveShadow = true
    this.scene.add(floor)

    this.buildCharacter()
    this.resize(canvas.clientWidth, canvas.clientHeight)
    this.startLoop()
  }

  private buildCharacter(): void {
    const model = assetLoader.cloneScene('character')
    if (model) {
      this.buildFromModel(model)
      return
    }
    this.buildProcedural()
  }

  private buildFromModel(model: THREE.Group): void {
    const g = new THREE.Group()
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
        mesh.frustumCulled = false
      }
    })
    g.add(model)
    this.scene.add(g)
    this.character = g

    const clips = assetLoader.get('character')?.animations ?? []
    this.mixer = new THREE.AnimationMixer(model)
    const idle = THREE.AnimationClip.findByName(clips, 'Idle')
    if (idle) {
      this.idleAction = this.mixer.clipAction(idle)
      this.idleAction.play()
    }

    this.heldItemGroup = new THREE.Group()
    this.heldItemGroup.position.set(0.22, 0.72, 0.18)
    g.add(this.heldItemGroup)
  }

  private buildProcedural(): void {
    const g = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xe6a878, roughness: 0.7 })
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.7 })
    const pants = new THREE.MeshStandardMaterial({ color: 0x34506b, roughness: 0.75 })
    const boots = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd2a24c, roughness: 0.8 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.6 })
    const metal = new THREE.MeshStandardMaterial({ color: 0xc0c6cf, roughness: 0.35, metalness: 0.7 })
    const handleRed = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })

    const box = (w: number, h: number, d: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      mesh.castShadow = true
      return mesh
    }

    const body = box(0.30, 0.32, 0.17, shirt)
    body.position.y = 0.5
    g.add(body)

    const head = box(0.24, 0.24, 0.24, skin)
    head.position.y = 0.80
    g.add(head)

    const brim = box(0.40, 0.035, 0.40, hatMat)
    brim.position.y = 0.925
    g.add(brim)
    const crown = box(0.24, 0.13, 0.24, hatMat)
    crown.position.y = 1.0
    g.add(crown)

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
      return grp
    }
    const lArm = makeArm(-1)
    this.rArm = makeArm(1)

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
      return grp
    }
    makeLeg(-1)
    makeLeg(1)

    // Tijera básica en mano derecha (se oculta al cambiar objeto)
    const scissors = new THREE.Group()
    const screw = box(0.03, 0.03, 0.03, metal)
    scissors.add(screw)
    const bladeG = new THREE.Group()
    const blade = box(0.018, 0.012, 0.16, metal)
    blade.position.set(0.012, 0, 0.085)
    bladeG.add(blade)
    const handle = box(0.05, 0.018, 0.06, handleRed)
    handle.position.set(0.03, 0, -0.07)
    bladeG.add(handle)
    scissors.add(bladeG)
    scissors.position.set(0, -0.31, 0.04)
    scissors.rotation.x = 0.35
    this.rArm.add(scissors)
    scissors.name = 'preview-tool-tijera'

    void lArm
    this.scene.add(g)
    this.character = g

    this.heldItemGroup = new THREE.Group()
    this.heldItemGroup.position.set(0, -0.31, 0.06)
    this.rArm.add(this.heldItemGroup)

    // Pose idle: brazo ligeramente al frente
    if (this.rArm) {
      this.rArm.rotation.x = -0.25
      this.rArm.rotation.z = -0.08
    }
  }

  setHeldItem(item: PreviewHeldItem): void {
    if (!this.heldItemGroup) return
    while (this.heldItemGroup.children.length > 0) {
      this.heldItemGroup.remove(this.heldItemGroup.children[0])
    }

    const toolNode = this.character?.getObjectByName('preview-tool-tijera')
    if (toolNode) toolNode.visible = item.kind === 'tool' && item.toolId === 'tijera'

    if (item.kind === 'none') return

    if (item.kind === 'tool') {
      this.attachToolMesh(item.toolId)
      return
    }

    // Semilla: bolsa / paquete en la mano
    const seedBag = new THREE.Group()
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.85 }),
    )
    seedBag.add(paper)
    const sprout = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.6 }),
    )
    sprout.position.set(0, 0.06, 0.04)
    seedBag.add(sprout)
    seedBag.rotation.x = -0.4
    seedBag.rotation.z = 0.15
    this.heldItemGroup.add(seedBag)
  }

  private attachToolMesh(toolId: ToolId): void {
    if (!this.heldItemGroup) return
    const metal = new THREE.MeshStandardMaterial({ color: 0xc0c6cf, roughness: 0.35, metalness: 0.7 })
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d5a2b, roughness: 0.8 })
    const handleBlue = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 })
    const box = (w: number, h: number, d: number, m: THREE.Material) =>
      new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)

    const g = new THREE.Group()

    if (toolId === 'tijera') {
      // Ya visible vía preview-tool-tijera
      return
    }
    if (toolId === 'tijerasGrandes') {
      const blade = box(0.03, 0.02, 0.28, metal)
      blade.position.z = 0.14
      g.add(blade)
      const h1 = box(0.08, 0.03, 0.1, handleBlue)
      h1.position.set(-0.05, 0, -0.06)
      g.add(h1)
      const h2 = box(0.08, 0.03, 0.1, handleBlue)
      h2.position.set(0.05, 0, -0.06)
      g.add(h2)
    } else if (toolId === 'cortadoraMano') {
      const grip = box(0.05, 0.09, 0.12, wood)
      g.add(grip)
      const blade = box(0.012, 0.06, 0.26, metal)
      blade.position.set(0, 0, 0.17)
      g.add(blade)
    } else if (toolId === 'carrito') {
      const body = box(0.22, 0.12, 0.18, metal)
      body.position.y = -0.05
      g.add(body)
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), metal)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(-0.1, -0.12, 0)
      g.add(wheel)
      const wheel2 = wheel.clone()
      wheel2.position.set(0.1, -0.12, 0)
      g.add(wheel2)
    }

    g.rotation.x = 0.35
    this.heldItemGroup.add(g)
  }

  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return
      this.frameId = requestAnimationFrame(tick)
      const dt = 1 / 60
      this.mixer?.update(dt)
      if (this.character) {
        this.character.rotation.y = Math.sin(Date.now() * 0.0004) * 0.12
      }
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.renderer.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry?.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      }
    })
  }
}
