import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { getCurrentTool, getSeedDef } from '../game/economy'
import { CharacterPreview, type PreviewHeldItem } from '../renderers/webgl/CharacterPreview'
import type { SeedId } from '../game/types'

const SEED_IDS: SeedId[] = ['pasto', 'trebol', 'trigo', 'girasol', 'cannabis']

function resolveHeldItem(activeSlot: number, state: ReturnType<typeof useGameStore.getState>['state']): PreviewHeldItem {
  if (activeSlot === 0) {
    const tool = getCurrentTool(state)
    return { kind: 'tool', toolId: tool.id }
  }
  if (activeSlot >= 1 && activeSlot <= 5) {
    const seedId = SEED_IDS[activeSlot - 1]
    const def = getSeedDef(seedId)
    if (def.tier <= state.seedTierUnlocked) {
      return { kind: 'seed', icon: def.icon }
    }
  }
  return { kind: 'none' }
}

export function InventoryCharacterPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<CharacterPreview | null>(null)
  const activeSlot = useGameStore((s) => s.activeSlot)
  const state = useGameStore((s) => s.state)
  const showInventory = useGameStore((s) => s.showInventory)

  useEffect(() => {
    if (!showInventory || !canvasRef.current) return

    const canvas = canvasRef.current
    const preview = new CharacterPreview(canvas)
    preview.setHeldItem(resolveHeldItem(activeSlot, state))
    previewRef.current = preview

    const ro = new ResizeObserver(() => {
      preview.resize(canvas.clientWidth, canvas.clientHeight)
    })
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      preview.dispose()
      previewRef.current = null
    }
  }, [showInventory])

  useEffect(() => {
    previewRef.current?.setHeldItem(resolveHeldItem(activeSlot, state))
  }, [activeSlot, state.tool, state.seedTierUnlocked])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        borderRadius: 6,
      }}
    />
  )
}
