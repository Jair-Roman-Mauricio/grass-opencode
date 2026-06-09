import * as THREE from 'three'
import type { SeedId, PlotData } from '../../game/types'
import { SEEDS } from '../../game/constants'

const ROWS = 30
const COLS = 30
const MAX_TILES = ROWS * COLS
const TUFTS_PER_TILE = 3
const TALL_TUFTS_PER_TILE = 2
const MAX_TUFTS = MAX_TILES * (TUFTS_PER_TILE + TALL_TUFTS_PER_TILE)

type RGB = [number, number, number]

// ---------------------------------------------------------------------------
// Geometrías por tipo de semilla. Cada una es un "tuft" (mata) que se instancia
// varias veces por tile. Comparten el helper pushLeaf (un quad cónico).
// ---------------------------------------------------------------------------

function buildGeometry(seedId: SeedId): THREE.BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []

  const pushLeaf = (
    bx: number, bz: number,
    tx: number, ty: number, tz: number,
    baseW: number,
    tipW: number,
    colBase: RGB,
    colTip: RGB,
  ) => {
    const dx = tx - bx
    const dz = tz - bz
    const len = Math.sqrt(dx * dx + ty * ty + dz * dz) || 1
    const px = -dz / len
    const pz = dx / len

    const ax = bx + px * baseW
    const az = bz + pz * baseW
    const cax = bx - px * baseW
    const caz = bz - pz * baseW
    const ctsx = tx + px * tipW
    const ctsz = tz + pz * tipW
    const ctx = tx - px * tipW
    const ctz = tz - pz * tipW

    positions.push(ax, 0, az, ctsx, ty, ctsz, cax, 0, caz)
    colors.push(...colBase, ...colTip, ...colBase)
    positions.push(cax, 0, caz, ctsx, ty, ctsz, ctx, ty, ctz)
    colors.push(...colBase, ...colTip, ...colTip)
  }

  const pushFanLeaf = (leafY: number, leafAngle: number, fLen: number, tilt: number, mid: RGB, light: RGB) => {
    const fingers = 7
    for (let f = 0; f < fingers; f++) {
      const t = f / (fingers - 1) - 0.5
      const fAngle = leafAngle + t * 1.55
      const prof = 1 - Math.abs(t) * 1.25
      const len = fLen * Math.max(0.32, prof)
      const tx = Math.cos(fAngle) * len
      const tz = Math.sin(fAngle) * len
      const ty = Math.max(0.04, leafY + (1 - Math.abs(t) * 2) * tilt)
      pushLeaf(0, 0, tx, ty, tz, 0.016, 0.0, mid, light)
    }
  }

  switch (seedId) {
    case 'pasto': {
      // Briznas simples: abanico de hojas finas verdes.
      const dark: RGB = [0.12, 0.34, 0.12]
      const light: RGB = [0.46, 0.80, 0.34]
      const blades = 7
      for (let i = 0; i < blades; i++) {
        const a = (i / blades) * Math.PI * 2
        const lean = 0.10 + Math.random() * 0.06
        const tx = Math.cos(a) * lean
        const tz = Math.sin(a) * lean
        pushLeaf(0, 0, tx, 0.42 + Math.random() * 0.1, tz, 0.02, 0.0, dark, light)
      }
      pushLeaf(0, 0, 0, 0.5, 0, 0.022, 0.0, dark, light)
      break
    }
    case 'trebol': {
      // Trébol: tallos cortos rematados por hojitas anchas redondeadas.
      const stem: RGB = [0.18, 0.42, 0.16]
      const leafB: RGB = [0.22, 0.55, 0.20]
      const leafT: RGB = [0.45, 0.78, 0.32]
      const stems = 4
      for (let i = 0; i < stems; i++) {
        const a = (i / stems) * Math.PI * 2 + 0.4
        const sx = Math.cos(a) * 0.07
        const sz = Math.sin(a) * 0.07
        const h = 0.22 + Math.random() * 0.06
        pushLeaf(0, 0, sx, h, sz, 0.012, 0.01, stem, stem)
        // tres foliolos anchos en la punta
        for (let k = 0; k < 3; k++) {
          const la = a + (k - 1) * 0.5
          pushLeaf(sx, sz, sx + Math.cos(la) * 0.06, h + 0.05, sz + Math.sin(la) * 0.06, 0.05, 0.0, leafB, leafT)
        }
      }
      break
    }
    case 'trigo': {
      // Trigo: tallos altos rectos con espiga dorada arriba.
      const stem: RGB = [0.55, 0.62, 0.22]
      const grainB: RGB = [0.78, 0.66, 0.20]
      const grainT: RGB = [0.95, 0.84, 0.36]
      const stalks = 5
      for (let i = 0; i < stalks; i++) {
        const a = (i / stalks) * Math.PI * 2
        const ox = Math.cos(a) * 0.06
        const oz = Math.sin(a) * 0.06
        const h = 0.55 + Math.random() * 0.08
        pushLeaf(ox, oz, ox, h, oz, 0.012, 0.008, stem, grainB)
        // granos de la espiga
        for (let g = 0; g < 5; g++) {
          const gy = h * (0.6 + g * 0.08)
          pushLeaf(ox, oz, ox + 0.03, gy, oz, 0.018, 0.004, grainB, grainT)
          pushLeaf(ox, oz, ox - 0.03, gy + 0.02, oz, 0.018, 0.004, grainB, grainT)
        }
      }
      break
    }
    case 'girasol': {
      // Girasol: tallo grueso + corola amarilla con centro marrón.
      const stem: RGB = [0.20, 0.45, 0.16]
      const leaf: RGB = [0.26, 0.55, 0.20]
      const petalB: RGB = [0.95, 0.74, 0.15]
      const petalT: RGB = [1.0, 0.86, 0.30]
      const center: RGB = [0.36, 0.22, 0.08]
      const H = 0.6
      pushLeaf(0, 0, 0, H, 0, 0.03, 0.02, stem, stem)
      // un par de hojas grandes a media altura
      for (const side of [-1, 1]) {
        pushLeaf(0, 0, side * 0.12, H * 0.5, 0, 0.06, 0.0, leaf, leaf)
      }
      // corola: pétalos radiales en la copa
      const petals = 10
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2
        pushLeaf(0, 0, Math.cos(a) * 0.13, H + 0.02, Math.sin(a) * 0.13, 0.03, 0.0, petalB, petalT)
      }
      // centro
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        pushLeaf(0, 0, Math.cos(a) * 0.04, H + 0.04, Math.sin(a) * 0.04, 0.025, 0.01, center, center)
      }
      break
    }
    case 'cannabis':
    default: {
      const dark: RGB = [0.10, 0.30, 0.10]
      const mid: RGB = [0.22, 0.55, 0.18]
      const light: RGB = [0.45, 0.78, 0.30]
      const bud: RGB = [0.55, 0.78, 0.25]
      pushLeaf(0, 0, 0, 0.52, 0, 0.014, 0.012, dark, mid)
      const rings: Array<[number, number, number, number, number]> = [
        [4, 0.12, 0.22, 0.05, 0.0],
        [5, 0.27, 0.32, 0.12, 0.5],
        [4, 0.44, 0.27, 0.18, 1.0],
        [3, 0.56, 0.20, 0.20, 0.2],
      ]
      for (const [count, ly, fl, tl, off] of rings) {
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + off
          pushFanLeaf(ly, a, fl, tl, mid, light)
        }
      }
      const budY = 0.6
      for (let p = 0; p < 6; p++) {
        const pa = (p / 6) * Math.PI * 2
        pushLeaf(0, 0, Math.cos(pa) * 0.05, budY + (p % 3) * 0.045, Math.sin(pa) * 0.05, 0.02, 0.006, bud, light)
      }
      pushLeaf(0, 0, 0, 0.74, 0, 0.012, 0.006, bud, light)
      break
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

interface BladeInfo {
  type: SeedId
  fullScale: number
}

interface TypeMesh {
  mesh: THREE.InstancedMesh
  nextIndex: number
  /** Rangos liberados (por removeTile) reutilizables; todos de tamaño `total`. */
  freeSlots: number[]
  bladeInfos: BladeInfo[]
  swayPhase: Float32Array
  swaySpeed: Float32Array
  swayAmp: Float32Array
  swayPhaseAttr: THREE.InstancedBufferAttribute
  swaySpeedAttr: THREE.InstancedBufferAttribute
  swayAmpAttr: THREE.InstancedBufferAttribute
}

/** Tile activo: en qué malla (tipo) y rango de instancias vive. */
interface TileSlot {
  type: SeedId
  start: number
  count: number
}

export class GrassRenderer3D {
  private scene: THREE.Scene
  private meshes: Partial<Record<SeedId, TypeMesh>> = {}
  private tileSlots: Record<string, TileSlot> = {}
  private dummy = new THREE.Object3D()

  private tempMatrix = new THREE.Matrix4()
  private tempPos = new THREE.Vector3()
  private tempQuat = new THREE.Quaternion()
  private tempScale = new THREE.Vector3()

  private swayUniforms = { uTime: { value: 0 } }
  private swayTime = 0

  // Cola de animación de expansión (compra de área)
  private animationQueue: Array<{ r: number; c: number; type: SeedId; growth: number }> = []
  private isAnimating = false
  private animationStartTime = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  tick(dt: number): void {
    this.swayTime += dt
    this.swayUniforms.uTime.value = this.swayTime
  }

  /** Crea una InstancedMesh por tipo de semilla. La parcela arranca vacía. */
  init(): void {
    const swayUniforms = this.swayUniforms
    for (const def of SEEDS) {
      const geo = buildGeometry(def.id)
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        color: 0xffffff,
        roughness: 0.55,
        side: THREE.DoubleSide,
        envMapIntensity: 0.4,
      })
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = swayUniforms.uTime
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\n' +
            'attribute float aPhase;\nattribute float aSpeed;\nattribute float aAmp;\nuniform float uTime;\n'
          )
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\n' +
            'float sway = sin(uTime * aSpeed + aPhase) * aAmp * position.y;\n' +
            'transformed.x += sway;\ntransformed.z += sway * 0.5;\n'
          )
      }

      const mesh = new THREE.InstancedMesh(geo, mat, MAX_TUFTS)
      mesh.count = 0
      mesh.frustumCulled = false
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.scene.add(mesh)

      const swayPhase = new Float32Array(MAX_TUFTS)
      const swaySpeed = new Float32Array(MAX_TUFTS)
      const swayAmp = new Float32Array(MAX_TUFTS)
      const swayPhaseAttr = new THREE.InstancedBufferAttribute(swayPhase, 1)
      const swaySpeedAttr = new THREE.InstancedBufferAttribute(swaySpeed, 1)
      const swayAmpAttr = new THREE.InstancedBufferAttribute(swayAmp, 1)
      mesh.geometry.setAttribute('aPhase', swayPhaseAttr)
      mesh.geometry.setAttribute('aSpeed', swaySpeedAttr)
      mesh.geometry.setAttribute('aAmp', swayAmpAttr)

      this.meshes[def.id] = {
        mesh, nextIndex: 0, freeSlots: [], bladeInfos: [],
        swayPhase, swaySpeed, swayAmp,
        swayPhaseAttr, swaySpeedAttr, swayAmpAttr,
      }
    }
    this.swayTime = 0
  }

  /** Recrea los tiles a partir de las parcelas guardadas. */
  hydrate(plots: Record<string, PlotData>): void {
    for (const key of Object.keys(plots)) {
      const [r, c] = key.split(',').map(Number)
      const plot = plots[key]
      this.addTile(r, c, plot.type, plot.growth)
    }
  }

  hasTile(r: number, c: number): boolean {
    return !!this.tileSlots[r + ',' + c]
  }

  /** Crea las instancias de un tile recién plantado/hidratado. */
  addTile(r: number, c: number, type: SeedId, growth: number): void {
    const key = r + ',' + c
    if (this.tileSlots[key]) return
    const tm = this.meshes[type]
    if (!tm) return

    const x = c + 0.5
    const z = r + 0.5
    const total = TUFTS_PER_TILE + TALL_TUFTS_PER_TILE
    // Reutilizar un rango liberado si existe; si no, avanzar el cursor.
    let start = tm.freeSlots.pop()
    if (start === undefined) {
      if (tm.nextIndex + total > MAX_TUFTS) return // sin espacio
      start = tm.nextIndex
      tm.nextIndex += total
    }

    for (let i = 0; i < total; i++) {
      const idx = start + i
      const tall = i >= TUFTS_PER_TILE
      const gray = (tall ? 0.80 : 0.85) + Math.random() * (tall ? 0.25 : 0.30)
      tm.mesh.setColorAt(idx, new THREE.Color(gray, gray, gray))

      const spread = tall ? 0.55 : 0.65
      const fullScale = tall ? 1.4 : 1.0
      this.dummy.position.set(
        x + (Math.random() - 0.5) * spread,
        0.025,
        z + (Math.random() - 0.5) * spread,
      )
      this.dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      this.dummy.scale.setScalar(fullScale)
      this.dummy.updateMatrix()
      tm.mesh.setMatrixAt(idx, this.dummy.matrix)

      tm.swayPhase[idx] = Math.random() * Math.PI * 2
      tm.swaySpeed[idx] = 0.4 + Math.random() * 0.8
      tm.swayAmp[idx] = 0.015 + Math.random() * 0.02

      tm.bladeInfos[idx] = { type, fullScale }
    }

    this.tileSlots[key] = { type, start, count: total }
    tm.mesh.count = Math.max(tm.mesh.count, tm.nextIndex)
    tm.mesh.instanceColor!.needsUpdate = true
    tm.mesh.instanceMatrix.needsUpdate = true
    tm.swayPhaseAttr.needsUpdate = true
    tm.swaySpeedAttr.needsUpdate = true
    tm.swayAmpAttr.needsUpdate = true

    this.setTileGrowth(r, c, growth)
  }

  /** Escala el tile según el crecimiento 0..1 (mínimo visible para brotes). */
  setTileGrowth(r: number, c: number, growth: number): void {
    const slot = this.tileSlots[r + ',' + c]
    if (!slot) return
    const tm = this.meshes[slot.type]
    if (!tm) return
    const ratio = Math.max(0.15, Math.min(1, growth))
    for (let idx = slot.start; idx < slot.start + slot.count; idx++) {
      const info = tm.bladeInfos[idx]
      if (!info) continue
      tm.mesh.getMatrixAt(idx, this.tempMatrix)
      this.tempMatrix.decompose(this.tempPos, this.tempQuat, this.tempScale)
      const s = info.fullScale * ratio
      this.tempScale.set(s, s, s)
      this.tempMatrix.compose(this.tempPos, this.tempQuat, this.tempScale)
      tm.mesh.setMatrixAt(idx, this.tempMatrix)
    }
    tm.mesh.instanceMatrix.needsUpdate = true
  }

  /** Oculta (escala 0) las instancias de un tile cosechado. */
  removeTile(r: number, c: number): void {
    const key = r + ',' + c
    const slot = this.tileSlots[key]
    if (!slot) return
    const tm = this.meshes[slot.type]
    if (tm) {
      const zero = new THREE.Matrix4().scale(new THREE.Vector3(0, 0, 0))
      for (let idx = slot.start; idx < slot.start + slot.count; idx++) {
        tm.mesh.setMatrixAt(idx, zero)
        tm.bladeInfos[idx] = undefined as unknown as BladeInfo
      }
      tm.mesh.instanceMatrix.needsUpdate = true
      tm.freeSlots.push(slot.start)
    }
    delete this.tileSlots[key]
  }

  clearAll(): void {
    for (const def of SEEDS) {
      const tm = this.meshes[def.id]
      if (!tm) continue
      this.scene.remove(tm.mesh)
      tm.mesh.geometry.dispose()
      ;(tm.mesh.material as THREE.Material).dispose()
    }
    this.meshes = {}
    this.tileSlots = {}
    this.animationQueue = []
    this.isAnimating = false
  }

  // --- Animación de expansión de área (compra) ---

  animateAreaExpansion(
    areaTiles: Array<{ r: number; c: number; type: SeedId; growth: number }>,
    cameraTarget: { x: number; z: number },
    onCameraMove?: (target: { x: number; z: number }) => void,
  ): void {
    let sumR = 0, sumC = 0
    for (const t of areaTiles) { sumR += t.r; sumC += t.c }
    const centerR = sumR / areaTiles.length
    const centerC = sumC / areaTiles.length

    this.animationQueue = areaTiles
      .map(t => ({ ...t, dist: Math.sqrt((t.r - centerR) ** 2 + (t.c - centerC) ** 2) }))
      .sort((a, b) => a.dist - b.dist)
      .map(({ r, c, type, growth }) => ({ r, c, type, growth }))
    this.animationStartTime = performance.now()
    this.isAnimating = true

    if (onCameraMove) setTimeout(() => onCameraMove(cameraTarget), 200)
  }

  updateAnimation(): void {
    if (!this.isAnimating || this.animationQueue.length === 0) return
    const elapsed = (performance.now() - this.animationStartTime) / 1000
    const batchSize = Math.min(5, this.animationQueue.length)
    for (let i = 0; i < batchSize; i++) {
      const { r, c, type, growth } = this.animationQueue.shift()!
      this.addTile(r, c, type, growth)
    }
    if (elapsed > 2.0) {
      while (this.animationQueue.length > 0) {
        const { r, c, type, growth } = this.animationQueue.shift()!
        this.addTile(r, c, type, growth)
      }
    }
    if (this.animationQueue.length === 0) this.isAnimating = false
  }
}
