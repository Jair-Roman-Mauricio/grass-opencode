// Escenas de la cinemática de introducción — estilo PIXEL-ART RETRO (Papers Please).
// Paleta apagada de "documento antiguo", composición en bloques con bordes nítidos.
// Historia (humor negro): familia que mantener → lo botan por salir con la hija del
// jefe → carta del abuelo (que no lo quería) → noticia de su muerte por deudas →
// hereda la parcela y la deuda.

const C = {
  night: '#0e0f14', wall: '#39404e', wall2: '#2b3038', floor: '#22252d',
  cream: '#d9cfae', cream2: '#c6bb93', paper: '#e7e0c8', ink: '#241f18', line: '#8a8064',
  blue: '#5b6b80', blue2: '#3f4c5e', red: '#b14334', red2: '#7e2d23',
  skin: '#caa078', skin2: '#b08a64', hair: '#3a2a1a', hair2: '#5a3b25',
  shirt: '#5a6675', shirt2: '#445063', green: '#5d7048', gold: '#c8a24a',
  gray: '#6f7681', gray2: '#4a505a', white: '#e8e3d6', dress: '#9c5a6a',
}

const VB = '0 0 320 200'

function Frame({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <svg viewBox={VB} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges" style={{ display: 'block', imageRendering: 'pixelated' }}>
      <rect x={0} y={0} width={320} height={200} fill={bg} />
      {children}
    </svg>
  )
}

// rect corto
function R({ x, y, w, h, f }: { x: number; y: number; w: number; h: number; f: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={f} />
}

/** Figura humana pixel sencilla y reutilizable. */
function Pix({ x, y, s = 1, skin = C.skin, hair = C.hair, shirt = C.shirt, eyes = true }: {
  x: number; y: number; s?: number; skin?: string; hair?: string; shirt?: string; eyes?: boolean
}) {
  const u = 3 * s
  const p = (cx: number, cy: number, w: number, h: number, f: string) =>
    <rect x={x + cx * u} y={y + cy * u} width={w * u} height={h * u} fill={f} />
  return (
    <g>
      {p(0, 0, 5, 1, hair)}
      {p(0, 1, 5, 3, skin)}
      {eyes && p(1, 2, 1, 1, C.ink)}
      {eyes && p(3, 2, 1, 1, C.ink)}
      {p(0, 4, 5, 5, shirt)}
      {p(-1, 4, 1, 4, shirt)}
      {p(5, 4, 1, 4, shirt)}
      {p(1, 9, 1, 3, C.gray2)}
      {p(3, 9, 1, 3, C.gray2)}
    </g>
  )
}

// 1 — La familia (apartamento humilde)
function SceneFamily() {
  return (
    <Frame bg={C.wall2}>
      <R x={0} y={150} w={320} h={50} f={C.floor} />
      {/* ventana con noche */}
      <R x={210} y={28} w={80} h={64} f={C.night} />
      <R x={210} y={28} w={80} h={4} f={C.gray2} />
      <R x={246} y={28} w={4} h={64} f={C.gray2} />
      <R x={222} y={42} w={4} h={4} f={C.gold} />
      <R x={262} y={58} w={4} h={4} f={C.gold} />
      {/* mesa */}
      <R x={120} y={120} w={120} h={10} f={C.hair2} />
      <R x={128} y={130} w={8} h={22} f={C.hair} />
      <R x={224} y={130} w={8} h={22} f={C.hair} />
      <R x={150} y={108} w={16} h={12} f={C.cream} />
      {/* familia */}
      <Pix x={150} y={70} s={1.5} shirt={C.shirt} />
      <Pix x={196} y={74} s={1.4} shirt={C.dress} hair={C.hair2} />
      <Pix x={236} y={104} s={0.9} shirt={C.red} />
      {/* lámpara pobre */}
      <R x={60} y={20} w={4} h={70} f={C.gray2} />
      <R x={50} y={14} w={24} h={10} f={C.gold} />
    </Frame>
  )
}

// 2 — La oficina gris
function SceneOffice() {
  return (
    <Frame bg={C.gray} >
      <R x={0} y={150} w={320} h={50} f={C.gray2} />
      {/* mamparas de cubículo */}
      <R x={40} y={50} w={240} h={104} f="#aeb2a8" />
      <R x={40} y={50} w={240} h={10} f="#969a90" />
      <R x={158} y={50} w={4} h={104} f="#888c82" />
      {/* monitor */}
      <R x={188} y={92} w={64} h={44} f={C.ink} />
      <R x={196} y={100} w={48} h={28} f={C.blue2} />
      <R x={214} y={136} w={12} h={10} f={C.ink} />
      {/* escritorio */}
      <R x={170} y={148} w={120} h={8} f={C.hair2} />
      {/* trabajador hundido */}
      <Pix x={96} y={96} s={1.5} shirt={C.shirt2} />
      {/* reloj */}
      <R x={70} y={70} w={26} h={26} f={C.cream} />
      <R x={82} y={74} w={2} h={10} f={C.ink} />
      <R x={82} y={82} w={9} h={2} f={C.ink} />
    </Frame>
  )
}

// 3 — La hija del jefe (cómico)
function SceneBossDaughter() {
  return (
    <Frame bg="#46394a">
      <R x={0} y={150} w={320} h={50} f="#2f2636" />
      {/* corazón pixel */}
      <g>
        <R x={150} y={36} w={6} h={6} f={C.red} />
        <R x={164} y={36} w={6} h={6} f={C.red} />
        <R x={144} y={42} w={32} h={6} f={C.red} />
        <R x={150} y={48} w={20} h={6} f={C.red} />
        <R x={156} y={54} w={8} h={6} f={C.red} />
      </g>
      {/* pareja */}
      <Pix x={108} y={86} s={1.6} shirt={C.shirt} />
      <Pix x={170} y={86} s={1.6} shirt={C.dress} hair={C.hair2} />
      {/* sombra del jefe en la puerta (asomándose, furioso) */}
      <R x={272} y={30} w={48} h={150} f="#1c1622" />
      <Pix x={282} y={70} s={1.7} skin="#1c1622" hair="#120d16" shirt="#120d16" eyes={false} />
      <R x={286} y={96} w={4} h={4} f={C.red} />
      <R x={300} y={96} w={4} h={4} f={C.red} />
    </Frame>
  )
}

// 4 — El despido
function SceneFired() {
  return (
    <Frame bg="#cdc9bd">
      <R x={0} y={150} w={320} h={50} f="#b3afa2" />
      {/* puerta SALIDA */}
      <R x={16} y={56} w={56} h={98} f={C.hair2} />
      <R x={62} y={104} w={6} h={6} f={C.gold} />
      {/* jefe señalando la puerta */}
      <Pix x={228} y={80} s={1.7} shirt={C.shirt2} hair="#222" />
      <R x={196} y={96} w={36} h={6} f={C.shirt2} />
      {/* protagonista con caja de cartón */}
      <Pix x={120} y={86} s={1.6} shirt={C.shirt} />
      <R x={112} y={112} w={34} h={22} f="#c79a5e" />
      <R x={112} y={112} w={34} h={3} f="#a87f44" />
      {/* sello DESPEDIDO */}
      <g transform="rotate(-8 160 50)">
        <R x={108} y={34} w={104} h={28} f="none" />
        <rect x={108} y={34} width={104} height={28} fill="none" stroke={C.red} strokeWidth={4} />
        <text x={160} y={54} textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="20" fill={C.red}>DESPEDIDO</text>
      </g>
    </Frame>
  )
}

// 5 — La carta del abuelo (sobre estilo Papers Please)
function SceneLetter() {
  return (
    <Frame bg={C.night}>
      {/* sobre */}
      <R x={70} y={66} w={180} h={108} f={C.cream2} />
      <R x={70} y={66} w={180} h={6} f={C.line} />
      {/* solapa abierta arriba */}
      <path d="M70 66 L160 30 L250 66 Z" fill={C.cream} stroke={C.ink} strokeWidth={2} />
      {/* carta saliendo */}
      <R x={92} y={48} w={136} h={70} f={C.paper} />
      <R x={102} y={62} w={116} h={3} f={C.line} />
      <R x={102} y={72} w={96} h={3} f={C.line} />
      <R x={102} y={82} w={108} h={3} f={C.line} />
      <R x={102} y={92} w={70} h={3} f={C.line} />
      {/* aspas del sobre */}
      <path d="M70 72 L160 120 L250 72" fill="none" stroke={C.ink} strokeWidth={2} />
      {/* sello de cera */}
      <circle cx={160} cy={150} r={14} fill={C.red2} />
      <circle cx={160} cy={150} r={9} fill="none" stroke={C.red} strokeWidth={2} />
      <text x={160} y={155} textAnchor="middle" fontFamily="serif" fontWeight="800" fontSize="12" fill={C.gold}>A</text>
    </Frame>
  )
}

// 6 — La oferta (carta abierta + parcela) — aceptar
function SceneOffer() {
  return (
    <Frame bg="#1a1c22">
      {/* carta grande */}
      <R x={40} y={30} w={170} h={140} f={C.paper} />
      <R x={40} y={30} w={170} h={4} f={C.line} />
      <text x={56} y={56} fontFamily="monospace" fontSize="13" fill={C.ink}>Querido nieto:</text>
      <R x={56} y={70} w={140} h={3} f={C.line} />
      <R x={56} y={80} w={120} h={3} f={C.line} />
      <R x={56} y={90} w={138} h={3} f={C.line} />
      <R x={56} y={100} w={96} h={3} f={C.line} />
      <text x={56} y={128} fontFamily="monospace" fontSize="12" fill={C.red2}>Hay trabajo. Ven.</text>
      {/* miniatura de la parcela/granero */}
      <R x={232} y={96} w={64} h={44} f={C.green} />
      <R x={244} y={70} w={40} h={28} f={C.red2} />
      <path d="M240 70 L264 52 L288 70 Z" fill="#5a221a" />
      <R x={258} y={80} w={12} h={18} f="#3a1a14" />
      {/* sello ACEPTAR */}
      <g transform="rotate(6 250 160)">
        <rect x={210} y={148} width={84} height={24} fill="none" stroke={C.green} strokeWidth={3} />
        <text x={252} y={165} textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="16" fill={C.green}>ACEPTAR</text>
      </g>
    </Frame>
  )
}

// 7 — La noticia (portada de periódico)
function SceneNewspaper() {
  return (
    <Frame bg="#15140f">
      <R x={22} y={14} w={276} h={172} f={C.paper} />
      <R x={22} y={14} w={276} h={172} f="none" />
      {/* cabecera */}
      <text x={160} y={40} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="22" fill={C.ink}>El Clarín del Campo</text>
      <R x={34} y={48} w={252} h={2} f={C.ink} />
      <text x={36} y={62} fontFamily="monospace" fontSize="8" fill={C.gray2}>EDICIÓN RURAL · PRECIO: UNA DEUDA</text>
      {/* titular */}
      <text x={36} y={86} fontFamily="Georgia, serif" fontWeight="800" fontSize="15" fill={C.ink}>MATONES MATAN A ANCIANO</text>
      <text x={36} y={104} fontFamily="Georgia, serif" fontWeight="800" fontSize="15" fill={C.ink}>POR DEUDAS IMPAGAS</text>
      {/* foto */}
      <R x={36} y={116} w={70} h={56} f={C.gray} />
      <Pix x={56} y={126} s={1.2} skin={C.gray2} hair="#3a3a3a" shirt="#55585f" />
      <R x={36} y={116} w={70} h={2} f={C.ink} />
      {/* columnas de texto */}
      {[0, 1, 2, 3, 4, 5].map((i) => <R key={'a' + i} x={116} y={120 + i * 9} w={80} h={3} f={C.line} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <R key={'b' + i} x={206} y={120 + i * 9} w={78} h={3} f={C.line} />)}
      <text x={116} y={114} fontFamily="Georgia, serif" fontSize="9" fill={C.ink}>"No tenía con qué pagar", dicen.</text>
    </Frame>
  )
}

// 8 — La trampa / llegada a la parcela
function SceneArrival() {
  return (
    <Frame bg="#caa15a">
      <R x={0} y={132} w={320} h={68} f={C.green} />
      <R x={0} y={120} w={320} h={12} f="#6f8456" />
      {/* sol apagado */}
      <R x={250} y={26} w={34} h={34} f={C.gold} />
      {/* granero */}
      <R x={40} y={92} w={70} h={44} f={C.red2} />
      <path d="M36 92 L75 64 L114 92 Z" fill="#5a221a" />
      <R x={64} y={108} w={20} h={28} f="#3a1a14" />
      {/* protagonista pequeño mirando */}
      <Pix x={170} y={104} s={1.4} shirt={C.shirt} />
      {/* cartel: DEUDA HEREDADA */}
      <R x={214} y={84} w={6} h={52} f={C.hair2} />
      <R x={196} y={70} w={86} h={26} f={C.cream} />
      <rect x={196} y={70} width={86} height={26} fill="none" stroke={C.ink} strokeWidth={2} />
      <text x={239} y={82} textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="9" fill={C.red2}>DEUDA</text>
      <text x={239} y={92} textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="9" fill={C.red2}>HEREDADA</text>
      {/* matas de pasto */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <R key={i} x={20 + i * 40} y={150} w={4} h={10} f="#4a5e38" />
      ))}
    </Frame>
  )
}

export interface IntroPanel {
  caption: string
  Scene: () => JSX.Element
  /** Paneles con remate fuerte → suena un stinger (suave) al aparecer. */
  stinger?: boolean
}

export const INTRO_PANELS: IntroPanel[] = [
  { caption: 'Tenías una esposa, un hijo y una suegra. Y un sueldo que no daba para los cuatro.', Scene: SceneFamily },
  { caption: 'En la oficina hacías lo justo para que nadie notara que seguías vivo.', Scene: SceneOffice },
  { caption: 'Hasta que te enamoraste. De la persona equivocada: la hija del jefe.', Scene: SceneBossDaughter, stinger: true },
  { caption: 'El lunes te «reorganizaron». Fuera de la empresa… y de su árbol genealógico.', Scene: SceneFired, stinger: true },
  { caption: 'Sin empleo y con bocas que alimentar, llegó una carta. De tu abuelo, que jamás te quiso.', Scene: SceneLetter },
  { caption: 'Te ofrecía trabajo en su parcela del campo. Demasiado bueno para ser verdad. Aceptaste.', Scene: SceneOffer },
  { caption: 'Días después, una noticia: unos matones mataron a un anciano por no pagar sus deudas. Tu abuelo. Qué casualidad.', Scene: SceneNewspaper, stinger: true },
  { caption: 'Heredaste su parcela… y sus deudas. El abuelo cumplió: te consiguió un trabajo. Pagar lo que él debía. Bienvenido a casa.', Scene: SceneArrival, stinger: true },
]
