import * as THREE from 'three'

const ROWS = 30
const COLS = 30

export class WorldBuilder {
  private scene: THREE.Scene
  barnGroup: THREE.Group | null = null
  private tileMesh!: THREE.InstancedMesh
  private tileColors: Float32Array
  private tileDummy = new THREE.Object3D()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.tileColors = new Float32Array(ROWS * COLS * 3)
  }

  build(grassMap?: Record<string, number>): void {
    this.createTileGround(grassMap)
    this.createGridBorders()
    this.createShop(15, 15)
    this.createFencePosts()
    this.createTrees()
  }

  private createNoiseTexture(): THREE.CanvasTexture {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const n = (Math.random() * 40 + Math.random() * 40 + Math.random() * 30) / 3
        const v = 140 + (n % 50)
        imageData.data[i] = v
        imageData.data[i + 1] = v + 20
        imageData.data[i + 2] = v - 10
        imageData.data[i + 3] = 255
      }
    }
    ctx.putImageData(imageData, 0, 0)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(ROWS, COLS)
    return tex
  }

  private createTileGround(grassMap?: Record<string, number>): void {
    const geo = new THREE.BoxGeometry(1, 0.05, 1)
    const noiseTex = this.createNoiseTexture()
    const mat = new THREE.MeshStandardMaterial({
      map: noiseTex,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
    })
    this.tileMesh = new THREE.InstancedMesh(geo, mat, ROWS * COLS)
    this.tileMesh.castShadow = false
    this.tileMesh.receiveShadow = true
    this.tileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    let idx = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.tileDummy.position.set(c + 0.5, 0, r + 0.5)
        this.tileDummy.updateMatrix()
        this.tileMesh.setMatrixAt(idx, this.tileDummy.matrix)

        const key = r + ',' + c
        const h = grassMap?.[key] ?? 0
        const rCol = h > 0 ? 74 : 42
        const gCol = h > 0 ? 122 : 61
        const bCol = h > 0 ? 46 : 24
        this.tileColors[idx * 3] = rCol / 255
        this.tileColors[idx * 3 + 1] = gCol / 255
        this.tileColors[idx * 3 + 2] = bCol / 255
        idx++
      }
    }

    this.tileMesh.instanceColor = new THREE.InstancedBufferAttribute(this.tileColors, 3)
    this.tileMesh.instanceMatrix.needsUpdate = true
    this.scene.add(this.tileMesh)
  }

  updateGroundTile(r: number, c: number, hasGrass: boolean): void {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return
    const idx = r * COLS + c
    if (hasGrass) {
      this.tileColors[idx * 3] = 74 / 255
      this.tileColors[idx * 3 + 1] = 122 / 255
      this.tileColors[idx * 3 + 2] = 46 / 255
    } else {
      this.tileColors[idx * 3] = 42 / 255
      this.tileColors[idx * 3 + 1] = 61 / 255
      this.tileColors[idx * 3 + 2] = 24 / 255
    }
    this.tileMesh.instanceColor!.needsUpdate = true
  }

  private createGridBorders(): void {
    const positions: number[] = []
    const y = 0.026
    for (let i = 0; i <= ROWS; i++) {
      positions.push(0, y, i, ROWS, y, i)
      positions.push(i, y, 0, i, y, ROWS)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
      depthTest: true,
    })
    const lines = new THREE.LineSegments(geo, mat)
    this.scene.add(lines)
  }

  private createShop(r: number, c: number): void {
    const g = new THREE.Group()
    const x = c + 0.5
    const z = r + 0.5

    const b = (color: number, r = 0.7) =>
      new THREE.MeshStandardMaterial({ color, roughness: r })
    const b2 = (w: number, h: number, d: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    const walls = b2(2.0, 1.1, 1.8, b(0xf5d76e, 0.6))
    walls.position.set(x, 0.55, z)
    g.add(walls)

    const base = b2(2.05, 0.12, 1.85, b(0xffffff, 0.5))
    base.position.set(x, 0.06, z)
    g.add(base)

    const roof = b2(2.2, 0.15, 2.0, b(0x2e7d32, 0.6))
    roof.position.set(x, 1.18, z)
    g.add(roof)
    const roofTrim = b2(2.25, 0.05, 2.05, b(0x1b5e20, 0.5))
    roofTrim.position.set(x, 1.28, z)
    g.add(roofTrim)

    const awningW = 2.0
    const awningD = 0.5
    const awningGroup = new THREE.Group()
    awningGroup.position.set(x, 0.95, z + 0.95)
    awningGroup.rotation.x = 0.25
    const stripes = 8
    for (let i = 0; i < stripes; i++) {
      const isRed = i % 2 === 0
      const stripe = b2(
        awningW / stripes,
        0.04,
        awningD,
        b(isRed ? 0xd32f2f : 0xffffff, 0.4)
      )
      stripe.position.set(
        -awningW / 2 + (i + 0.5) * (awningW / stripes),
        0,
        0
      )
      awningGroup.add(stripe)
    }
    for (let i = 0; i < stripes; i++) {
      const isRed = i % 2 === 0
      const tri = new THREE.Mesh(
        new THREE.ConeGeometry(awningW / stripes / 2, 0.08, 3),
        b(isRed ? 0xd32f2f : 0xffffff, 0.4)
      )
      tri.position.set(
        -awningW / 2 + (i + 0.5) * (awningW / stripes),
        -0.04,
        awningD / 2
      )
      tri.rotation.x = Math.PI
      awningGroup.add(tri)
    }
    g.add(awningGroup)

    const signC = document.createElement('canvas')
    signC.width = 256
    signC.height = 96
    const sx = signC.getContext('2d')!
    sx.fillStyle = '#1b5e20'
    sx.fillRect(0, 0, 256, 96)
    sx.fillStyle = '#ffd700'
    sx.font = 'bold 56px sans-serif'
    sx.textAlign = 'center'
    sx.textBaseline = 'middle'
    sx.fillText('SHOP', 128, 50)
    const signTex = new THREE.CanvasTexture(signC)
    const signFront = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.28),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
    )
    signFront.position.set(x, 1.05, z + 1.21)
    g.add(signFront)

    const counter = b2(1.2, 0.5, 0.4, b(0x6d4c2a, 0.7))
    counter.position.set(x, 0.25, z + 0.6)
    g.add(counter)
    const counterTop = b2(1.3, 0.06, 0.45, b(0xa07650, 0.6))
    counterTop.position.set(x, 0.52, z + 0.6)
    g.add(counterTop)

    for (const sx2 of [-0.9, 0.9]) {
      const winFrame = b2(0.05, 0.45, 0.4, b(0x6d4c2a, 0.7))
      winFrame.position.set(x + sx2, 0.55, z + 0.2)
      g.add(winFrame)
      const winGlass = b2(
        0.04,
        0.38,
        0.34,
        new THREE.MeshStandardMaterial({
          color: 0x90caf9,
          roughness: 0.1,
          metalness: 0.4,
          transparent: true,
          opacity: 0.5,
        })
      )
      winGlass.position.set(x + sx2, 0.55, z + 0.2)
      g.add(winGlass)
    }

    for (const lx of [-0.8, 0.8]) {
      const pole = b2(0.04, 0.7, 0.04, b(0x222222, 0.5))
      pole.position.set(x + lx, 0.5, z + 1.05)
      g.add(pole)
      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffd700,
          emissiveIntensity: 0.6,
        })
      )
      lantern.position.set(x + lx, 0.85, z + 1.05)
      g.add(lantern)
    }

    this.scene.add(g)
    this.barnGroup = g
  }

  private createFencePosts(): void {
    const pm = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 })
    for (let i = 0; i <= ROWS; i += 2) {
      for (const [fx, fz] of [
        [i, 0],
        [i, ROWS],
        [0, i],
        [ROWS, i],
      ] as [number, number][]) {
        if (fx >= 0 && fx <= ROWS && fz >= 0 && fz <= ROWS) {
          const p = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.35, 4),
            pm
          )
          p.position.set(fx, 0.175, fz)
          p.castShadow = true
          this.scene.add(p)
        }
      }
    }
  }

  private createTrees(): void {
    const spots: [number, number][] = [
      [2, 2], [27, 2], [2, 27], [27, 27],
      [5, 1], [25, 1], [1, 5], [1, 25],
      [29, 5], [29, 25],
    ]
    for (const [tr, tc] of spots) {
      if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
        this.makeTree(tc + 0.5, tr + 0.5, 0.7 + Math.random() * 0.4)
      }
    }
  }

  private makeTree(x: number, z: number, s: number): THREE.Group {
    const g = new THREE.Group()
    const br = (c: number) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 0.8 * s),
      br(0x5d4037)
    )
    t.position.set(x, 0.4 * s, z)
    t.castShadow = true
    g.add(t)
    const l = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 * s, 6, 6),
      br(0x2d7d2d)
    )
    l.position.set(x, 1.1 * s, z)
    l.scale.y = 0.8
    l.castShadow = true
    g.add(l)
    const l2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * s, 6, 6),
      br(0x3a8a3a)
    )
    l2.position.set(x + 0.3 * s, 1.3 * s, z + 0.2 * s)
    l2.scale.y = 0.7
    l2.castShadow = true
    g.add(l2)
    this.scene.add(g)
    return g
  }
}
