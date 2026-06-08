import * as THREE from 'three'

const ROWS = 30
const COLS = 30
const MAX_GRASS = 5
const MAX_TILES = ROWS * COLS
const TUFTS_PER_TILE = 7
const TALL_TUFTS_PER_TILE = 3
const MAX_TUFTS = MAX_TILES * (TUFTS_PER_TILE + TALL_TUFTS_PER_TILE)

let tuftGeoCache: THREE.BufferGeometry | null = null

function getTuftGeometry(): THREE.BufferGeometry {
  if (tuftGeoCache) return tuftGeoCache

  const positions: number[] = []
  const colors: number[] = []

  const dark: [number, number, number] = [0.12, 0.25, 0.08]
  const light: [number, number, number] = [0.45, 0.72, 0.30]

  // Central cone (6-sided pyramid, compact)
  const coneR = 0.10
  const coneH = 0.15
  const ring: [number, number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ring.push([Math.cos(a) * coneR, 0, Math.sin(a) * coneR])
  }
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6
    positions.push(...ring[i], ...ring[j], 0, coneH, 0)
    colors.push(...dark, ...dark, ...dark)
  }

  // 12 blade triangles with golden angle spacing
  for (let i = 0; i < 12; i++) {
    const t = i / 12
    const angle = t * Math.PI * 2 * 1.618
    const r = 0.02 + t * 0.16
    const h = 0.25 + t * 0.20
    const tilt = 0.10 + t * 0.25
    const w = 0.025 + t * 0.055

    const cx = Math.cos(angle) * r
    const cz = Math.sin(angle) * r
    const perpX = -Math.sin(angle)
    const perpZ = Math.cos(angle)

    const lx = cx + perpX * w
    const lz = cz + perpZ * w
    const rx = cx - perpX * w
    const rz = cz - perpZ * w

    const tipX = cx + Math.cos(angle) * tilt * h * 0.5
    const tipZ = cz + Math.sin(angle) * tilt * h * 0.5

    positions.push(lx, 0, lz, rx, 0, rz, tipX, h, tipZ)
    colors.push(...dark, ...dark, ...light)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  tuftGeoCache = geo
  return geo
}

interface BladeInfo {
  r: number
  c: number
  fullScale: number
  swayPhase: number
  swaySpeed: number
  swayAmp: number
}

export class GrassRenderer3D {
  private scene: THREE.Scene
  private instancedMesh!: THREE.InstancedMesh
  private dummy = new THREE.Object3D()
  private bladeInfos: BladeInfo[] = []
  private deadIndices: number[] = []
  private tileIndexMap: Record<string, { start: number; count: number }> = {}
  private nextIndex = 0
  private animationQueue: Array<{ r: number; c: number; h: number; delay: number }> = []
  private animationStartTime = 0
  private isAnimating = false

  // temp objects for matrix ops (avoid shared state corruption)
  private tempMatrix = new THREE.Matrix4()
  private tempPos = new THREE.Vector3()
  private tempQuat = new THREE.Quaternion()
  private tempScale = new THREE.Vector3()
  private swayEuler = new THREE.Euler()
  private finalQuat = new THREE.Quaternion()

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  initGrassMap(grass: Record<string, number>): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = Math.sqrt((r - ROWS / 2) ** 2 + (c - COLS / 2) ** 2)
        const key = r + ',' + c
        grass[key] =
          d < 3
            ? 0
            : Math.min(MAX_GRASS, 2 + ((Math.random() * 4) | 0))
      }
    }
    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const rr = 15 + dr
        const cc = 15 + dc
        if (
          rr >= 0 &&
          rr < ROWS &&
          cc >= 0 &&
          cc < COLS &&
          Math.sqrt(dr * dr + dc * dc) < 3
        ) {
          grass[rr + ',' + cc] = 0
        }
      }
    }

    const geo = getTuftGeometry()
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.55,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    })
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_TUFTS)
    this.instancedMesh.count = 0
    this.instancedMesh.castShadow = true
    this.instancedMesh.receiveShadow = true
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.instancedMesh)

    this.animationQueue = []
    const centerR = ROWS / 2
    const centerC = COLS / 2

    for (const key of Object.keys(grass)) {
      const [r, c] = key.split(',').map(Number)
      const h = grass[key]
      if (h > 0) {
        const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2)
        const delay = dist * 0.05
        this.animationQueue.push({ r, c, h, delay })
      }
    }

    this.animationQueue.sort((a, b) => a.delay - b.delay)
    this.animationStartTime = performance.now()
    this.isAnimating = true
  }

  createTile(r: number, c: number, h: number): void {
    const key = r + ',' + c
    if (this.tileIndexMap[key]) return
    const x = c + 0.5
    const z = r + 0.5
    const startIdx = this.allocateNext(TUFTS_PER_TILE)
    let count = 0

    for (let i = 0; i < TUFTS_PER_TILE; i++) {
      const idx = startIdx + i
      const gray = 0.85 + Math.random() * 0.30
      this.instancedMesh.setColorAt(idx, new THREE.Color(gray, gray, gray))

      const scale = 0.5 + (h / MAX_GRASS) * 1.0
      this.dummy.position.set(
        x + (Math.random() - 0.5) * 0.80,
        0.025,
        z + (Math.random() - 0.5) * 0.80,
      )
      this.dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      this.dummy.scale.set(scale, scale * (0.90 + Math.random() * 0.20), scale)
      this.dummy.updateMatrix()
      this.instancedMesh.setMatrixAt(idx, this.dummy.matrix)

      this.bladeInfos[idx] = {
        r, c,
        fullScale: scale,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.8,
        swayAmp: 0.015 + Math.random() * 0.02,
      }
      count++
    }

    if (h >= 3) {
      const tallStart = this.allocateNext(TALL_TUFTS_PER_TILE)
      for (let i = 0; i < TALL_TUFTS_PER_TILE; i++) {
        const idx = tallStart + i
        const gray = 0.80 + Math.random() * 0.25
        this.instancedMesh.setColorAt(idx, new THREE.Color(gray, gray, gray))

        const scale = 0.6 + (h / MAX_GRASS) * 1.2
        this.dummy.position.set(
          x + (Math.random() - 0.5) * 0.70,
          0.025,
          z + (Math.random() - 0.5) * 0.70,
        )
        this.dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
        this.dummy.scale.set(scale, scale * (0.95 + Math.random() * 0.20), scale)
        this.dummy.updateMatrix()
        this.instancedMesh.setMatrixAt(idx, this.dummy.matrix)

        this.bladeInfos[idx] = {
          r, c,
          fullScale: scale,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.4 + Math.random() * 0.6,
          swayAmp: 0.015 + Math.random() * 0.02,
        }
        count++
      }
      this.instancedMesh.count = Math.max(this.instancedMesh.count, tallStart + TALL_TUFTS_PER_TILE)
    }

    this.tileIndexMap[key] = { start: startIdx, count }
    this.instancedMesh.count = Math.max(this.instancedMesh.count, this.nextIndex)
    this.instancedMesh.instanceColor!.needsUpdate = true
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }

  private allocateNext(n: number): number {
    const start = this.nextIndex
    this.nextIndex += n
    return start
  }

  updateTile(r: number, c: number, h: number): void {
    const key = r + ',' + c
    const tile = this.tileIndexMap[key]
    if (!tile) {
      if (h > 0) this.createTile(r, c, h)
      return
    }
    if (h <= 0) {
      for (let idx = tile.start; idx < tile.start + tile.count; idx++) {
        this.setZeroMatrix(idx)
      }
      delete this.tileIndexMap[key]
      this.instancedMesh.instanceMatrix.needsUpdate = true
      return
    }
    for (let idx = tile.start; idx < tile.start + tile.count; idx++) {
      const info = this.bladeInfos[idx]
      if (!info) continue
      const scale = Math.max(0.01, (h / MAX_GRASS) * info.fullScale)
      this.instancedMesh.getMatrixAt(idx, this.dummy.matrix)
      const ds = this.dummy.matrix.elements
      const oy = Math.sqrt(ds[1] * ds[1] + ds[5] * ds[5] + ds[9] * ds[9])
      const scaleY = oy || 1
      const ratio = scale / scaleY
      ds[1] *= ratio; ds[5] *= ratio; ds[9] *= ratio
      this.instancedMesh.setMatrixAt(idx, this.dummy.matrix)
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }

  private setZeroMatrix(idx: number): void {
    const m = new THREE.Matrix4()
    m.scale(new THREE.Vector3(0, 0, 0))
    this.instancedMesh.setMatrixAt(idx, m)
  }

  updateSway(ticks: number): void {
    const t = ticks * 0.03
    const count = Math.min(this.instancedMesh.count, this.bladeInfos.length)
    let needsUpdate = false

    for (let idx = 0; idx < count; idx++) {
      const u = this.bladeInfos[idx]
      if (!u) continue
      const sway = Math.sin(t * u.swaySpeed + u.swayPhase) * u.swayAmp

      this.instancedMesh.getMatrixAt(idx, this.tempMatrix)
      this.tempMatrix.decompose(this.tempPos, this.tempQuat, this.tempScale)

      this.swayEuler.setFromQuaternion(this.tempQuat)
      this.swayEuler.x += sway * 0.5
      this.swayEuler.z += sway

      this.finalQuat.setFromEuler(this.swayEuler)
      this.tempMatrix.compose(this.tempPos, this.finalQuat, this.tempScale)
      this.instancedMesh.setMatrixAt(idx, this.tempMatrix)
      needsUpdate = true
    }

    if (needsUpdate) this.instancedMesh.instanceMatrix.needsUpdate = true
  }

  clearAll(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh)
      this.instancedMesh.geometry.dispose()
      const mat = this.instancedMesh.material as THREE.Material
      mat.dispose()
    }
    this.bladeInfos = []
    this.tileIndexMap = {}
    this.nextIndex = 0
    this.deadIndices = []
    this.animationQueue = []
    this.isAnimating = false
  }

  updateAnimation(): void {
    if (!this.isAnimating) return

    const elapsed = (performance.now() - this.animationStartTime) / 1000

    while (this.animationQueue.length > 0 && this.animationQueue[0].delay <= elapsed) {
      const { r, c, h } = this.animationQueue.shift()!
      this.createTile(r, c, h)
    }

    // Fallback: force all remaining tiles after 2s
    if (elapsed > 2.0 && this.animationQueue.length > 0) {
      while (this.animationQueue.length > 0) {
        const { r, c, h } = this.animationQueue.shift()!
        this.createTile(r, c, h)
      }
    }

    if (this.animationQueue.length === 0) {
      this.isAnimating = false
    }
  }

  animateAreaExpansion(
    areaTiles: Array<{ r: number; c: number; h: number }>,
    cameraTarget: { x: number; z: number },
    onCameraMove?: (target: { x: number; z: number }) => void,
  ): void {
    this.animationQueue = []

    let sumR = 0, sumC = 0
    for (const tile of areaTiles) {
      sumR += tile.r
      sumC += tile.c
    }
    const centerR = sumR / areaTiles.length
    const centerC = sumC / areaTiles.length

    const sortedTiles = areaTiles.map(tile => {
      const dist = Math.sqrt((tile.r - centerR) ** 2 + (tile.c - centerC) ** 2)
      return { ...tile, dist }
    }).sort((a, b) => a.dist - b.dist)

    for (const tile of sortedTiles) {
      const delay = tile.dist * 0.08
      this.animationQueue.push({ r: tile.r, c: tile.c, h: tile.h, delay })
    }

    this.animationStartTime = performance.now()
    this.isAnimating = true

    if (onCameraMove) {
      setTimeout(() => {
        onCameraMove(cameraTarget)
      }, 200)
    }
  }
}
