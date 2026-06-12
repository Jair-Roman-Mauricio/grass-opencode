import * as THREE from 'three'

// Construye el mundo de "El Pueblo": una calle central, casas a los lados, el
// edificio del laboratorio al fondo y una parada de autobús para volver. Mismo
// grid 30×30 que la parcela, para que el movimiento/clamp del jugador encaje.

const SIZE = 30

type AABB = { minX: number; maxX: number; minZ: number; maxZ: number }

export class TownBuilder {
  private scene: THREE.Scene
  private solids: AABB[] = []

  busStopPos = new THREE.Vector3(15.5, 0, 26.5)
  labPos = new THREE.Vector3(15.5, 0, 7.5)
  playerSpawn = new THREE.Vector3(15.5, 0, 22.5)

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  private mat(color: number, rough = 0.85) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough })
  }
  private box(w: number, h: number, d: number, m: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
  private aabbAt(cx: number, cz: number, hx: number, hz: number): AABB {
    return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }
  }

  build(): void {
    this.solids = []

    // Suelo (asfalto sucio)
    const ground = this.box(SIZE, 0.2, SIZE, this.mat(0x3b3f46, 1))
    ground.position.set(SIZE / 2, -0.1, SIZE / 2)
    ground.receiveShadow = true
    this.scene.add(ground)

    // Acera/calle central más clara (corre de norte a sur, col 13..18)
    const street = this.box(6, 0.05, SIZE, this.mat(0x52565d, 1))
    street.position.set(15.5, 0.02, SIZE / 2)
    this.scene.add(street)
    // Línea discontinua central
    for (let z = 2; z < SIZE; z += 3) {
      const dash = this.box(0.3, 0.06, 1.2, this.mat(0xc9b85a, 0.8))
      dash.position.set(15.5, 0.04, z)
      this.scene.add(dash)
    }
    // Calle transversal (este-oeste, frente al laboratorio)
    const cross = this.box(SIZE, 0.05, 5, this.mat(0x52565d, 1))
    cross.position.set(SIZE / 2, 0.02, 12)
    this.scene.add(cross)

    // Casas a ambos lados de la calle central
    const houseColors = [0x8a5a3c, 0x6e7b8a, 0x7a6a4a, 0x5f6b54, 0x8a7b5a]
    const lots: Array<[number, number]> = [
      [6, 5], [6, 18], [6, 24],
      [25, 5], [25, 18], [25, 24],
      [6, 12], [25, 12],
    ]
    lots.forEach(([cx, cz], i) => this.house(cx, cz, houseColors[i % houseColors.length]))

    // Laboratorio (al fondo, distinto y reconocible)
    this.lab(this.labPos.x, this.labPos.z)

    // Parada de autobús (volver a la parcela)
    this.busStop(this.busStopPos.x, this.busStopPos.z)

    // Algunos faroles
    for (const [x, z] of [[12, 10], [19, 10], [12, 20], [19, 20]] as Array<[number, number]>) {
      const pole = this.box(0.12, 3, 0.12, this.mat(0x2c2f34))
      pole.position.set(x, 1.5, z)
      this.scene.add(pole)
      const lamp = this.box(0.4, 0.3, 0.4, this.mat(0xffe6a0, 0.4))
      lamp.position.set(x, 3, z)
      this.scene.add(lamp)
    }
  }

  private house(cx: number, cz: number, color: number): void {
    const g = new THREE.Group()
    const w = 4.2, d = 3.6, h = 2.6
    const body = this.box(w, h, d, this.mat(color))
    body.position.set(cx, h / 2, cz)
    g.add(body)
    // tejado
    const roof = this.box(w + 0.5, 0.5, d + 0.5, this.mat(0x4a2f24))
    roof.position.set(cx, h + 0.25, cz)
    g.add(roof)
    const roof2 = this.box(w - 1.2, 0.5, d - 1.2, this.mat(0x3a241c))
    roof2.position.set(cx, h + 0.7, cz)
    g.add(roof2)
    // puerta (mirando a la calle central)
    const facingX = cx < 15.5 ? 1 : -1
    const door = this.box(0.1, 1.3, 0.8, this.mat(0x2a1a12))
    door.position.set(cx + (w / 2) * facingX, 0.65, cz)
    g.add(door)
    // ventanas
    for (const dz of [-1, 1]) {
      const win = this.box(0.1, 0.8, 0.8, this.mat(0x9fc2d6, 0.4))
      win.position.set(cx + (w / 2) * facingX, 1.6, cz + dz)
      g.add(win)
    }
    this.scene.add(g)
    this.solids.push(this.aabbAt(cx, cz, w / 2 + 0.1, d / 2 + 0.1))
  }

  private lab(cx: number, cz: number): void {
    const g = new THREE.Group()
    const w = 7, d = 4.5, h = 3.4
    const body = this.box(w, h, d, this.mat(0xdfe3e0, 0.7))
    body.position.set(cx, h / 2, cz)
    g.add(body)
    // franja verde
    const stripe = this.box(w + 0.05, 0.6, d + 0.05, this.mat(0x4a9e5e, 0.6))
    stripe.position.set(cx, 1.1, cz)
    g.add(stripe)
    // tejado plano
    const roof = this.box(w + 0.4, 0.4, d + 0.4, this.mat(0x9aa0a0))
    roof.position.set(cx, h + 0.2, cz)
    g.add(roof)
    // puerta de cristal (mirando al sur, hacia la calle)
    const door = this.box(1.6, 2.2, 0.12, this.mat(0x2c3a44, 0.3))
    door.position.set(cx, 1.1, cz + d / 2)
    g.add(door)
    // cartel
    const c = document.createElement('canvas')
    c.width = 256; c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#1c3a28'; ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#7CC55A'; ctx.font = 'bold 30px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('LABORATORIO', 128, 34)
    const tex = new THREE.CanvasTexture(c)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
    sign.position.set(cx, h - 0.4, cz + d / 2 + 0.07)
    g.add(sign)
    this.scene.add(g)
    this.solids.push(this.aabbAt(cx, cz, w / 2 + 0.1, d / 2 + 0.1))
  }

  private busStop(cx: number, cz: number): void {
    const g = new THREE.Group()
    for (const sx of [-0.85, 0.85]) {
      const pole = this.box(0.1, 1.9, 0.1, this.mat(0x394049))
      pole.position.set(cx + sx, 0.95, cz + 0.35)
      g.add(pole)
    }
    const back = this.box(1.9, 1.1, 0.08, this.mat(0x4a90c2, 0.5))
    back.position.set(cx, 1.2, cz + 0.4)
    g.add(back)
    const roof = this.box(2.2, 0.1, 1.1, this.mat(0xd84f3f, 0.5))
    roof.position.set(cx, 1.95, cz)
    g.add(roof)
    const seat = this.box(1.8, 0.1, 0.4, this.mat(0x6d4c2a))
    seat.position.set(cx, 0.5, cz - 0.05)
    g.add(seat)
    // poste cartel BUS
    const signPole = this.box(0.08, 2.4, 0.08, this.mat(0x9aa6ae))
    signPole.position.set(cx + 1.3, 1.2, cz)
    g.add(signPole)
    const c = document.createElement('canvas')
    c.width = 128; c.height = 128
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#1565c0'; ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 60px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🚌', 64, 44)
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText('BUS', 64, 96)
    const tex = new THREE.CanvasTexture(c)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }))
    sign.position.set(cx + 1.3, 2.5, cz)
    g.add(sign)
    const sign2 = sign.clone(); sign2.rotation.y = Math.PI; g.add(sign2)
    this.scene.add(g)
    this.solids.push(this.aabbAt(cx, cz + 0.1, 1.15, 0.6))
  }

  getSolidAABBs(): AABB[] {
    return this.solids
  }
}
