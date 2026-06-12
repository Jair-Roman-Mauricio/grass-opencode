import { useCallback, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const BASE_SIZE = 132
const KNOB_SIZE = 52
const MAX_RADIUS = 40
const DEAD_ZONE = 10
const AXIS_THRESHOLD = 0.35

export function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const [active, setActive] = useState(false)
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const setInput = useGameStore.getState().setInput

  const clearMovement = useCallback(() => {
    setActive(false)
    setKnobOffset({ x: 0, y: 0 })
    setInput({ up: false, down: false, left: false, right: false })
  }, [setInput])

  const applyDirection = useCallback((dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy)
    if (dist < DEAD_ZONE) {
      setInput({ up: false, down: false, left: false, right: false })
      return
    }

    const clamped = Math.min(dist, MAX_RADIUS)
    const nx = dx / dist
    const ny = dy / dist
    setKnobOffset({ x: nx * clamped, y: ny * clamped })

    setInput({
      left: nx < -AXIS_THRESHOLD,
      right: nx > AXIS_THRESHOLD,
      up: ny < -AXIS_THRESHOLD,
      down: ny > AXIS_THRESHOLD,
    })
  }, [setInput])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return
    pointerIdRef.current = e.pointerId
    setActive(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()

    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    applyDirection(e.clientX - cx, e.clientY - cy)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
    e.preventDefault()

    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    applyDirection(e.clientX - cx, e.clientY - cy)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    e.preventDefault()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    clearMovement()
  }

  return (
    <div
      ref={baseRef}
      className="mobile-joystick"
      style={{
        width: BASE_SIZE,
        height: BASE_SIZE,
        borderRadius: '50%',
        position: 'relative',
        background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(0,0,0,0.18) 100%)',
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.15), inset 0 -3px 8px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.35)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={clearMovement}
      role="presentation"
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          marginLeft: -KNOB_SIZE / 2,
          marginTop: -KNOB_SIZE / 2,
          borderRadius: '50%',
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 100%)',
          border: '2px solid rgba(255,255,255,0.35)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.25), 0 3px 10px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          transition: active ? 'none' : 'transform 0.12s ease-out',
        }}
      />
    </div>
  )
}
