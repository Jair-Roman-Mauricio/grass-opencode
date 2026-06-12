import type { FC, ReactNode } from 'react'

/** Iconos pixel-art SVG para las tiendas (rejilla 32×32, escala nítida). */

type IconProps = { size?: number }

function P({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />
}

function IconFrame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {children}
    </svg>
  )
}

/** Pasto — bolsa de semillas con brote */
export function IconPasto({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={9} y={15} w={14} h={13} fill="#a08050" />
      <P x={10} y={14} w={12} h={14} fill="#d4b896" />
      <P x={11} y={13} w={10} h={2} fill="#e8d4b0" />
      <P x={13} y={11} w={6} h={2} fill="#c4a574" />
      <P x={14} y={9} w={4} h={2} fill="#8b6914" />
      <P x={12} y={24} w={8} h={3} fill="#6d4c2a" />
      <P x={13} y={25} w={6} h={2} fill="#8b5a2b" />
      <P x={15} y={7} w={2} h={5} fill="#388e3c" />
      <P x={13} y={5} w={2} h={3} fill="#4caf50" />
      <P x={17} y={5} w={2} h={3} fill="#4caf50" />
      <P x={14} y={4} w={1} h={2} fill="#81c784" />
      <P x={17} y={4} w={1} h={2} fill="#81c784" />
      <P x={15} y={3} w={2} h={2} fill="#a5d6a7" />
      <P x={10} y={16} w={1} h={10} fill="#8b6914" />
      <P x={21} y={16} w={1} h={10} fill="#6b4f10" />
    </IconFrame>
  )
}

/** Trébol — cuatro hojas */
export function IconTrebol({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={15} y={17} w={2} h={9} fill="#2e7d32" />
      <P x={14} y={24} w={4} h={2} fill="#1b5e20" />
      <P x={9} y={9} w={5} h={5} fill="#43a047" />
      <P x={18} y={9} w={5} h={5} fill="#43a047" />
      <P x={9} y={16} w={5} h={5} fill="#43a047" />
      <P x={18} y={16} w={5} h={5} fill="#43a047" />
      <P x={10} y={10} w={3} h={3} fill="#66bb6a" />
      <P x={19} y={10} w={3} h={3} fill="#66bb6a" />
      <P x={10} y={17} w={3} h={3} fill="#66bb6a" />
      <P x={19} y={17} w={3} h={3} fill="#66bb6a" />
      <P x={13} y={12} w={6} h={6} fill="#388e3c" />
      <P x={14} y={13} w={4} h={4} fill="#2e7d32" />
      <P x={15} y={14} w={2} h={2} fill="#1b5e20" />
    </IconFrame>
  )
}

/** Trigo — espiga dorada */
export function IconTrigo({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={15} y={11} w={2} h={17} fill="#b8960a" />
      <P x={14} y={26} w={4} h={2} fill="#8b6914" />
      <P x={15} y={3} w={2} h={2} fill="#f5e080" />
      <P x={14} y={5} w={4} h={2} fill="#e8c840" />
      <P x={13} y={7} w={2} h={2} fill="#f5d060" />
      <P x={17} y={7} w={2} h={2} fill="#f5d060" />
      <P x={12} y={9} w={2} h={2} fill="#e8c840" />
      <P x={18} y={9} w={2} h={2} fill="#e8c840" />
      <P x={11} y={11} w={2} h={2} fill="#f5d060" />
      <P x={19} y={11} w={2} h={2} fill="#f5d060" />
      <P x={12} y={13} w={2} h={2} fill="#e8c840" />
      <P x={18} y={13} w={2} h={2} fill="#e8c840" />
      <P x={11} y={15} w={2} h={2} fill="#f5d060" />
      <P x={19} y={15} w={2} h={2} fill="#f5d060" />
      <P x={12} y={17} w={2} h={2} fill="#e8c840" />
      <P x={18} y={17} w={2} h={2} fill="#e8c840" />
      <P x={13} y={19} w={2} h={2} fill="#d4a820" />
      <P x={17} y={19} w={2} h={2} fill="#d4a820" />
    </IconFrame>
  )
}

/** Girasol */
export function IconGirasol({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={15} y={19} w={2} h={9} fill="#2e7d32" />
      <P x={14} y={26} w={4} h={2} fill="#1b5e20" />
      <P x={13} y={5} w={6} h={6} fill="#5d4037" />
      <P x={14} y={6} w={4} h={4} fill="#6d4c41" />
      <P x={15} y={7} w={2} h={2} fill="#4e342e" />
      {/* Pétalos */}
      <P x={15} y={3} w={2} h={2} fill="#ffc107" />
      <P x={11} y={5} w={2} h={2} fill="#ffca28" />
      <P x={19} y={5} w={2} h={2} fill="#ffca28" />
      <P x={9} y={8} w={2} h={2} fill="#ffc107" />
      <P x={21} y={8} w={2} h={2} fill="#ffc107" />
      <P x={8} y={11} w={2} h={2} fill="#ffca28" />
      <P x={22} y={11} w={2} h={2} fill="#ffca28" />
      <P x={9} y={14} w={2} h={2} fill="#ffc107" />
      <P x={21} y={14} w={2} h={2} fill="#ffc107" />
      <P x={11} y={16} w={2} h={2} fill="#ffca28" />
      <P x={19} y={16} w={2} h={2} fill="#ffca28" />
      <P x={13} y={17} w={2} h={2} fill="#ffc107" />
      <P x={17} y={17} w={2} h={2} fill="#ffc107" />
      <P x={15} y={17} w={2} h={2} fill="#ffb300" />
    </IconFrame>
  )
}

/** Cannabis — hoja */
export function IconCannabis({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={15} y={15} w={2} h={13} fill="#2e7d32" />
      <P x={14} y={26} w={4} h={2} fill="#1b5e20" />
      <P x={13} y={7} w={6} h={12} fill="#388e3c" />
      <P x={14} y={9} w={4} h={8} fill="#43a047" />
      <P x={15} y={11} w={2} h={4} fill="#66bb6a" />
      {/* Dientes */}
      <P x={8} y={7} w={2} h={2} fill="#4caf50" />
      <P x={10} y={5} w={2} h={2} fill="#66bb6a" />
      <P x={12} y={4} w={2} h={2} fill="#4caf50" />
      <P x={18} y={4} w={2} h={2} fill="#4caf50" />
      <P x={20} y={5} w={2} h={2} fill="#66bb6a" />
      <P x={22} y={7} w={2} h={2} fill="#4caf50" />
      <P x={7} y={11} w={2} h={2} fill="#43a047" />
      <P x={23} y={11} w={2} h={2} fill="#43a047" />
      <P x={8} y={15} w={2} h={2} fill="#4caf50" />
      <P x={22} y={15} w={2} h={2} fill="#4caf50" />
      <P x={9} y={19} w={2} h={2} fill="#43a047" />
      <P x={21} y={19} w={2} h={2} fill="#43a047" />
      <P x={10} y={22} w={2} h={2} fill="#388e3c" />
      <P x={20} y={22} w={2} h={2} fill="#388e3c" />
    </IconFrame>
  )
}

/** Tijera pequeña */
export function IconTijera({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={14} y={13} w={4} h={4} fill="#9e9e9e" />
      <P x={15} y={14} w={2} h={2} fill="#bdbdbd" />
      <P x={10} y={5} w={2} h={9} fill="#bdbdbd" />
      <P x={20} y={5} w={2} h={9} fill="#bdbdbd" />
      <P x={9} y={4} w={2} h={2} fill="#e0e0e0" />
      <P x={21} y={4} w={2} h={2} fill="#e0e0e0" />
      <P x={10} y={3} w={2} h={2} fill="#f5f5f5" />
      <P x={20} y={3} w={2} h={2} fill="#f5f5f5" />
      <P x={7} y={15} w={4} h={3} fill="#c62828" />
      <P x={21} y={15} w={4} h={3} fill="#c62828" />
      <P x={6} y={18} w={3} h={4} fill="#e53935" />
      <P x={23} y={18} w={3} h={4} fill="#e53935" />
      <P x={7} y={22} w={2} h={3} fill="#b71c1c" />
      <P x={23} y={22} w={2} h={3} fill="#b71c1c" />
      <P x={8} y={25} w={2} h={2} fill="#8b0000" />
      <P x={22} y={25} w={2} h={2} fill="#8b0000" />
    </IconFrame>
  )
}

/** Tijeras grandes */
export function IconTijerasGrandes({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={14} y={11} w={4} h={4} fill="#757575" />
      <P x={8} y={3} w={3} h={11} fill="#9e9e9e" />
      <P x={21} y={3} w={3} h={11} fill="#9e9e9e" />
      <P x={8} y={2} w={2} h={2} fill="#e0e0e0" />
      <P x={22} y={2} w={2} h={2} fill="#e0e0e0" />
      <P x={9} y={1} w={2} h={2} fill="#f5f5f5" />
      <P x={21} y={1} w={2} h={2} fill="#f5f5f5" />
      <P x={5} y={13} w={5} h={4} fill="#1565c0" />
      <P x={22} y={13} w={5} h={4} fill="#1565c0" />
      <P x={4} y={17} w={4} h={5} fill="#1976d2" />
      <P x={24} y={17} w={4} h={5} fill="#1976d2" />
      <P x={5} y={22} w={3} h={4} fill="#0d47a1" />
      <P x={24} y={22} w={3} h={4} fill="#0d47a1" />
      <P x={6} y={26} w={2} h={2} fill="#0a3060" />
      <P x={24} y={26} w={2} h={2} fill="#0a3060" />
    </IconFrame>
  )
}

/** Cortadora de mano */
export function IconCortadoraMano({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={9} y={13} w={12} h={9} fill="#424242" />
      <P x={10} y={14} w={10} h={7} fill="#616161" />
      <P x={11} y={15} w={3} h={2} fill="#ff9800" />
      <P x={16} y={15} w={3} h={2} fill="#212121" />
      <P x={14} y={22} w={4} h={6} fill="#5d4037" />
      <P x={15} y={28} w={2} h={2} fill="#3e2723" />
      <P x={5} y={15} w={4} h={4} fill="#9e9e9e" />
      <P x={3} y={13} w={2} h={8} fill="#757575" />
      <P x={1} y={11} w={4} h={12} fill="#bdbdbd" />
      <P x={2} y={12} w={2} h={10} fill="#e0e0e0" />
      <P x={1} y={14} w={1} h={6} fill="#f5f5f5" />
      <P x={19} y={16} w={3} h={2} fill="#212121" />
      <P x={20} y={14} w={2} h={2} fill="#ff5722" />
    </IconFrame>
  )
}

/** Carrito cortadora */
export function IconCarrito({ size = 48 }: IconProps) {
  return (
    <IconFrame size={size}>
      <P x={5} y={13} w={20} h={9} fill="#c62828" />
      <P x={6} y={14} w={18} h={7} fill="#e53935" />
      <P x={7} y={15} w={16} h={5} fill="#ef5350" />
      <P x={9} y={9} w={12} h={5} fill="#37474f" />
      <P x={10} y={10} w={10} h={3} fill="#546e7a" />
      <P x={17} y={11} w={3} h={2} fill="#212121" />
      <P x={4} y={22} w={5} h={5} fill="#212121" />
      <P x={23} y={22} w={5} h={5} fill="#212121" />
      <P x={5} y={23} w={3} h={3} fill="#424242" />
      <P x={24} y={23} w={3} h={3} fill="#424242" />
      <P x={3} y={20} w={2} h={2} fill="#9e9e9e" />
      <P x={27} y={20} w={2} h={2} fill="#9e9e9e" />
      <P x={22} y={7} w={2} h={4} fill="#757575" />
      <P x={23} y={5} w={2} h={2} fill="#9e9e9e" />
      <P x={8} y={16} w={2} h={2} fill="#ffc107" />
    </IconFrame>
  )
}

const ALL_ICONS: Record<string, FC<IconProps>> = {
  pasto: IconPasto,
  trebol: IconTrebol,
  trigo: IconTrigo,
  girasol: IconGirasol,
  cannabis: IconCannabis,
  tijera: IconTijera,
  tijerasGrandes: IconTijerasGrandes,
  cortadoraMano: IconCortadoraMano,
  carrito: IconCarrito,
}

export function ShopPixelIcon({ id, size = 48 }: { id: string; size?: number }) {
  const Icon = ALL_ICONS[id]
  if (!Icon) return null
  return <Icon size={size} />
}

export function hasShopPixelIcon(id: string): boolean {
  return id in ALL_ICONS
}

/** Icono pixel-art con fallback a emoji (hotbar, inventario, tiendas). */
export function ItemPixelIcon({
  id,
  emoji,
  size = 32,
}: {
  id?: string | null
  emoji: string
  size?: number
}) {
  if (id && hasShopPixelIcon(id)) {
    return <ShopPixelIcon id={id} size={size} />
  }
  return (
    <span style={{ fontSize: Math.round(size * 0.5), userSelect: 'none', lineHeight: 1 }}>
      {emoji}
    </span>
  )
}
