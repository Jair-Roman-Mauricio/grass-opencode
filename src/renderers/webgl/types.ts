import * as THREE from 'three'

export interface FlyingBill {
  mesh: THREE.Mesh
  progress: number
  duration: number
  startX: number
  startZ: number
}

export interface StackBill {
  mesh: THREE.Mesh
  offsetY: number
}

export interface DepositingBill {
  mesh: THREE.Mesh
  start: { x: number; y: number; z: number }
  end: { x: number; z: number }
  progress: number
  duration: number
  arcHeight: number
  delay: number
  elapsed: number
}

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
}

export interface ShopkeeperData {
  group: THREE.Group
  parts: {
    armPivots: { pivot: THREE.Group; side: number }[]
    legPivots: { pivot: THREE.Group; side: number }[]
    body: THREE.Mesh
    head: THREE.Mesh
  }
  dance: number
  dancePhase: number
}
