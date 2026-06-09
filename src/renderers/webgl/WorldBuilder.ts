import * as THREE from 'three'

const ROWS = 30
const COLS = 30

export class WorldBuilder {
  private scene: THREE.Scene
  barnGroup: THREE.Group | null = null
  // Posiciones (x=col, z=row) de los vendedores de semillas y herramientas.
  seedVendorPos: THREE.Vector3 = new THREE.Vector3(6.5, 0, 5.5)
  toolVendorPos: THREE.Vector3 = new THREE.Vector3(23.5, 0, 5.5)
  // Centro y tamaño de la tienda (para colisiones AABB)
  barnCenter: THREE.Vector3 = new THREE.Vector3(15.5, 0, 15.5)
  barnSize: THREE.Vector3 = new THREE.Vector3(2.8, 1.54, 2.52)
  // Padding extra para que el jugador no se "pegue" visualmente al muro
  barnPadding: number = 0.1
  private tileMesh!: THREE.InstancedMesh
  private tileColors: Float32Array
  private tileDummy = new THREE.Object3D()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.tileColors = new Float32Array(ROWS * COLS * 3)
  }

  /**
   * Devuelve los bounds AABB (ejes X y Z) del granero/tienda, expandidos con padding.
   * Util para jugador, cortadora y enemigos.
   */
  getBarnAABB(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const halfX = this.barnSize.x / 2 + this.barnPadding
    const halfZ = this.barnSize.z / 2 + this.barnPadding
    return {
      minX: this.barnCenter.x - halfX,
      maxX: this.barnCenter.x + halfX,
      minZ: this.barnCenter.z - halfZ,
      maxZ: this.barnCenter.z + halfZ,
    }
  }

  build(grassMap?: Record<string, number>): void {
    this.createTileGround(grassMap)
    this.createGridBorders()
    this.createShop(15, 15)
    // Puestos de vendedores (semillas y herramientas).
    this.createStall(this.seedVendorPos.z, this.seedVendorPos.x, 0x2e7d32, 'SEMILLAS')
    this.createStall(this.toolVendorPos.z, this.toolVendorPos.x, 0x1565c0, 'HERRAMIENTAS')
    this.createFencePosts()
    this.createTrees()
  }

  /** Puesto de mercado pequeño (mostrador + toldo a rayas + cartel). */
  private createStall(r: number, c: number, accent: number, label: string): void {
    const g = new THREE.Group()
    const x = c
    const z = r
    const b = (color: number, rough = 0.7) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough })
    const box = (w: number, h: number, d: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    // Mostrador
    const counter = box(1.5, 0.55, 0.5, b(0x6d4c2a))
    counter.position.set(x, 0.28, z + 0.5)
    g.add(counter)
    const counterTop = box(1.6, 0.08, 0.55, b(0xa07650, 0.6))
    counterTop.position.set(x, 0.58, z + 0.5)
    g.add(counterTop)

    // Postes
    for (const sx of [-0.7, 0.7]) {
      const pole = box(0.07, 1.3, 0.07, b(0x4e342e))
      pole.position.set(x + sx, 0.65, z + 0.2)
      g.add(pole)
    }

    // Toldo a rayas (accent + blanco)
    const awning = new THREE.Group()
    awning.position.set(x, 1.32, z + 0.45)
    awning.rotation.x = 0.3
    const stripes = 6
    const awW = 1.7
    const awD = 0.8
    for (let i = 0; i < stripes; i++) {
      const stripe = box(awW / stripes, 0.05, awD, b(i % 2 === 0 ? accent : 0xffffff, 0.5))
      stripe.position.set(-awW / 2 + (i + 0.5) * (awW / stripes), 0, 0)
      awning.add(stripe)
    }
    g.add(awning)

    // Cartel con texto
    const signC = document.createElement('canvas')
    signC.width = 256
    signC.height = 80
    const sx2 = signC.getContext('2d')!
    sx2.fillStyle = '#1b1b2e'
    sx2.fillRect(0, 0, 256, 80)
    sx2.fillStyle = '#ffd700'
    sx2.font = 'bold 34px sans-serif'
    sx2.textAlign = 'center'
    sx2.textBaseline = 'middle'
    sx2.fillText(label, 128, 42)
    const signTex = new THREE.CanvasTexture(signC)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.4),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
    )
    sign.position.set(x, 1.0, z - 0.16)
    g.add(sign)

    this.scene.add(g)
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

    // Factor de escala global: 140% del tamaño original para que la tienda
    // destaque como edificio principal del mapa.
    const S = 1.4

    const b = (color: number, r = 0.7) =>
      new THREE.MeshStandardMaterial({ color, roughness: r })
    const b2 = (w: number, h: number, d: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    const walls = b2(2.0 * S, 1.1 * S, 1.8 * S, b(0xf5d76e, 0.6))
    walls.position.set(x, 0.55 * S, z)
    g.add(walls)

    const base = b2(2.05 * S, 0.12 * S, 1.85 * S, b(0xffffff, 0.5))
    base.position.set(x, 0.06 * S, z)
    g.add(base)

    const roof = b2(2.2 * S, 0.15 * S, 2.0 * S, b(0x2e7d32, 0.6))
    roof.position.set(x, 1.18 * S, z)
    g.add(roof)
    const roofTrim = b2(2.25 * S, 0.05 * S, 2.05 * S, b(0x1b5e20, 0.5))
    roofTrim.position.set(x, 1.28 * S, z)
    g.add(roofTrim)

    const awningW = 2.0 * S
    const awningD = 0.5 * S
    const awningGroup = new THREE.Group()
    awningGroup.position.set(x, 0.95 * S, z + 0.95 * S)
    awningGroup.rotation.x = 0.25
    const stripes = 8
    for (let i = 0; i < stripes; i++) {
      const isRed = i % 2 === 0
      const stripe = b2(
        awningW / stripes,
        0.04 * S,
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
        new THREE.ConeGeometry(awningW / stripes / 2, 0.08 * S, 3),
        b(isRed ? 0xd32f2f : 0xffffff, 0.4)
      )
      tri.position.set(
        -awningW / 2 + (i + 0.5) * (awningW / stripes),
        -0.04 * S,
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
      new THREE.PlaneGeometry(0.85 * S, 0.28 * S),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
    )
    signFront.position.set(x, 1.05 * S, z + 1.21 * S)
    g.add(signFront)

    const counter = b2(1.2 * S, 0.5 * S, 0.4 * S, b(0x6d4c2a, 0.7))
    counter.position.set(x, 0.25 * S, z + 0.6 * S)
    g.add(counter)
    const counterTop = b2(1.3 * S, 0.06 * S, 0.45 * S, b(0xa07650, 0.6))
    counterTop.position.set(x, 0.52 * S, z + 0.6 * S)
    g.add(counterTop)

    for (const sx2 of [-0.9 * S, 0.9 * S]) {
      const winFrame = b2(0.05 * S, 0.45 * S, 0.4 * S, b(0x6d4c2a, 0.7))
      winFrame.position.set(x + sx2, 0.55 * S, z + 0.2 * S)
      g.add(winFrame)
      const winGlass = b2(
        0.04 * S,
        0.38 * S,
        0.34 * S,
        new THREE.MeshStandardMaterial({
          color: 0x90caf9,
          roughness: 0.1,
          metalness: 0.4,
          transparent: true,
          opacity: 0.5,
        })
      )
      winGlass.position.set(x + sx2, 0.55 * S, z + 0.2 * S)
      g.add(winGlass)
    }

    for (const lx of [-0.8 * S, 0.8 * S]) {
      const pole = b2(0.04 * S, 0.7 * S, 0.04 * S, b(0x222222, 0.5))
      pole.position.set(x + lx, 0.5 * S, z + 1.05 * S)
      g.add(pole)
      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.14 * S, 0.14 * S, 0.14 * S),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffd700,
          emissiveIntensity: 0.6,
        })
      )
      lantern.position.set(x + lx, 0.85 * S, z + 1.05 * S)
      g.add(lantern)
    }

    this.scene.add(g)
    this.barnGroup = g
    // Sincronizar el AABB con la geometría real (mismo factor S aplicado).
    this.barnSize.set(2.0 * S, 1.1 * S, 1.8 * S)
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
    // Árbol estilo VOXEL: tronco de caja + follaje de cubos apilados.
    const g = new THREE.Group()
    const box = (w: number, h: number, d: number, c: number) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
      )
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }

    // Tronco
    const trunk = box(0.22 * s, 0.9 * s, 0.22 * s, 0x6b4a2b)
    trunk.position.set(x, 0.45 * s, z)
    g.add(trunk)

    // Copa: cubos de hojas en dos tonos, apilados/escalonados
    const leafA = 0x2f7d32
    const leafB = 0x3f9242
    const blocks: [number, number, number, number, number][] = [
      // x, y, z, size, color
      [0, 1.15, 0, 0.9, leafA],
      [0.45, 1.05, 0.1, 0.55, leafB],
      [-0.4, 1.1, -0.15, 0.55, leafB],
      [0.1, 1.0, 0.45, 0.5, leafB],
      [-0.15, 1.45, 0.05, 0.6, leafA],
      [0.2, 1.4, -0.25, 0.45, leafB],
    ]
    for (const [bx, by, bz, bs, bc] of blocks) {
      const leaf = box(bs * s, bs * s, bs * s, bc)
      leaf.position.set(x + bx * s, by * s, z + bz * s)
      g.add(leaf)
    }

    this.scene.add(g)
    return g
  }
}
