import type { Debt } from './types'
import { FAMILY } from './constants'

// Gastos esenciales del hogar: cada uno protege a un familiar. Si lo dejas
// impago, ese familiar acaba MAL. El orden corresponde a FAMILY.
const ESSENTIALS = [
  { name: 'ALQUILER', base: 22, slope: 7 },     // Esposa
  { name: 'COMIDA', base: 18, slope: 6 },        // Hijo
  { name: 'CALEFACCIÓN', base: 14, slope: 5 },   // Suegra
]

// La deuda heredada del abuelo: no protege a nadie, pero el cobrador la cuenta.
const ABUELO = { name: 'DEUDA DEL ABUELO', base: 26, slope: 9 }

/**
 * Genera las 4 cuentas del día (3 esenciales + la deuda del abuelo), escalando con el día.
 * Las 3 esenciales se reparten (round-robin) entre los familiares VIVOS: si uno muere, sus
 * cuentas pasan a sostener a los vivos; si queda uno solo, las 3 van a él (mantiene la dificultad).
 */
export function generateDailyBills(day: number, living: string[]): Debt[] {
  const v = (n: number) => Math.max(1, Math.round(n * (0.92 + ((day * n) % 6) / 25)))
  const pool = living.length > 0 ? living : FAMILY
  const bills: Debt[] = ESSENTIALS.map((e, i) => ({
    name: e.name,
    amount: v(e.base + e.slope * (day - 1)),
    paid: false,
    member: pool[i % pool.length],
  }))
  bills.push({
    name: ABUELO.name,
    amount: v(ABUELO.base + ABUELO.slope * (day - 1)),
    paid: false,
    member: '',
  })
  return bills
}

/** Suma de las 3 cuentas más baratas (mínimo inevitable para sobrevivir). */
export function minDebtTotal(bills: Debt[]): number {
  return [...bills]
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 3)
    .reduce((s, d) => s + d.amount, 0)
}

export function paidCount(bills: Debt[]): number {
  return bills.filter((d) => d.paid).length
}

/** La deuda del abuelo (sin familiar) — OBLIGATORIA. */
export function abueloDebt(bills: Debt[]): Debt | undefined {
  return bills.find((d) => d.member === '')
}

/** Regla: hay que pagar la DEUDA DEL ABUELO y al menos `min` cuentas en total. */
export function isMandatoryMet(bills: Debt[], min: number): boolean {
  const ab = abueloDebt(bills)
  return (!ab || ab.paid) && paidCount(bills) >= min
}

/**
 * Plan de rescate con ahorros: marca como pagadas las cuentas mínimas que faltan
 * para cumplir la regla (el abuelo si está impago + las esenciales más baratas hasta
 * llegar a `min`) y devuelve el coste total. No muta el array original.
 */
export function rescuePlan(bills: Debt[], min: number): { cost: number; bills: Debt[] } {
  const out = bills.map((d) => ({ ...d }))
  let cost = 0
  const ab = out.find((d) => d.member === '')
  if (ab && !ab.paid) { ab.paid = true; cost += ab.amount }
  let pc = out.filter((d) => d.paid).length
  if (pc < min) {
    const cheapest = out.filter((d) => d.member !== '' && !d.paid).sort((a, b) => a.amount - b.amount)
    for (const d of cheapest) {
      if (pc >= min) break
      d.paid = true
      cost += d.amount
      pc++
    }
  }
  return { cost, bills: out }
}

export function totalPaid(bills: Debt[]): number {
  return bills.filter((d) => d.paid).reduce((s, d) => s + d.amount, 0)
}
