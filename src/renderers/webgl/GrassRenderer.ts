import * as THREE from 'three'

const ROWS = 30
const COLS = 30
const MAX_GRASS = 5
const MAX_TILES = ROWS * COLS
const TUFTS_PER_TILE = 7
const TALL_TUFTS_PER_TILE = 3
const MAX_TUFTS = MAX_TILES * (TUFTS_PER_TILE + TALL_TUFTS_PER_TILE)

function getTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []

  const dark: [number, number, number] = [0.12, 0.25, 0.08]
  const light: [number, number, number] = [0.45, 0.72, 0.30]

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
  return geo
}

interface BladeInfo {
  r: number
  c: number
  fullScale: number
}

export class GrassRenderer3D {
  private scene: THREE.Scene
  private instancedMesh!: THREE.InstancedMesh
  private dummy = new THREE.Object3D()
  private bladeInfos: BladeInfo[] = []
  private tileIndexMap: Record<string, { start: number; count: number }> = {}
  private nextIndex = 0
  private animationQueue: Array<{ r: number; c: number; h: number }> = []
  private isAnimating = false
  private animationStartTime = 0

  private tempMatrix = new THREE.Matrix4()
  private tempPos = new THREE.Vector3()
  private tempQuat = new THREE.Quaternion()
  private tempScale = new THREE.Vector3()

  // Per-instance sway attributes (GPU-driven via vertex shader)
  private swayPhaseArr!: Float32Array
  private swaySpeedArr!: Float32Array
  private swayAmpArr!: Float32Array
  private swayPhaseAttr!: THREE.InstancedBufferAttribute
  private swaySpeedAttr!: THREE.InstancedBufferAttribute
  private swayAmpAttr!: THREE.InstancedBufferAttribute
  private swayUniforms = { uTime: { value: 0 } }
  private swayTime = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  /** Call each frame with dt (seconds) to advance GPU sway time */
  tick(dt: number): void {
    this.swayTime += dt
    this.swayUniforms.uTime.value = this.swayTime
  }

  initGrassMap(grass: Record<string, number>): void {
    if (Object.keys(grass).length === 0) {
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
    }

    const geo = getTuftGeometry()
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.55,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    })

    // GPU sway via onBeforeCompile
    const swayUniforms = this.swayUniforms
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = swayUniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\n' +
          'attribute float aPhase;\n' +
          'attribute float aSpeed;\n' +
          'attribute float aAmp;\n' +
          'uniform float uTime;\n'
        )
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n' +
          'float sway = sin(uTime * aSpeed + aPhase) * aAmp * position.y;\n' +
          'transformed.x += sway;\n' +
          'transformed.z += sway * 0.5;\n'
        )
    }

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_TUFTS)
    this.instancedMesh.count = 0
    this.instancedMesh.frustumCulled = false
    this.instancedMesh.castShadow = true
    this.instancedMesh.receiveShadow = true
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.instancedMesh)

    // Per-instance sway attributes
    this.swayPhaseArr = new Float32Array(MAX_TUFTS)
    this.swaySpeedArr = new Float32Array(MAX_TUFTS)
    this.swayAmpArr = new Float32Array(MAX_TUFTS)
    this.swayPhaseAttr = new THREE.InstancedBufferAttribute(this.swayPhaseArr, 1)
    this.swaySpeedAttr = new THREE.InstancedBufferAttribute(this.swaySpeedArr, 1)
    this.swayAmpAttr = new THREE.InstancedBufferAttribute(this.swayAmpArr, 1)
    this.instancedMesh.geometry.setAttribute('aPhase', this.swayPhaseAttr)
    this.instancedMesh.geometry.setAttribute('aSpeed', this.swaySpeedAttr)
    this.instancedMesh.geometry.setAttribute('aAmp', this.swayAmpAttr)

    // Carga inmediata: crear todos los tiles ahora, sin cola animada
    for (const key of Object.keys(grass)) {
      const [r, c] = key.split(',').map(Number)
      const h = grass[key]
      if (h > 0) this.createTile(r, c, h, true)
    }

    this.swayPhaseAttr.needsUpdate = true
    this.swaySpeedAttr.needsUpdate = true
    this.swayAmpAttr.needsUpdate = true
    this.swayTime = 0
    this.isAnimating = false
    this.animationQueue = []
  }

  createTile(r: number, c: number, h: number, isInit = false): void {
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

      this.swayPhaseArr[idx] = Math.random() * Math.PI * 2
      this.swaySpeedArr[idx] = 0.5 + Math.random() * 0.8
      this.swayAmpArr[idx] = 0.015 + Math.random() * 0.02

      this.bladeInfos[idx] = { r, c, fullScale: scale }
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

        this.swayPhaseArr[idx] = Math.random() * Math.PI * 2
        this.swaySpeedArr[idx] = 0.4 + Math.random() * 0.6
        this.swayAmpArr[idx] = 0.015 + Math.random() * 0.02

        this.bladeInfos[idx] = { r, c, fullScale: scale }
        count++
      }
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
    const ratio = Math.max(0.01, h / MAX_GRASS)
    for (let idx = tile.start; idx < tile.start + tile.count; idx++) {
      const info = this.bladeInfos[idx]
      if (!info) continue
      this.instancedMesh.getMatrixAt(idx, this.tempMatrix)
      this.tempMatrix.decompose(this.tempPos, this.tempQuat, this.tempScale)
      this.tempScale.y = info.fullScale * ratio
      this.tempMatrix.compose(this.tempPos, this.tempQuat, this.tempScale)
      this.instancedMesh.setMatrixAt(idx, this.tempMatrix)
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }

  private setZeroMatrix(idx: number): void {
    const m = new THREE.Matrix4()
    m.scale(new THREE.Vector3(0, 0, 0))
    this.instancedMesh.setMatrixAt(idx, m)
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
    this.animationQueue = []
    this.isAnimating = false
  }

  animateAreaExpansion(
    areaTiles: Array<{ r: number; c: number; h: number }>,
    cameraTarget: { x: number; z: number },
    onCameraMove?: (target: { x: number; z: number }) => void,
  ): void {
    let sumR = 0, sumC = 0
    for (const tile of areaTiles) {
      sumR += tile.r
      sumC += tile.c
    }
    const centerR = sumR / areaTiles.length
    const centerC = sumC / areaTiles.length

    const sortedTiles = areaTiles
      .map(tile => ({
        ...tile,
        dist: Math.sqrt((tile.r - centerR) ** 2 + (tile.c - centerC) ** 2),
      }))
      .sort((a, b) => a.dist - b.dist)

    this.animationQueue = sortedTiles.map(tile => ({ r: tile.r, c: tile.c, h: tile.h }))
    this.animationStartTime = performance.now()
    this.isAnimating = true

    if (onCameraMove) {
      setTimeout(() => onCameraMove(cameraTarget), 200)
    }
  }

  updateAnimation(): void {
    if (!this.isAnimating || this.animationQueue.length === 0) return

    const elapsed = (performance.now() - this.animationStartTime) / 1000
    const batchSize = Math.min(5, this.animationQueue.length)

    for (let i = 0; i < batchSize; i++) {
      const { r, c, h } = this.animationQueue.shift()!
      this.createTile(r, c, h)
    }

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
}
