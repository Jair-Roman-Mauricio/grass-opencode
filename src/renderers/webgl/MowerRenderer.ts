import * as THREE from 'three'
import { assetLoader } from './AssetLoader'

// Tamaño objetivo (largo en Z) de la cortadora si se usa un GLB
const MOWER_TARGET_LENGTH = 0.9

export class MowerRenderer3D {
  group: THREE.Group | null = null
  // Origen (pies) del jugador sentado: y baja para que las caderas caigan en el asiento;
  // z desplaza al jugador sobre el asiento (offset local rotado por dir en GameRenderer).
  seatAnchor: THREE.Vector3 = new THREE.Vector3(0, 0.08, 0.12)
  steeringWheelPos: THREE.Vector3 = new THREE.Vector3(0, 0.38, -0.05)
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  build(): THREE.Group {
    const model = assetLoader.cloneScene('mower')
    if (model) return this.buildFromModel(model)
    return this.buildProcedural()
  }

  private buildFromModel(model: THREE.Group): THREE.Group {
    const g = new THREE.Group()
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    const scale = MOWER_TARGET_LENGTH / (size.z || 1)
    model.scale.setScalar(scale)
    model.position.y = -box.min.y * scale
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.frustumCulled = false
      }
    })
    g.add(model)
    this.scene.add(g)
    this.group = g
    return g
  }

  private buildProcedural(): THREE.Group {
    const g = new THREE.Group()
    const m = (c: number, r = 0.4, me = 0.2) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me })
    // Estilo VOXEL: material mate plano y cajas sin redondear.
    const glossy = (c: number, r = 0.6) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 })
    const rb = (w: number, h: number, d: number, mat: THREE.Material, sh = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      mesh.castShadow = sh
      mesh.receiveShadow = true
      return mesh
    }

    // Main body (bright red, rounded, glossy)
    const body = rb(0.5, 0.2, 0.7, glossy(0xe53935, 0.3))
    body.position.y = 0.25
    body.castShadow = true
    g.add(body)

    // Hood / front cap (darker red, stepped)
    const hood = rb(0.35, 0.12, 0.25, glossy(0xc62828, 0.3))
    hood.position.set(0, 0.36, -0.18)
    g.add(hood)

    // Grille detail
    const grille = rb(0.18, 0.06, 0.02, m(0x444444, 0.5, 0.4))
    grille.position.set(0, 0.32, -0.305)
    g.add(grille)

    // Windshield
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x90caf9,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.45,
      })
    )
    glass.position.set(0, 0.38, -0.305)
    g.add(glass)

    // Cutting deck (underside)
    const deck = rb(0.6, 0.04, 0.35, m(0x555555, 0.7, 0.3))
    deck.position.set(0, 0.07, 0.15)
    g.add(deck)

    // Cutting plate (voxel)
    const disc = rb(0.3, 0.02, 0.3, m(0x888888, 0.5, 0.6))
    disc.position.set(0, 0.05, 0.15)
    g.add(disc)

    // Seat (cojín + respaldo, color oscuro tipo asiento de tractor)
    const seatMat = m(0x2a2a2e, 0.55, 0.1)
    const seatBase = rb(0.2, 0.07, 0.2, seatMat)
    seatBase.position.set(0, 0.36, 0.14)
    g.add(seatBase)
    const seatBack = rb(0.2, 0.18, 0.06, seatMat)
    seatBack.position.set(0, 0.46, 0.23)
    seatBack.rotation.x = -0.12
    g.add(seatBack)

    // Columna + volante (voxel)
    const colMat = m(0x333333, 0.5, 0.2)
    const col = rb(0.04, 0.16, 0.04, colMat)
    col.position.set(0, 0.3, -0.05)
    col.rotation.x = 0.2
    g.add(col)
    const wheel = rb(0.16, 0.05, 0.04, m(0x1a1a1a, 0.5, 0.2))
    wheel.position.copy(this.steeringWheelPos)
    wheel.rotation.x = 0.4
    g.add(wheel)

    // Ruedas (cubos aplastados, estilo voxel)
    const tireMat = m(0x1a1a1a, 0.85, 0)
    const hubMat = m(0x999999, 0.5, 0.3)
    const addWheel = (x: number, y: number, z: number, r: number, w: number) => {
      const tire = rb(w, r * 2, r * 2, tireMat)
      tire.position.set(x, y, z)
      g.add(tire)
      const hub = rb(w + 0.01, r * 0.7, r * 0.7, hubMat)
      hub.position.set(x, y, z)
      g.add(hub)
    }
    for (const side of [-1, 1]) {
      addWheel(side * 0.3, 0.13, -0.22, 0.14, 0.08) // traseras grandes
      // Guardabarros
      const fender = rb(0.1, 0.04, 0.34, m(0xc62828, 0.5))
      fender.position.set(side * 0.3, 0.28, -0.22)
      g.add(fender)
      addWheel(side * 0.27, 0.09, 0.24, 0.09, 0.07) // delanteras pequeñas
    }

    // Faro (voxel emisivo)
    const hl = rb(0.06, 0.06, 0.04, new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.4,
    }))
    hl.position.set(0, 0.2, 0.37)
    g.add(hl)

    // Escape (voxel)
    const exhaust = rb(0.05, 0.12, 0.05, m(0x666666, 0.5, 0.5))
    exhaust.position.set(0.15, 0.34, -0.32)
    g.add(exhaust)

    // Grass basket behind seat (wireframe + translucent body)
    const basketPos = new THREE.Vector3(0, 0.22, -0.48)
    const basketWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.38, 0.45, 0.28)),
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 })
    )
    basketWire.position.copy(basketPos)
    g.add(basketWire)

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.2,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    })
    const basketBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.28), wallMat)
    basketBody.position.copy(basketPos)
    basketBody.castShadow = true
    g.add(basketBody)

    this.scene.add(g)
    this.group = g
    return g
  }
}
