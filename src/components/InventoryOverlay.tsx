import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getSeedDef, getCurrentTool } from '../game/economy'
import { formatNum } from '../utils/utils'
import type { SeedId } from '../game/types'
import { InventoryCharacterPreview } from './InventoryCharacterPreview'
import { ItemPixelIcon } from './shop/ShopPixelIcons'

/* ── Stardew Valley-inspired styling constants ── */
const WOOD_DARK = '#5d2c00'
const WOOD_MID = '#b15e1a'
const WOOD_LIGHT = '#d4883a'
const CREAM = '#f8d6a4'
const LIGHT_CREAM = '#fcf1c7'
const SLOT_BORDER = '#b08050'
const SELECTED_BORDER = '#e63b2e'
const PIXEL_FONT = "'VT323', monospace"

const SEED_IDS: SeedId[] = ['pasto', 'trebol', 'trigo', 'girasol', 'cannabis']

/** Pestañas del panel de inventario. Añade más módulos aquí en el futuro. */
type InventoryPanelTabId = 'inventory'

interface InventoryPanelTab {
  id: InventoryPanelTabId
  icon: string
  label: string
  enabled: boolean
}

const INVENTORY_PANEL_TABS: InventoryPanelTab[] = [
  { id: 'inventory', icon: '🎒', label: 'Inventario', enabled: true },
  // Futuro: { id: 'map', icon: '🗺️', label: 'Mapa', enabled: false },
  // Futuro: { id: 'crafting', icon: '🔨', label: 'Crafting', enabled: false },
]

const EQUIPMENT_SLOTS = [
  { id: 'hat', label: 'Sombrero', icon: '👒', position: 'top' as const },
  { id: 'ring1', label: 'Anillo', icon: '💍', position: 'left' as const },
  { id: 'ring2', label: 'Anillo', icon: '💍', position: 'left' as const },
  { id: 'boots', label: 'Botas', icon: '👢', position: 'left' as const },
  { id: 'shirt', label: 'Camisa', icon: '👕', position: 'right' as const },
  { id: 'pants', label: 'Pantalón', icon: '👖', position: 'right' as const },
]

export function InventoryOverlay() {
  const showInventory = useGameStore((s) => s.showInventory)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const activeSlot = useGameStore((s) => s.activeSlot)
  const setActiveSlot = useGameStore((s) => s.setActiveSlot)
  const state = useGameStore((s) => s.state)

  const tool = getCurrentTool(state)
  const seedIds: SeedId[] = ['pasto', 'trebol', 'trigo', 'girasol', 'cannabis']

  // Detect scroll wheel to change active hotbar slot
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Ignore if inventory modal is open so they can scroll inside details if needed
      if (showInventory) return
      const s = useGameStore.getState()
      const direction = e.deltaY > 0 ? 1 : -1
      // Cycle between slots 0 to 5
      let nextSlot = (s.activeSlot + direction) % 6
      if (nextSlot < 0) nextSlot = 5
      s.setActiveSlot(nextSlot)
    };
    window.addEventListener('wheel', handleWheel)
    return () => window.removeEventListener('wheel', handleWheel)
  }, [showInventory])

  // Get active item name
  let activeItemName = ''
  let activeItemDesc = ''
  if (activeSlot === 0) {
    activeItemName = tool.name
    activeItemDesc = 'Herramienta para cortar y cosechar pasto.'
  } else if (activeSlot >= 1 && activeSlot <= 5) {
    const sId = seedIds[activeSlot - 1]
    const def = getSeedDef(sId)
    const count = state.seeds[sId] ?? 0
    if (def.tier <= state.seedTierUnlocked) {
      activeItemName = `${def.name} (x${count})`
      activeItemDesc = `Semilla de ${def.name}. Crece en ${def.growSeconds}s. Valor: $${def.sellValue}.`
    } else {
      activeItemName = 'Slot Bloqueado'
      activeItemDesc = 'Desbloquea este tipo de semilla en la tienda primero.'
    }
  }

  // Calculate Farmer Level based on tool and day
  const farmerLevel = 1 + state.tool * 3 + Math.min(20, Math.floor(state.day / 2))

  return (
    <>
      {/* ── ON-SCREEN HOTBAR (Bottom Center) ── */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'auto',
        zIndex: 10,
      }}>
        {/* Hotbar Frame */}
        <div style={{
          display: 'flex',
          background: `linear-gradient(180deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 45%, ${WOOD_DARK} 100%)`,
          border: `4px solid ${WOOD_DARK}`,
          borderRadius: 8,
          padding: '4px 6px',
          gap: 6,
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.6)',
        }}>
          {Array.from({ length: 12 }).map((_, idx) => {
            const isSelected = activeSlot === idx
            const isToolSlot = idx === 0
            const isSeedSlot = idx >= 1 && idx <= 5
            const seedId = isSeedSlot ? seedIds[idx - 1] : null
            const seedDef = seedId ? getSeedDef(seedId) : null
            const isUnlocked = isToolSlot || (seedDef && seedDef.tier <= state.seedTierUnlocked)
            const count = seedId ? (state.seeds[seedId] ?? 0) : 0

            // Determine hotbar keys (1, 2, 3, 4, 5, 6, 7, 8, 9, 0, -, =)
            const keyLabel = idx < 9 ? `${idx + 1}` : idx === 9 ? '0' : idx === 10 ? '-' : '='

            return (
              <div
                key={idx}
                onClick={() => isUnlocked && setActiveSlot(idx)}
                style={{
                  width: 48,
                  height: 48,
                  background: isSelected ? '#fff6d1' : LIGHT_CREAM,
                  border: isSelected ? `4px solid ${SELECTED_BORDER}` : `2px solid ${SLOT_BORDER}`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: isUnlocked ? 'pointer' : 'default',
                  opacity: (isSeedSlot && !isUnlocked) ? 0.4 : 1,
                  boxShadow: isSelected 
                    ? '0 0 8px rgba(230, 59, 46, 0.6), inset 0 2px 4px rgba(0,0,0,0.1)' 
                    : 'inset 0 2px 4px rgba(0,0,0,0.15)',
                  imageRendering: 'pixelated',
                  transition: 'border-color 0.1s, background-color 0.1s',
                }}
              >
                {/* Hotbar Key Label */}
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: 3,
                  fontSize: 12,
                  fontFamily: PIXEL_FONT,
                  fontWeight: 'bold',
                  color: '#8b5a2b',
                  lineHeight: 1,
                }}>
                  {keyLabel}
                </span>

                {/* Slot Content */}
                {isToolSlot && (
                  <ItemPixelIcon id={tool.id} emoji={tool.icon} size={32} />
                )}

                {isSeedSlot && isUnlocked && seedId && seedDef && (
                  <ItemPixelIcon id={seedId} emoji={seedDef.icon} size={32} />
                )}

                {/* Seed count */}
                {isSeedSlot && isUnlocked && count > 0 && (
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: 16,
                    fontFamily: PIXEL_FONT,
                    fontWeight: 'bold',
                    color: '#333',
                    textShadow: '1px 1px 0 #fff',
                    lineHeight: 1,
                  }}>
                    {count}
                  </span>
                )}

                {/* Locked indicator */}
                {isSeedSlot && !isUnlocked && (
                  <span style={{ fontSize: 16, color: '#999', opacity: 0.7 }}>🔒</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Item Label */}
        {activeItemName && (
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 14,
            fontFamily: PIXEL_FONT,
            letterSpacing: 0.5,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.15s ease-out',
            textAlign: 'center',
            maxWidth: 240,
          }}>
            <div style={{ fontWeight: 'bold', color: CREAM }}>{activeItemName}</div>
            <div style={{ fontSize: 11, color: '#ddd', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeItemDesc}
            </div>
          </div>
        )}
      </div>

      {/* ── EXPANDED INVENTORY MODAL (Tab Overlay) ── */}
      {showInventory && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          pointerEvents: 'auto',
          backdropFilter: 'blur(4px)',
        }}>
          {/* Modal Container */}
          <div className="modal-content" style={{
            width: 720,
            background: `linear-gradient(135deg, ${WOOD_LIGHT} 0%, ${WOOD_MID} 50%, ${WOOD_DARK} 100%)`,
            border: `5px solid ${WOOD_DARK}`,
            borderRadius: 12,
            boxShadow: '0 12px 36px rgba(0,0,0,0.8), inset 0 3px 0 rgba(255,255,255,0.4)',
            padding: '8px 12px 14px 12px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Pestañas modulares (solo inventario activo por ahora) */}
            <div style={{
              display: 'flex',
              gap: 4,
              marginTop: -38,
              paddingLeft: 8,
              marginBottom: 10,
            }}>
              {INVENTORY_PANEL_TABS.filter((t) => t.enabled).map((tab) => (
                <div
                  key={tab.id}
                  style={{
                    background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
                    border: `3px solid ${WOOD_DARK}`,
                    borderBottom: 'none',
                    borderRadius: '8px 8px 0 0',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6)',
                    zIndex: 2,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  <span style={{ fontFamily: PIXEL_FONT, fontSize: 16, fontWeight: 'bold', color: WOOD_DARK }}>
                    {tab.label}
                  </span>
                </div>
              ))}

              <div style={{ flex: 1 }} />

              {/* Close Button */}
              <button
                onClick={toggleInventory}
                style={{
                  background: 'linear-gradient(180deg, #ff6b6b 0%, #d63031 100%)',
                  border: `3px solid ${WOOD_DARK}`,
                  borderRadius: '8px 8px 0 0',
                  padding: '4px 12px',
                  color: '#fff',
                  fontFamily: PIXEL_FONT,
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Main Inner Plaque */}
            <div style={{
              background: `linear-gradient(180deg, ${CREAM} 0%, #e8c88a 100%)`,
              border: `4px solid ${WOOD_DARK}`,
              borderRadius: 8,
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.15)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              {/* ── GRID OF 36 SLOTS (3 rows of 12) ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 6,
                padding: 10,
                background: '#d4af75',
                border: `3px solid ${WOOD_DARK}`,
                borderRadius: 6,
                boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.3)',
              }}>
                {Array.from({ length: 36 }).map((_, idx) => {
                  const isHotbar = idx < 12
                  const isToolSlot = idx === 0
                  const isSeedSlot = idx >= 1 && idx <= 5
                  const seedId = isSeedSlot ? seedIds[idx - 1] : null
                  const seedDef = seedId ? getSeedDef(seedId) : null
                  const isUnlocked = isToolSlot || (seedDef && seedDef.tier <= state.seedTierUnlocked)
                  const count = seedId ? (state.seeds[seedId] ?? 0) : 0

                  return (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: '1',
                        background: isHotbar ? LIGHT_CREAM : '#edd4a2',
                        border: `2px solid ${SLOT_BORDER}`,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                        opacity: (isSeedSlot && !isUnlocked) ? 0.3 : 1,
                      }}
                    >
                      {/* Slot index label for Row 1 */}
                      {isHotbar && (
                        <span style={{
                          position: 'absolute',
                          top: 1,
                          left: 2,
                          fontSize: 10,
                          fontFamily: PIXEL_FONT,
                          color: '#8b5a2b',
                        }}>
                          {idx < 9 ? `${idx + 1}` : idx === 9 ? '0' : idx === 10 ? '-' : '='}
                        </span>
                      )}

                      {/* Content */}
                      {isToolSlot && (
                        <ItemPixelIcon id={tool.id} emoji={tool.icon} size={28} />
                      )}

                      {isSeedSlot && isUnlocked && seedId && seedDef && (
                        <ItemPixelIcon id={seedId} emoji={seedDef.icon} size={28} />
                      )}

                      {/* Count */}
                      {isSeedSlot && isUnlocked && count > 0 && (
                        <span style={{
                          position: 'absolute',
                          bottom: 1,
                          right: 3,
                          fontSize: 14,
                          fontFamily: PIXEL_FONT,
                          fontWeight: 'bold',
                          color: '#333',
                          textShadow: '1px 1px 0 #fff',
                        }}>
                          {count}
                        </span>
                      )}

                      {/* Locked */}
                      {isSeedSlot && !isUnlocked && (
                        <span style={{ fontSize: 12, opacity: 0.5 }}>🔒</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── LOWER PANEL (Left Character / Right Info + trash) ── */}
              <div style={{
                display: 'flex',
                gap: 16,
              }}>
                {/* Personaje 3D + equipamiento */}
                <div style={{
                  width: 280,
                  background: '#d4af75',
                  border: `3px solid ${WOOD_DARK}`,
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr 52px',
                    gridTemplateRows: '52px 1fr auto',
                    gap: 8,
                    alignItems: 'center',
                  }}>
                    {/* Sombrero (arriba) */}
                    <div style={{ gridColumn: 2, justifySelf: 'center' }}>
                      <EquipSlot slot={EQUIPMENT_SLOTS[0]} />
                    </div>

                    {/* Izquierda: anillos + botas */}
                    <div style={{
                      gridColumn: 1,
                      gridRow: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center',
                    }}>
                      <EquipSlot slot={EQUIPMENT_SLOTS[1]} />
                      <EquipSlot slot={EQUIPMENT_SLOTS[2]} />
                      <EquipSlot slot={EQUIPMENT_SLOTS[3]} />
                    </div>

                    {/* Vista 3D del personaje */}
                    <div style={{
                      gridColumn: 2,
                      gridRow: 2,
                      height: 168,
                      background: 'linear-gradient(180deg, #87ceeb 0%, #b8e0f0 55%, #8b7355 100%)',
                      border: `3px solid ${WOOD_DARK}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.2)',
                    }}>
                      <InventoryCharacterPreview />
                    </div>

                    {/* Derecha: ropa */}
                    <div style={{
                      gridColumn: 3,
                      gridRow: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center',
                    }}>
                      <EquipSlot slot={EQUIPMENT_SLOTS[4]} />
                      <EquipSlot slot={EQUIPMENT_SLOTS[5]} />
                    </div>

                    {/* Nombre */}
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      fontFamily: PIXEL_FONT,
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: WOOD_DARK,
                      paddingTop: 4,
                    }}>
                      Granjero Wiki
                    </div>
                  </div>
                </div>

                {/* Character Details & Money */}
                <div style={{
                  flex: 1,
                  background: '#d4af75',
                  border: `3px solid ${WOOD_DARK}`,
                  borderRadius: 6,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: WOOD_DARK,
                    borderBottom: `2px solid ${WOOD_MID}55`,
                    paddingBottom: 4,
                  }}>
                    Granja de la Parcela
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: PIXEL_FONT, fontSize: 18, color: '#333' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Fondos actuales:</span>
                      <span style={{ fontWeight: 'bold', color: '#1b5e20' }}>{formatNum(state.money)} G</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Beneficio total:</span>
                      <span style={{ fontWeight: 'bold', color: WOOD_MID }}>{formatNum(state.stats.totalEarned)} G</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${WOOD_MID}33`, paddingTop: 4, marginTop: 4 }}>
                      <span>Profesión:</span>
                      <span style={{ color: '#8b5a2b', fontWeight: 'bold' }}>Nivel {farmerLevel} Granjero</span>
                    </div>
                  </div>
                </div>

                {/* Trash Can & Exit Button Container */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  width: 50,
                }}>
                  {/* Trash Can */}
                  <div style={{
                    width: 48,
                    height: 48,
                    background: '#edd4a2',
                    border: `2px solid ${WOOD_DARK}`,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                  }} title="Tacho de basura (Arrastrar aquí para tirar)"
                    onClick={() => useGameStore.getState().showMessage('¡No tires tus herramientas!')}
                  >
                    🗑️
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EquipSlot({ slot }: { slot: typeof EQUIPMENT_SLOTS[number] }) {
  return (
    <div
      title={slot.label}
      style={{
        width: 48,
        height: 48,
        background: `linear-gradient(180deg, ${LIGHT_CREAM} 0%, #e8c88a 100%)`,
        border: `3px solid ${WOOD_DARK}`,
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.15)',
        cursor: 'default',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, opacity: 0.35 }}>{slot.icon}</span>
      <span style={{
        fontFamily: PIXEL_FONT,
        fontSize: 9,
        color: WOOD_MID,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        lineHeight: 1,
      }}>
        {slot.label}
      </span>
    </div>
  )
}
