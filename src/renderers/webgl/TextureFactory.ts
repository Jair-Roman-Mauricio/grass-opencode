import * as THREE from 'three'

let billTexCache: THREE.CanvasTexture | null = null

export function getBillTexture(): THREE.CanvasTexture {
  if (billTexCache) return billTexCache

  const c = document.createElement('canvas')
  c.width = 128
  c.height = 72
  const x = c.getContext('2d')!

  const grad = x.createLinearGradient(0, 0, 128, 72)
  grad.addColorStop(0, '#6b9b37')
  grad.addColorStop(0.5, '#5a8a2a')
  grad.addColorStop(1, '#4a7a1e')
  x.fillStyle = grad
  x.beginPath()
  roundRect(x, 0, 0, 128, 72, 5)
  x.fill()

  x.strokeStyle = '#2d5a0a'
  x.lineWidth = 3
  x.beginPath()
  roundRect(x, 3, 3, 122, 66, 4)
  x.stroke()

  x.strokeStyle = '#8ab84a'
  x.lineWidth = 1.5
  x.beginPath()
  roundRect(x, 10, 10, 108, 52, 3)
  x.stroke()

  for (const [cx, cy] of [[16, 16], [112, 16], [16, 56], [112, 56]]) {
    x.fillStyle = '#2d5a0a'
    x.beginPath()
    x.arc(cx, cy, 6, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#8ab84a'
    x.beginPath()
    x.arc(cx, cy, 3, 0, Math.PI * 2)
    x.fill()
  }

  x.fillStyle = '#2d5a0a'
  x.font = 'bold 48px serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText('$', 64, 36)

  x.fillStyle = '#3a6a14'
  x.font = '10px serif'
  x.textAlign = 'center'
  x.fillText('ONE DOLLAR', 64, 10)
  x.fillText('ONE DOLLAR', 64, 64)

  x.fillStyle = '#3a6a14'
  x.font = '9px monospace'
  x.textAlign = 'left'
  x.fillText('FG 52847163 A', 14, 36)

  x.strokeStyle = '#2d5a0a'
  x.lineWidth = 2
  x.beginPath()
  x.arc(100, 36, 10, 0, Math.PI * 2)
  x.stroke()
  x.fillStyle = '#2d5a0a'
  x.font = '8px serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText('\u25CF', 100, 36)

  billTexCache = new THREE.CanvasTexture(c)
  return billTexCache
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
}
