import * as THREE from 'three'
import { getBillTexture } from './TextureFactory'
import type { FlyingBill, StackBill, DepositingBill } from './types'

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose())
  } else {
    material.dispose()
  }
}

export class EffectRenderer {
  private scene: THREE.Scene
  private container: HTMLElement | null = null
  private hitFlashEl: HTMLElement | null = null
  private shakeEl: HTMLElement | null = null

  flyingBills: FlyingBill[] = []
  billStack: StackBill[] = []
  depositingBills: DepositingBill[] = []
  hitFlash = 0
  shake = 0
  mowerLoad = 0
  wasFull = false

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  init(containerId: string): void {
    this.container = document.getElementById(containerId)
  }

  spawnFlyingBill(gx: number, gz: number, onPling: () => void): void {
    const tex = getBillTexture()
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.08), mat)
    mesh.position.set(gx, 0.12, gz)
    mesh.rotation.x = -Math.PI / 2
    mesh.castShadow = true
    mesh.userData.rotSpeed = (Math.random() - 0.5) * 6
    this.scene.add(mesh)
    this.flyingBills.push({
      mesh,
      progress: 0,
      duration: 0.25 + Math.random() * 0.15,
      startX: gx,
      startZ: gz,
    })
    onPling()
  }

  // El dinero llena el corral por CAPAS: primero se completa toda la rejilla del
  // suelo (capa 0), luego la capa 1 encima, etc. (cx,cz) es el centro del corral.
  updateBillStack(cx: number, cz: number, _dir: number, mowerLoad: number, maxCap: number): void {
    const COLS = 6, ROWS = 4
    const PER_LAYER = COLS * ROWS            // 24 billetes por capa
    const MAX = PER_LAYER * 2                // hasta 2 capas representadas
    const target = Math.min(MAX, Math.max(0, Math.ceil((mowerLoad / Math.max(1, maxCap)) * MAX)))

    while (this.billStack.length > target && this.billStack.length > 0) {
      const b = this.billStack.pop()!
      if (b.mesh.parent) {
        this.scene.remove(b.mesh)
        disposeMaterial(b.mesh.material)
      }
    }
    while (this.billStack.length < target) {
      const tex = getBillTexture()
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1 })
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.085, 0.4), mat)
      mesh.castShadow = true
      this.scene.add(mesh)
      this.billStack.push({ mesh, offsetY: 0 })
    }

    const cellW = 0.34, cellD = 0.42, layerH = 0.09
    for (let i = 0; i < this.billStack.length; i++) {
      const b = this.billStack[i]
      const layer = Math.floor(i / PER_LAYER)
      const cell = i % PER_LAYER
      const col = cell % COLS
      const row = Math.floor(cell / COLS)
      const y = 0.1 + layer * layerH
      b.mesh.position.x = cx + (col - (COLS - 1) / 2) * cellW
      b.mesh.position.z = cz + (row - (ROWS - 1) / 2) * cellD
      b.mesh.position.y = y
      b.mesh.rotation.set(0, 0, 0)
      b.mesh.scale.set(1, 1, 1)
      b.offsetY = layer * layerH
    }
  }

  startDepositArc(barnX: number, barnZ: number, mowerX: number, mowerZ: number): void {
    if (this.billStack.length === 0) return

    for (let i = 0; i < this.billStack.length; i++) {
      const bill = this.billStack[i]
      const delay = i * 0.04
      const arcH = 1.2 + Math.random() * 0.8
      this.depositingBills.push({
        mesh: bill.mesh,
        start: {
          x: mowerX + (Math.random() - 0.5) * 0.3,
          y: 0.1 + bill.offsetY,
          z: mowerZ + (Math.random() - 0.5) * 0.3,
        },
        end: {
          x: barnX + (Math.random() - 0.5) * 0.4,
          z: barnZ + (Math.random() - 0.5) * 0.4,
        },
        progress: 0,
        duration: 0.6 + Math.random() * 0.3,
        arcHeight: arcH,
        delay,
        elapsed: 0,
      })
    }
    this.billStack = []
  }

  updateFlyingBills(mowerX: number, mowerZ: number, mowerDir: number): void {
    for (let i = this.flyingBills.length - 1; i >= 0; i--) {
      const b = this.flyingBills[i]
      b.progress += 0.016 / b.duration
      if (b.progress >= 1) {
        this.scene.remove(b.mesh)
        disposeMaterial(b.mesh.material)
        this.flyingBills.splice(i, 1)
        continue
      }
      const t = b.progress
      const backX = -Math.sin(mowerDir) * 0.35
      const backZ = -Math.cos(mowerDir) * 0.35
      b.mesh.position.x = b.startX + (mowerX + backX - b.startX) * t
      b.mesh.position.z = b.startZ + (mowerZ + backZ - b.startZ) * t
      b.mesh.position.y = 0.12 + Math.sin(t * Math.PI) * 0.4
      b.mesh.rotation.x = -Math.PI / 2 + Math.sin(t * 12) * 0.4
      b.mesh.rotation.y = t * 4
      b.mesh.rotation.z = Math.sin(t * 10) * 0.3
      const s = 1 - t * 0.15
      b.mesh.scale.set(s, s, 1)
    }
  }

  updateDepositingBills(): boolean {
    for (let i = this.depositingBills.length - 1; i >= 0; i--) {
      const b = this.depositingBills[i]
      b.elapsed += 0.016
      if (b.elapsed < b.delay) continue
      const t = (b.elapsed - b.delay) / b.duration
      if (t >= 1) {
        this.scene.remove(b.mesh)
        disposeMaterial(b.mesh.material)
        this.depositingBills.splice(i, 1)
        continue
      }
      b.mesh.position.x = b.start.x + (b.end.x - b.start.x) * t
      b.mesh.position.z = b.start.z + (b.end.z - b.start.z) * t
      b.mesh.position.y = b.start.y + Math.sin(t * Math.PI) * b.arcHeight
      b.mesh.rotation.x = -Math.PI / 2 + Math.sin(t * 16) * 0.6
      b.mesh.rotation.y = t * 6
      b.mesh.rotation.z = Math.sin(t * 12) * 0.4
      const s = 1 - t * 0.7
      b.mesh.scale.set(s, s, 1)
    }
    return this.depositingBills.length === 0
  }

  scatterBills(originX: number, originZ: number): void {
    if (this.billStack.length === 0) return
    const count = this.billStack.length
    for (let i = 0; i < count; i++) {
      const bill = this.billStack[i]
      const tex = bill.mesh.material instanceof THREE.MeshStandardMaterial ? bill.mesh.material.map : null
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.08), mat)
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
      const dist = 1.5 + Math.random() * 2.5
      mesh.position.set(
        originX + Math.cos(angle) * 0.3,
        0.5 + Math.random() * 0.4,
        originZ + Math.sin(angle) * 0.3
      )
      mesh.userData.scatterDir = angle
      mesh.userData.scatterDist = dist
      mesh.userData.scatterSpeed = 1.8 + Math.random() * 1.5
      mesh.userData.scatterFade = 0.5 + Math.random() * 0.6
      mesh.rotation.x = -Math.PI / 4
      mesh.castShadow = true
      this.scene.add(mesh)
      this.flyingBills.push({
        mesh,
        progress: 0,
        duration: mesh.userData.scatterFade,
        startX: mesh.position.x,
        startZ: mesh.position.z,
      })
    }

    for (const b of this.billStack) {
      this.scene.remove(b.mesh)
      disposeMaterial(b.mesh.material)
    }
    this.billStack = []
  }

  updateScatterBills(dt: number): void {
    for (let i = this.flyingBills.length - 1; i >= 0; i--) {
      const b = this.flyingBills[i]
      const u = b.mesh.userData
      if (!u.scatterDir) continue
      b.progress += dt / b.duration
      if (b.progress >= 1) {
        this.scene.remove(b.mesh)
        disposeMaterial(b.mesh.material)
        this.flyingBills.splice(i, 1)
        continue
      }
      const t = b.progress
      const x = b.startX + Math.cos(u.scatterDir) * u.scatterDist * t
      const z = b.startZ + Math.sin(u.scatterDir) * u.scatterDist * t
      const arc = Math.sin(t * Math.PI) * 1.2
      b.mesh.position.set(x, 0.15 + arc, z)
      b.mesh.rotation.x = -Math.PI / 2 + t * Math.PI
      b.mesh.rotation.z = Math.sin(t * 10) * 0.5 + 0.3
      b.mesh.rotation.y = t * 8
      const s = 1 - t * 0.3
      b.mesh.scale.set(s, s, 1)
    }
  }

  clearAll(): void {
    for (const arr of [this.flyingBills, this.billStack, this.depositingBills]) {
      for (const b of arr) {
        if (b.mesh && b.mesh.parent) {
          this.scene.remove(b.mesh)
          disposeMaterial(b.mesh.material)
        }
      }
    }
    this.flyingBills = []
    this.billStack = []
    this.depositingBills = []
  }

  showEarnPopup(amount: number): void {
    if (!this.container) return
    const el = document.createElement('div')
    el.className = 'earn-popup'
    el.style.cssText = `
      position:absolute;pointer-events:none;color:#ffd700;font-weight:700;
      font-size:22px;text-shadow:0 2px 12px rgba(0,0,0,.7);
      z-index:20;left:${50 + (Math.random() - 0.5) * 30}%;
      top:${50 + (Math.random() - 0.5) * 15 - 15}%;
      animation:earnFloat 1.2s ease-out forwards;
    `
    el.textContent = amount >= 0 ? `+$${amount}` : `-$${Math.abs(amount)}`
    this.container.appendChild(el)
    setTimeout(() => el.remove(), 1200)
  }

  renderHitEffects(): void {
    if (!this.hitFlashEl) {
      this.hitFlashEl = document.createElement('div')
      this.hitFlashEl.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:999;opacity:0'
      document.body.appendChild(this.hitFlashEl)
    }
    if (this.hitFlash > 0) {
      this.hitFlashEl.style.background =
        'radial-gradient(circle,rgba(255,0,0,.55) 0%,rgba(255,0,0,0) 70%)'
      this.hitFlashEl.style.opacity = this.hitFlash.toFixed(2)
    } else {
      this.hitFlashEl.style.opacity = '0'
    }
  }

  renderScreenShake(wrapId: string): void {
    if (!this.shakeEl) {
      this.shakeEl = document.getElementById(wrapId)!
      if (!this.shakeEl) return
    }
    if (this.shake > 0) {
      const s = this.shake * 0.3
      this.shakeEl.style.transform = `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`
    } else {
      this.shakeEl.style.transform = ''
    }
  }
}
