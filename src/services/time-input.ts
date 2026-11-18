/**
 * Typing a time ("HH:MM") by hand. Pure, unit-tested in tests/unit/time-input.test.mjs.
 * The field is a fixed HH:MM mask: the first two digits are the hour, the next two the minutes. A
 * lone digit before the colon ("9:30") is read as 09. A bare hour ("9", "21") means HH:00.
 */

const padHour = (text: string) => text.replace(/^(\d):/, '0$1:')

/**
 * What the field shows for what was typed: digits only (max 4), the colon after the hour. A digit
 * that could not belong to a real time is refused as it is typed, so the field never holds 51:99:
 * a first hour digit above 2 becomes 0H ("5" → "05"), the second hour digit is at most 3 after a 2,
 * and the first minute digit is at most 5.
 */
export function maskTime(text: string): string {
  let digits = ''
  for (const d of padHour(text).replace(/\D/g, '')) {
    if (digits.length === 4) break
    const n = Number(d)
    if (digits.length === 0) digits = n > 2 ? `0${d}` : d
    else if (digits.length === 1) digits = digits[0] === '2' && n > 3 ? digits : digits + d
    else if (digits.length === 2) digits = n > 5 ? digits : digits + d
    else digits += d
  }
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
