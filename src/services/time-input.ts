/**
 * Typing a time ("HH:MM") by hand. Pure, unit-tested in tests/unit/time-input.test.mjs.
 * The field is a fixed HH:MM mask: the first two digits are the hour, the next two the minutes. A
 * lone digit before the colon ("9:30") is read as 09. A bare hour ("9", "21") means HH:00.
 */

const padHour = (text: string) => text.replace(/^(\d):/, '0$1:')

/** What the field shows for what was typed: digits only (max 4), the colon after the hour. */
export function maskTime(text: string): string {
  const digits = padHour(text).replace(/\D/g, '').slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** The typed text as "HH:MM", or null when it is empty, incomplete or not a real time of day. */
export function parseTimeInput(text: string): string | null {
  const digits = padHour(text).replace(/\D/g, '')
  if (digits.length === 0 || digits.length === 3 || digits.length > 4) return null
  const hours = Number(digits.slice(0, 2))
  const minutes = digits.length === 4 ? Number(digits.slice(2)) : 0
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
