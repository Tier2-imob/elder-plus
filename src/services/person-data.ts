/**
 * Pure helpers for the assisted person's data (birth date and phone): input masks, validation,
 * display formats and age. No Firebase or React imports, so they are unit-tested (tests/unit).
 *
 * Birth dates are stored as "YYYY-MM-DD" strings (no time zone to get wrong) and phones as digits
 * with the area code ("11912345678").
 */

const digitsOf = (text: string) => text.replace(/\D/g, '')

// ─── Data de nascimento ───────────────────────────────────────────────────────

/** Oldest age accepted — a typo guard (a 3-digit-year slip), not a rule about real people. */
const MAX_AGE_YEARS = 120

/** "15031948" → "15/03/1948", progressively while typing ("15/0", "15/03", ...). */
export function maskBirthDate(input: string): string {
  const d = digitsOf(input).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** "1948-03-15" → "15/03/1948". Returns the input unchanged if it is not an ISO date. */
export function formatBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso
}

export type BirthDateResult = { value: string | null; error?: undefined } | { value?: undefined; error: string }

/**
 * What the user typed ("15/03/1948") → the stored "YYYY-MM-DD". Empty is fine (the field is
 * optional) and gives `null`; anything else must be a real calendar date, not in the future and not
 * more than 120 years ago.
 */
export function parseBirthDate(input: string, today: Date = new Date()): BirthDateResult {
  const text = input.trim()
  if (!text) return { value: null }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  const invalid = { error: 'Data de nascimento inválida. Use dia/mês/ano, por exemplo 15/03/1948.' }
  if (!match) return invalid

  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  // Date.UTC rolls 31/02 over to March: a real date round-trips unchanged.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return invalid

  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  if (date.getTime() > todayUtc) return { error: 'A data de nascimento não pode ser no futuro.' }
  if (today.getFullYear() - year > MAX_AGE_YEARS) return { error: 'Confira o ano de nascimento.' }

  const pad = (n: number) => String(n).padStart(2, '0')
  return { value: `${year}-${pad(month)}-${pad(day)}` }
}

/** Age in whole years on `today`, or null if `iso` is not a valid stored date. */
export function ageFromBirthDate(iso: string, today: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  let age = today.getFullYear() - year
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!hadBirthday) age -= 1
  return age >= 0 ? age : null
}

// ─── Telefone ─────────────────────────────────────────────────────────────────

/** Brazilian phone with area code: 10 or 11 digits (a leading 55 is dropped). Null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = digitsOf(input).replace(/^55(?=\d{10,11}$)/, '')
  return digits.length === 10 || digits.length === 11 ? digits : null
}

/** "11912345678" → "(11) 91234-5678". */
export function formatPhone(digits: string): string {
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  const cut = rest.length === 9 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, cut)}-${rest.slice(cut)}`
}

/** What the phone field shows while typing: "(11", "(11) 9123", "(11) 91234-5678". */
export function maskPhone(input: string): string {
  const d = digitsOf(input).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const rest = d.slice(2)
  const cut = d.length === 11 ? 5 : 4
  return rest.length > cut ? `(${d.slice(0, 2)}) ${rest.slice(0, cut)}-${rest.slice(cut)}` : `(${d.slice(0, 2)}) ${rest}`
}

export type PhoneResult = { value: string | null; error?: undefined } | { value?: undefined; error: string }

/** Empty is fine (optional) and gives null; otherwise 10 or 11 digits with the area code. */
export function parsePhone(input: string): PhoneResult {
  if (!input.trim()) return { value: null }
  const digits = normalizePhone(input)
  return digits ? { value: digits } : { error: 'Digite o telefone com DDD. Ex: (11) 91234-5678.' }
}

/**
 * Applies `mask` to a field's new text, with one fix for backspace: deleting only a formatting
 * character (the space in "(11) ", the "-" or "/") would be re-added by the mask and trap the cursor,
 * so that case drops the last digit instead.
 */
export function maskInput(previous: string, next: string, mask: (text: string) => string): string {
  if (next.length < previous.length && digitsOf(next) === digitsOf(previous)) {
    return mask(digitsOf(previous).slice(0, -1))
  }
  return mask(next)
}
