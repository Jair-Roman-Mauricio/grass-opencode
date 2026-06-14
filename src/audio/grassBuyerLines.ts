export interface GrassBuyerLine {
  id: string
  /** Texto hablado (inglés, voz del comprador). */
  voice: string
  /** Subtítulo en pantalla (español). */
  subtitle: string
}

export const GRASS_BUYER_LINES: GrassBuyerLine[] = [
  {
    id: 'line-01',
    voice: 'Oh brother! Your grass is top shelf stuff!',
    subtitle: '¡Hermano, tu pasto es de primera calidad!',
  },
  {
    id: 'line-02',
    voice: 'This batch could fertilize a cemetery! I love it!',
    subtitle: '¡Este lote podría fertilizar un cementerio! Me encanta.',
  },
  {
    id: 'line-03',
    voice: 'Keep bringing this and we will both stay out of trouble!',
    subtitle: '¡Sigue trayendo así y los dos nos mantendremos fuera de problemas!',
  },
  {
    id: 'line-04',
    voice: 'My customers will not ask where it came from! Smart grass!',
    subtitle: '¡Mis clientes no preguntarán de dónde salió! Pasto inteligente.',
  },
  {
    id: 'line-05',
    voice: 'Brother! This grass has more life than my last three marriages!',
    subtitle: '¡Hermano! Este pasto tiene más vida que mis últimos tres matrimonios.',
  },
  {
    id: 'line-06',
    voice: 'You cut it fresh! I sell it fresher! Everybody wins!',
    subtitle: '¡Tú lo cortas fresco! ¡Yo lo vendo más fresco! Todos ganan.',
  },
  {
    id: 'line-07',
    voice: 'If the cops ask, I never met you! If they do not, same deal!',
    subtitle: '¡Si preguntan los policías, nunca te conocí! Si no, igual.',
  },
  {
    id: 'line-08',
    voice: 'Quality like this could raise the dead! Please do not test that!',
    subtitle: '¡Una calidad así podría resucitar muertos! Por favor, no lo compruebes.',
  },
]
