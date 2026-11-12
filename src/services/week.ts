/**
 * Calendar helpers for the routine: the week (Monday to Sunday) around a date, and the "day key" of a
 * task, which is the local calendar date as "YYYY-MM-DD". Pure (no React or Firebase), unit-tested in
 * tests/unit/week.test.mjs. Always local time: toISOString would give the UTC day.
 */

export type WeekDay = {
  /** "YYYY-MM-DD" */
  key: string
  /** "Seg" */
  short: string
  /** Day of the month, "12" */
  date: string
  /** "Segunda-feira" */
  full: string
}

const FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day as "YYYY-MM-DD". */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "YYYY-MM-DD" → that day at local midnight; null when it isn't a real date. */
export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

/** The 7 days, Monday first, of the week that contains `now`. */
export function weekDays(now: Date): WeekDay[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return {
      key: dateKey(day),
      short: SHORT[day.getDay()],
      date: pad(day.getDate()),
      full: FULL[day.getDay()],
    }
  })
}

/** "2026-11-12" → "Quinta-feira, 12/11". */
export function dayLabel(key: string): string {
  const date = parseDateKey(key)
  return date ? `${FULL[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}` : key
}

/** The old fixed-week keys, as days after Monday. */
export const LEGACY_DAY_KEYS: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }

/**
 * Tasks created before the app followed the calendar carry 'mon'…'sun'. Those mean "that day of the
 * week" and are read as that day of the week of `now`; a real date key is returned as it is.
 */
export function resolveDayKey(dayKey: string, now: Date): string {
  const offset = LEGACY_DAY_KEYS[dayKey]
  return offset === undefined ? dayKey : weekDays(now)[offset].key
}

/** Milliseconds from `now` to the next local midnight (when "today" changes). */
export function msUntilMidnight(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
}
