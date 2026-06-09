import * as THREE from 'three'

const ROWS = 30
const COLS = 30
const BASE_Y = 0.5

export interface EnemyData {
  x: number
  z: number
  dir: number
  phase: number
  wanderTimer: number
  moveDir: number
  moveDist: number
  group: THREE.Group
  legPivots: THREE.Group[]
  stuckTimer: number
}

export interface BarnAABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export class EnemyRenderer {
  enemies: EnemyData[] = []
  private scene: THREE.Scene
  private getBarnAABB: () => BarnAABB | null
  private self = this

  constructor(scene: THREE.Scene, getBarnAABB: () => BarnAABB | null) {
    this.scene = scene
    this.getBarnAABB = getBarnAABB
  }

  buildAll(grassMap?: Record<string, number>): void {
    const spots: [number, number][] = [
      [6, 8], [24, 22], [9, 24], [26, 6],
    ]

    for (const [r, c] of spots) {
      if (r < 1 || r >= ROWS - 1 || c < 1 || c >= COLS - 1) continue
      const distBarn = Math.sqrt((r - 15) ** 2 + (c - 15) ** 2)
      if (distBarn < 4) continue
      const distStart = Math.sqrt((r - 17) ** 2 + (c - 17) ** 2)
      if (distStart < 6) continue

      if (grassMap) {
        const key = Math.floor(r) + ',' + Math.floor(c)
        if ((grassMap[key] ?? 0) >= 3) continue
      }

      const grp = this.makeGoat()
      grp.position.set(c + 0.5, BASE_Y, r + 0.5)
      this.enemies.push({
        x: c + 0.5,
        z: r + 0.5,
        dir: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        wanderTimer: 1 + Math.random() * 3,
        moveDir: Math.random() * Math.PI * 2,
        moveDist: 0,
        group: grp,
        legPivots: grp.userData.legPivots as THREE.Group[],
        stuckTimer: 0,
      })
    }
  }

  private makeGoat(): THREE.Group {
    const g = new THREE.Group()
    const fur = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
    const hornM = new THREE.MeshStandardMaterial({ color: 0xe8d4a0, roughness: 0.6 })
    const eyeM = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff0000,
      emissiveIntensity: 0.7,
    })
    const hoofM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })

    const b2 = (w: number, h: number, d: number, m: THREE.Material) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      r.castShadow = true
      return r
    }

    const body = b2(0.4, 0.32, 0.55, fur)
    body.position.y = 0.32
    g.add(body)

    for (const [tx, ty, tz] of [
      [-0.15, 0.42, -0.15],
      [0.15, 0.42, 0.15],
      [-0.15, 0.42, 0.15],
      [0.15, 0.42, -0.15],
      [0, 0.45, 0],
    ]) {
      const tuft = b2(0.12, 0.12, 0.12, fur)
      tuft.position.set(tx, ty, tz)
      g.add(tuft)
    }

    const head = b2(0.22, 0.2, 0.24, new THREE.MeshStandardMaterial({ color: 0x2a1a0a }))
    head.position.set(0, 0.42, 0.38)
    g.add(head)

    const snout = b2(0.14, 0.1, 0.1, new THREE.MeshStandardMaterial({ color: 0x4a3020 }))
    snout.position.set(0, 0.34, 0.5)
    g.add(snout)

    for (const sx of [-1, 1]) {
      const horn = b2(0.04, 0.16, 0.04, hornM)
      horn.position.set(sx * 0.1, 0.6, 0.35)
      horn.rotation.z = sx * 0.4
      g.add(horn)
      const tip = b2(0.05, 0.06, 0.05, hornM)
      tip.position.set(sx * 0.14, 0.68, 0.32)
      g.add(tip)
    }

    for (const ex of [-0.06, 0.06]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeM)
      e.position.set(ex, 0.46, 0.5)
      g.add(e)
    }

    for (const sx of [-1, 1]) {
      const ear = b2(0.04, 0.08, 0.04, new THREE.MeshStandardMaterial({ color: 0x3a2a1a }))
      ear.position.set(sx * 0.13, 0.52, 0.36)
      ear.rotation.z = sx * 0.5
      g.add(ear)
    }

    const tail = b2(0.05, 0.05, 0.12, new THREE.MeshStandardMaterial({ color: 0x2a1a0a }))
    tail.position.set(0, 0.4, -0.32)
    tail.rotation.x = -0.5
    g.add(tail)

    const legPivots: THREE.Group[] = []
    for (const [lx, lz] of [
      [-0.13, -0.2],
      [0.13, -0.2],
      [-0.13, 0.2],
      [0.13, 0.2],
    ]) {
      const pivot = new THREE.Group()
      pivot.position.set(lx, 0.22, lz)
      const leg = b2(0.06, 0.18, 0.06, fur)
      leg.position.y = -0.09
      pivot.add(leg)
      const hoof = b2(0.07, 0.04, 0.07, hoofM)
      hoof.position.y = -0.19
      pivot.add(hoof)
      g.add(pivot)
      legPivots.push(pivot)
    }

    g.userData.legPivots = legPivots
    this.scene.add(g)
    return g
  }

  private isBlocked(x: number, z: number, skipIdx: number): boolean {
    for (let i = 0; i < this.enemies.length; i++) {
      if (i === skipIdx) continue
      const o = this.enemies[i]
      const d = Math.sqrt((o.x - x) ** 2 + (o.z - z) ** 2)
      if (d < 0.9) return true
    }
    // Chocar contra la tienda (AABB real, no un cuadrado genérico).
    const barn = this.getBarnAABB?.()
    if (barn) {
      const radius = 0.4
      const closestX = Math.max(barn.minX, Math.min(x, barn.maxX))
      const closestZ = Math.max(barn.minZ, Math.min(z, barn.maxZ))
      const dx = x - closestX
      const dz = z - closestZ
      if (dx * dx + dz * dz < radius * radius) return true
    }
    return false
  }

  update(
    dt: number,
    personX: number,
    personZ: number,
    mowerX: number,
    mowerZ: number,
    onHit: (lost: number) => void
  ): void {
    const halfCell = 0.8

    for (let ei = 0; ei < this.enemies.length; ei++) {
      const e = this.enemies[ei]
      e.wanderTimer -= dt
      e.phase += dt * 4

      if (e.wanderTimer <= 0) {
        e.moveDir = Math.random() * Math.PI * 2
        e.moveDist = 2 + Math.random() * 4
        e.wanderTimer = 2 + Math.random() * 3
      }

      if (e.moveDist > 0) {
        const spd = 1.2 * dt
        const nx = e.x + Math.sin(e.moveDir) * spd
        const nz = e.z + Math.cos(e.moveDir) * spd
        const clampedX = Math.max(halfCell, Math.min(COLS - halfCell, nx))
        const clampedZ = Math.max(halfCell, Math.min(ROWS - halfCell, nz))

        const hitEdge = clampedX !== nx || clampedZ !== nz

        if (!this.isBlocked(clampedX, clampedZ, ei)) {
          e.x = clampedX
          e.z = clampedZ
          e.moveDist -= spd
          e.dir = e.moveDir
          e.stuckTimer = 0
        } else {
          e.stuckTimer += dt
          e.moveDist = 0
          if (e.stuckTimer > 0.5) {
            e.moveDir = Math.atan2(15 - e.x, 15 - e.z)
            e.moveDist = 4
            e.stuckTimer = 0
          }
        }

        if (hitEdge) {
          e.stuckTimer += dt
          e.moveDist = 0
          if (e.stuckTimer > 0.5) {
            e.moveDir = Math.atan2(15 - e.x, 15 - e.z)
            e.moveDist = 4
            e.stuckTimer = 0
          }
        }

        const swing = Math.sin(e.phase * 3) * 0.35
        if (e.legPivots[0]) e.legPivots[0].rotation.x = swing
        if (e.legPivots[3]) e.legPivots[3].rotation.x = swing
        if (e.legPivots[1]) e.legPivots[1].rotation.x = -swing
        if (e.legPivots[2]) e.legPivots[2].rotation.x = -swing
      } else {
        for (const lp of e.legPivots) {
          lp.rotation.x *= 0.9
        }
      }

      e.group.position.set(e.x, BASE_Y, e.z)
      e.group.rotation.y = e.dir

      const dPlayer = Math.sqrt((e.x - personX) ** 2 + (e.z - personZ) ** 2)
      const dMower = Math.sqrt((e.x - mowerX) ** 2 + (e.z - mowerZ) ** 2)

      if (dPlayer < 0.9 || dMower < 0.9) {
        e.moveDir = Math.atan2(personX - e.x, personZ - e.z)
        e.moveDist = 3
        e.wanderTimer = 2
        onHit(1)
      }
    }
  }

  clearAll(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.group)
    }
    this.enemies = []
  }
}
