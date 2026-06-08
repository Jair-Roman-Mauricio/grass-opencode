import * as THREE from 'three'

export class MowerRenderer3D {
  group: THREE.Group | null = null
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  build(): THREE.Group {
    const g = new THREE.Group()
    const m = (c: number, r = 0.4, me = 0.2) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me })

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.7), m(0xe53935))
    body.position.y = 0.25
    body.castShadow = true
    g.add(body)

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.3), m(0xc62828))
    cab.position.set(0, 0.38, -0.15)
    g.add(cab)

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x90caf9,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.5,
      })
    )
    glass.position.set(0, 0.38, -0.31)
    g.add(glass)

    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.35), m(0x666666, 0.7, 0.3))
    deck.position.set(0, 0.08, 0.15)
    g.add(deck)

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), m(0x888888, 0.5, 0.6))
    disc.position.set(0, 0.05, 0.15)
    g.add(disc)

    const wm = m(0x222222, 0.9)
    for (const [wx, wy, wz] of [
      [-0.3, 0.1, -0.25],
      [0.3, 0.1, -0.25],
      [-0.3, 0.1, 0.25],
      [0.3, 0.1, 0.25],
    ]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8), wm)
      w.rotation.x = Math.PI / 2
      w.position.set(wx, wy, wz)
      g.add(w)
    }

    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.4,
      })
    )
    hl.position.set(0, 0.2, 0.37)
    g.add(hl)

    const basketWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.38, 0.45, 0.28)),
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 })
    )
    basketWire.position.set(0, 0.22, -0.48)
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
    basketBody.position.set(0, 0.22, -0.48)
    basketBody.castShadow = true
    g.add(basketBody)

    this.scene.add(g)
    this.group = g
    return g
  }
}
