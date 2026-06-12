import * as THREE from 'three'

const ROWS = 30
const COLS = 30
const MAX = ROWS * COLS

const BAR_W = 3.0
const BAR_H = 0.6
const BAR_ASPECT = BAR_W / BAR_H
const BAR_CLEARANCE = 0.07
const PLANT_MAX_H = 0.82

const BAR_VERTEX = /* glsl */`
attribute float instanceGrowth;
varying vec2 vUv;
varying float vGrowth;

void main() {
  vUv = uv;
  vGrowth = instanceGrowth;
  vec4 worldPos = instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * worldPos;
}
`

const BAR_FRAGMENT = /* glsl */`
uniform float uAspect;
varying vec2 vUv;
varying float vGrowth;

float sdRoundBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

void main() {
  // Coordenadas corregidas para que la cápsula no se estire con el plano ancho
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
  vec2 halfSize = vec2(0.45, 0.065);
  float radius = 0.065;

  vec2 pShadow = p - vec2(0.0, -0.038);
  float dShadow = sdRoundBox(pShadow, halfSize, radius);
  float shadow = smoothstep(0.07, 0.0, dShadow) * 0.4;

  float dOuter = sdRoundBox(p, halfSize, radius);
  float dFrameInner = sdRoundBox(p, halfSize - vec2(0.032, 0.006), radius - 0.005);
  float dTrack = sdRoundBox(p, halfSize - vec2(0.052, 0.010), radius - 0.009);

  if (dOuter > 0.018 && shadow < 0.01) discard;

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (dOuter <= 0.018) {
    float prog = clamp(vGrowth, 0.0, 1.0);

    vec3 frameTop = vec3(0.96, 0.97, 0.94);
    vec3 frameMid = vec3(0.82, 0.84, 0.80);
    vec3 frameBot = vec3(0.58, 0.60, 0.56);
    float bevel = smoothstep(-0.35, 0.35, p.y);
    col = mix(frameBot, frameTop, bevel);
    col = mix(col, frameMid, 0.35);

    if (dFrameInner < 0.0) {
      vec3 trackTop = vec3(0.22, 0.24, 0.26);
      vec3 trackBot = vec3(0.10, 0.11, 0.12);
      col = mix(trackBot, trackTop, smoothstep(-0.3, 0.25, p.y));
      col *= 0.92;
    }

    float inset = 0.052;
    float trackLeft = -halfSize.x + inset;
    float trackRight = halfSize.x - inset;
    float trackWidth = trackRight - trackLeft;
    float fillW = trackWidth * max(prog, 0.04);
    float fillEdge = trackLeft + fillW;

    float dFillCap = sdRoundBox(
      vec2(p.x - (trackLeft + fillW * 0.5), p.y),
      vec2(fillW * 0.5, halfSize.y - inset - 0.003),
      halfSize.y - inset - 0.003
    );

    if (p.x <= fillEdge + 0.002 && dFillCap < 0.0 && dTrack < 0.0) {
      vec3 greenBase = vec3(0.38, 0.78, 0.12);
      vec3 greenHi = vec3(0.58, 0.92, 0.22);
      float stripe = sin((p.x + p.y) * 52.0) * 0.5 + 0.5;
      vec3 fillCol = mix(greenBase, greenHi, stripe * 0.45 + 0.25);
      float gloss = smoothstep(0.04, 0.28, 0.24 - p.y);
      fillCol += vec3(0.55, 0.65, 0.35) * gloss * 0.55;
      fillCol *= 1.0 - smoothstep(-0.05, 0.24, p.y) * 0.18;
      col = fillCol;
    }

    col = mix(col, frameBot * 0.85, smoothstep(-0.008, 0.008, dFrameInner) * step(0.0, dTrack));
    alpha = 1.0 - smoothstep(0.0, 0.014, dOuter);
  } else {
    alpha = shadow;
  }

  gl_FragColor = vec4(col, alpha);
}
`

export class GrowthBarRenderer {
  private scene: THREE.Scene
  private barMesh: THREE.InstancedMesh | null = null
  private growthAttr: THREE.InstancedBufferAttribute | null = null
  private dummy = new THREE.Object3D()
  private growth = new Float32Array(MAX)
  private active = new Uint8Array(MAX)
  private camera: THREE.Camera | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  init(): void {
    this.clearAll()

    const geo = new THREE.PlaneGeometry(1, 1)
    this.growthAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1)
    geo.setAttribute('instanceGrowth', this.growthAttr)

    const mat = new THREE.ShaderMaterial({
      vertexShader: BAR_VERTEX,
      fragmentShader: BAR_FRAGMENT,
      uniforms: { uAspect: { value: BAR_ASPECT } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.barMesh = new THREE.InstancedMesh(geo, mat, MAX)
    this.barMesh.frustumCulled = false
    this.barMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.barMesh.renderOrder = 1000

    for (let i = 0; i < MAX; i++) this.hideInstance(i)

    this.scene.add(this.barMesh)
  }

  clearAll(): void {
    if (this.barMesh) {
      this.scene.remove(this.barMesh)
      this.barMesh.geometry.dispose()
      ;(this.barMesh.material as THREE.Material).dispose()
      this.barMesh = null
      this.growthAttr = null
    }
    this.growth.fill(0)
    this.active.fill(0)
    this.camera = null
  }

  setTile(r: number, c: number, growth: number): void {
    if (!this.barMesh || !this.growthAttr) return
    const idx = r * COLS + c
    this.active[idx] = 1
    this.growth[idx] = Math.max(0, Math.min(1, growth))
    this.growthAttr.setX(idx, this.growth[idx])
    this.growthAttr.needsUpdate = true
    this.writeBar(idx, r, c)
  }

  setGrowth(r: number, c: number, growth: number): void {
    if (!this.barMesh || !this.growthAttr) return
    const idx = r * COLS + c
    if (!this.active[idx]) return
    this.growth[idx] = Math.max(0, Math.min(1, growth))
    this.growthAttr.setX(idx, this.growth[idx])
    this.growthAttr.needsUpdate = true
    this.writeBar(idx, r, c)
  }

  removeTile(r: number, c: number): void {
    const idx = r * COLS + c
    this.active[idx] = 0
    this.growth[idx] = 0
    if (this.growthAttr) {
      this.growthAttr.setX(idx, 0)
      this.growthAttr.needsUpdate = true
    }
    this.hideInstance(idx)
  }

  updateFacing(camera: THREE.Camera): void {
    if (!this.barMesh) return
    this.camera = camera
    let dirty = false
    for (let idx = 0; idx < MAX; idx++) {
      if (!this.active[idx]) continue
      const r = Math.floor(idx / COLS)
      const c = idx % COLS
      this.writeBar(idx, r, c)
      dirty = true
    }
    if (dirty) this.barMesh.instanceMatrix.needsUpdate = true
  }

  private barHeight(growth: number): number {
    const g = Math.max(0.06, Math.min(1, growth))
    return g * PLANT_MAX_H + BAR_CLEARANCE
  }

  private writeBar(idx: number, r: number, c: number): void {
    if (!this.barMesh) return

    const y = this.barHeight(this.growth[idx])
    this.dummy.position.set(c + 0.5, y, r + 0.5)
    this.dummy.scale.set(BAR_W, BAR_H, 1)

    if (this.camera) {
      this.dummy.lookAt(this.camera.position)
    } else {
      this.dummy.rotation.set(0, 0, 0)
    }

    this.dummy.updateMatrix()
    this.barMesh.setMatrixAt(idx, this.dummy.matrix)
    this.barMesh.instanceMatrix.needsUpdate = true
  }

  private hideInstance(idx: number): void {
    if (!this.barMesh) return
    this.dummy.position.set(0, 0, 0)
    this.dummy.scale.set(0, 0, 0)
    this.dummy.updateMatrix()
    this.barMesh.setMatrixAt(idx, this.dummy.matrix)
    this.barMesh.instanceMatrix.needsUpdate = true
  }
}
