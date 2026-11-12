/** Fields of a health plan card, as the form edits them. */
export type HealthCardFields = {
  operator: string
  plan: string
  number: string
  code: string
  holder: string
}

/** The card number / code with everything but letters and digits dropped, lowercase: "12 345-6" = "123456". */
export function normalizeKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

export type HealthCardErrors = { operator?: string; number?: string; code?: string }

/**
 * Validates a card against the ones already registered. The card number must be different from every
 * other card's, and so must the code (when filled in), ignoring spaces, dashes and case. `selfId`
 * is the card being edited, which is not a duplicate of itself.
 */
export function validateHealthCard(
  input: HealthCardFields,
  existing: { id: string; number: string; code: string }[],
  selfId?: string
): HealthCardErrors {
  const errors: HealthCardErrors = {}
  const others = existing.filter((card) => card.id !== selfId)

  if (input.operator.trim().length < 2) errors.operator = 'Informe a operadora do plano.'

  const numberKey = normalizeKey(input.number)
  if (numberKey.length < 4) {
    errors.number = 'Informe o número da carteirinha (pelo menos 4 caracteres).'
  } else if (others.some((card) => normalizeKey(card.number) === numberKey)) {
    errors.number = 'Já existe um cartão com este número.'
  }

  const codeKey = normalizeKey(input.code)
  if (codeKey && others.some((card) => normalizeKey(card.code) === codeKey)) {
    errors.code = 'Já existe um cartão com este código.'
  }

  return errors
}

export function hasErrors(errors: HealthCardErrors): boolean {
  return Object.keys(errors).length > 0
}
