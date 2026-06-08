import * as THREE from 'three'

export interface PersonParts {
  lArm: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  rArm: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  lLeg: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  rLeg: { group: THREE.Group; upper: THREE.Mesh; lower: THREE.Mesh }
  body: THREE.Mesh
}

export interface PersonState {
  x: number
  z: number
  dir: number
  moving: boolean
  group: THREE.Group | null
  parts: PersonParts | null
  walkPhase: number
  state: 'walk' | 'mount' | 'ride' | 'dismount'
  mountTimer: number
  mountDuration: number
}

export class PlayerRenderer {
  person: PersonState
  private scene: THREE.Scene
  private lastStepPhase = 0
  onStep?: () => void

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.person = {
      x: 17,
      z: 17,
      dir: 0,
      moving: false,
      group: null,
      parts: null,
      walkPhase: 0,
      state: 'walk',
      mountTimer: 0,
      mountDuration: 0.6,
    }
  }

  build(): THREE.Group {
    const g = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 })
    const shirt = new THREE.MeshStandardMaterial({ color: 0x4477cc, roughness: 0.7 })
    const pants = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.7 })
    const shoes = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xcc8833, roughness: 0.8 })

    const b2 = (w: number, h: number, d: number, m: THREE.Material, sh = true) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      r.castShadow = sh
      return r
    }
    const sp = (r: number, seg: number, m: THREE.Material) => {
      const m2 = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m)
      m2.castShadow = true
      return m2
    }

    const body = b2(0.22, 0.2, 0.13, shirt)
    body.position.y = 0.38
    g.add(body)

    const head = sp(0.1, 8, skin)
    head.position.y = 0.58
    g.add(head)

    const hatB = b2(0.26, 0.025, 0.2, hatMat)
    hatB.position.y = 0.63
    g.add(hatB)
    const hatT = b2(0.16, 0.07, 0.14, hatMat)
    hatT.position.y = 0.68
    g.add(hatT)

    const eyeM = new THREE.MeshStandardMaterial({ color: 0x222222 })
    for (const ex of [-0.045, 0.045]) {
      const e = sp(0.018, 6, eyeM)
      e.position.set(ex, 0.6, 0.09)
      g.add(e)
    }

    const makeArm = (side: number) => {
      const grp = new THREE.Group()
      const ua = b2(0.04, 0.15, 0.04, shirt)
      ua.position.y = 0.075
      grp.add(ua)
      const la = b2(0.035, 0.14, 0.035, skin)
      la.position.y = -0.07
      grp.add(la)
      grp.position.set(side * 0.16, 0.46, 0)
      g.add(grp)
      return { group: grp, upper: ua, lower: la }
    }

    const lArm = makeArm(-1)
    const rArm = makeArm(1)

    const makeLeg = (side: number) => {
      const grp = new THREE.Group()
      const ul = b2(0.06, 0.16, 0.06, pants)
      ul.position.y = 0.08
      grp.add(ul)
      const ll = b2(0.05, 0.16, 0.055, pants)
      ll.position.y = -0.08
      grp.add(ll)
      const ft = b2(0.045, 0.03, 0.07, shoes)
      ft.position.set(0, -0.155, 0.015)
      grp.add(ft)
      grp.position.set(side * 0.08, 0.22, 0)
      g.add(grp)
      return { group: grp, upper: ul, lower: ll }
    }

    const lLeg = makeLeg(-1)
    const rLeg = makeLeg(1)

    g.position.set(this.person.x, 0, this.person.z)
    this.scene.add(g)

    this.person.group = g
    this.person.parts = { lArm, rArm, lLeg, rLeg, body }
    return g
  }

  animateWalk(dt: number, speed: number): void {
    const p = this.person
    const pa = p.parts
    if (!pa) return

    if (p.moving) {
      p.walkPhase += dt * 8 * Math.max(1, speed * 0.8)
      const w = Math.sin(p.walkPhase)
      const w2 = Math.sin(p.walkPhase + Math.PI)
      pa.lLeg.group.rotation.x = w * 0.5
      pa.rLeg.group.rotation.x = w2 * 0.5
      pa.lArm.group.rotation.x = w2 * 0.4
      pa.rArm.group.rotation.x = w * 0.4
      pa.body.position.y = 0.38 + Math.abs(w) * 0.03

      const phaseNorm = p.walkPhase % (Math.PI * 2)
      const prevNorm = this.lastStepPhase % (Math.PI * 2)
      if ((prevNorm < Math.PI && phaseNorm >= Math.PI) || (prevNorm < 0 && phaseNorm >= 0)) {
        this.onStep?.()
      }
      this.lastStepPhase = phaseNorm
    } else {
      pa.lLeg.group.rotation.x *= 0.9
      pa.rLeg.group.rotation.x *= 0.9
      pa.lArm.group.rotation.x *= 0.9
      pa.rArm.group.rotation.x *= 0.9
      pa.body.position.y += (0.38 - pa.body.position.y) * 0.1
    }
  }

  updateMountDismount(dt: number, mowerX: number, mowerY: number, mowerZ: number, mowerDir: number, onDismountPlaced?: (x: number, z: number) => void): void {
    const p = this.person
    const a = p
    a.mountTimer += dt
    const t = Math.min(1, a.mountTimer / a.mountDuration)
    const et = 1 - Math.pow(1 - t, 3)

    if (p.state === 'mount') {
      const g = p.group
      if (!g) return
      g.visible = true
      if (t < 0.5) {
        const targetX = mowerX + Math.sin(mowerDir) * 0.3
        const targetZ = mowerZ + Math.cos(mowerDir) * 0.3
        g.position.x += (targetX - g.position.x) * 0.08
        g.position.z += (targetZ - g.position.z) * 0.08
        g.rotation.y = mowerDir
        p.dir = mowerDir
        p.moving = true
        this.animateWalk(dt, 1)
      } else {
        p.moving = false
        g.scale.set(1, 1, 1)
        g.position.x = mowerX
        g.position.z = mowerZ
        g.position.y = 0.05 + et * 0.55
        g.rotation.y = mowerDir
        p.dir = mowerDir
        if (p.parts) p.parts.body.position.y = 0.38
      }
      if (t >= 1) {
        p.state = 'ride'
        g.scale.set(1, 1, 1)
        g.position.y = 0
        a.mountTimer = 0
      }
    } else if (p.state === 'dismount') {
      const g = p.group
      if (!g) return
      g.visible = true
      const isFirstFrame = a.mountTimer <= dt + 0.001
      if (isFirstFrame) {
        p.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 1.4
        p.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 1.4
        onDismountPlaced?.(p.x, p.z)
      }
      if (t < 0.3) {
        const pt = t / 0.3
        g.scale.set(pt, pt, pt)
        g.position.x = mowerX + Math.sin(mowerDir + Math.PI / 2) * 1.4
        g.position.z = mowerZ + Math.cos(mowerDir + Math.PI / 2) * 1.4
        g.position.y = (1 - pt) * 0.2
        g.rotation.y = mowerDir + Math.PI
        p.dir = mowerDir + Math.PI
      } else {
        p.moving = true
        g.position.x += (p.x - g.position.x) * 0.1
        g.position.z += (p.z - g.position.z) * 0.1
        g.rotation.y += (p.dir - g.rotation.y) * 0.1
        this.animateWalk(dt, 1)
      }
      if (t >= 1) {
        p.state = 'walk'
        g.scale.set(1, 1, 1)
        g.position.y = 0
        p.x = g.position.x
        p.z = g.position.z
        a.mountTimer = 0
      }
    }
  }
}
