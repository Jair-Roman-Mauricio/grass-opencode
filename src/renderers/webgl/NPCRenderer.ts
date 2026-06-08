import * as THREE from 'three'

export class NPCRenderer {
  group: THREE.Group | null = null
  dance = 0
  dancePhase = 0
  private armPivots: { pivot: THREE.Group; side: number }[] = []
  private legPivots: { pivot: THREE.Group; side: number }[] = []
  private head: THREE.Mesh | null = null
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  build(x: number, z: number): THREE.Group {
    const g = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 })
    const shirt = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    const apron = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })
    const pants = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 })
    const shoes = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
    const hairM = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x222222 })

    const b2 = (w: number, h: number, d: number, m: THREE.Material) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      r.castShadow = true
      return r
    }
    const sp = (r: number, seg: number, m: THREE.Material) => {
      const m2 = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m)
      m2.castShadow = true
      return m2
    }

    const body = b2(0.28, 0.24, 0.16, shirt)
    body.position.y = 0.42
    g.add(body)

    const apronMesh = b2(0.3, 0.22, 0.02, apron)
    apronMesh.position.set(0, 0.4, 0.09)
    g.add(apronMesh)

    const pocket = b2(0.14, 0.1, 0.025, apron)
    pocket.position.set(0, 0.32, 0.1)
    g.add(pocket)

    const head = sp(0.11, 10, skin)
    head.position.y = 0.65
    g.add(head)
    this.head = head

    const hair = sp(0.115, 10, hairM)
    hair.position.set(0, 0.7, 0)
    hair.scale.set(1, 0.7, 1)
    g.add(hair)

    for (const ex of [-0.045, 0.045]) {
      const e = sp(0.02, 6, eyeM)
      e.position.set(ex, 0.66, 0.1)
      g.add(e)
    }

    const smile = b2(0.06, 0.012, 0.01, new THREE.MeshStandardMaterial({ color: 0x222222 }))
    smile.position.set(0, 0.61, 0.105)
    g.add(smile)

    const makeArm = (side: number) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.19, 0.5, 0)
      const ua = b2(0.05, 0.18, 0.05, shirt)
      ua.position.y = -0.09
      pivot.add(ua)
      const la = b2(0.045, 0.16, 0.045, skin)
      la.position.y = -0.21
      pivot.add(la)
      g.add(pivot)
      this.armPivots.push({ pivot, side })
      return pivot
    }
    makeArm(-1)
    makeArm(1)

    const makeLeg = (side: number) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.08, 0.18, 0)
      const ul = b2(0.07, 0.18, 0.07, pants)
      ul.position.y = -0.09
      pivot.add(ul)
      const ll = b2(0.06, 0.18, 0.065, pants)
      ll.position.y = -0.27
      pivot.add(ll)
      const shoe = b2(0.08, 0.04, 0.1, shoes)
      shoe.position.set(0, -0.38, 0.02)
      pivot.add(shoe)
      g.add(pivot)
      this.legPivots.push({ pivot, side })
      return pivot
    }
    makeLeg(-1)
    makeLeg(1)

    g.position.set(x, 0, z)
    g.rotation.y = Math.PI
    this.scene.add(g)
    this.group = g
    return g
  }

  update(dt: number, ticks: number): void {
    if (this.dance > 0) {
      this.dance = Math.max(0, this.dance - dt)
      this.dancePhase += dt * 8
      const intensity = Math.min(1, this.dance * 2)
      const armSwing = Math.sin(this.dancePhase * 1.5) * 0.8 * intensity

      if (this.armPivots[0]) {
        this.armPivots[0].pivot.rotation.z = -1.2 * intensity - armSwing * 0.3
        this.armPivots[0].pivot.rotation.x = Math.sin(this.dancePhase) * 0.6 * intensity
      }
      if (this.armPivots[1]) {
        this.armPivots[1].pivot.rotation.z = 1.2 * intensity + armSwing * 0.3
        this.armPivots[1].pivot.rotation.x = -Math.sin(this.dancePhase) * 0.6 * intensity
      }

      const legSwing = Math.sin(this.dancePhase * 2) * 0.5 * intensity
      for (let i = 0; i < this.legPivots.length; i++) {
        this.legPivots[i].pivot.rotation.x = i % 2 === 0 ? legSwing : -legSwing
      }

      const hop = Math.abs(Math.sin(this.dancePhase * 2)) * 0.25 * intensity
      if (this.group) this.group.position.y = hop
      if (this.head) this.head.position.y = 0.65 + Math.sin(this.dancePhase * 2) * 0.04 * intensity
      if (this.group) this.group.rotation.z = Math.sin(this.dancePhase) * 0.1 * intensity
    } else {
      const t = ticks * 0.05
      for (const a of this.armPivots) {
        a.pivot.rotation.z *= 0.9
        a.pivot.rotation.x *= 0.9
      }
      if (this.legPivots[0]) this.legPivots[0].pivot.rotation.x = Math.sin(t) * 0.03
      if (this.legPivots[1]) this.legPivots[1].pivot.rotation.x = -Math.sin(t) * 0.03
      if (this.head) this.head.position.y = 0.65 + Math.sin(t * 0.7) * 0.01
      if (this.group) {
        this.group.position.y = 0
        this.group.rotation.z = 0
      }
    }
  }
}
