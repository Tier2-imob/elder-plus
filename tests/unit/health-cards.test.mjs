import assert from 'node:assert/strict'
import { test } from 'node:test'

import { hasErrors, normalizeKey, validateHealthCard } from '../../src/services/health-cards.ts'

const card = (over = {}) => ({ operator: 'Unimed', number: '0 123 456789', code: '', holder: '', ...over })
const saved = [{ id: 'a', number: '0123456789', code: 'AB-12' }]

test('normalizeKey ignores spaces, dashes, case and accents', () => {
  assert.equal(normalizeKey(' 0 123-456.789 '), '0123456789')
  assert.equal(normalizeKey('Ab-12'), 'ab12')
  assert.equal(normalizeKey('Código 9'), 'codigo9')
})

test('a valid card with a new number passes', () => {
  assert.equal(hasErrors(validateHealthCard(card({ number: '999 888' }), saved)), false)
})

test('operator and number are required', () => {
  const errors = validateHealthCard(card({ operator: ' ', number: '12' }), [])
  assert.ok(errors.operator)
  assert.ok(errors.number)
})

test('the same number is refused, however it is typed', () => {
  assert.ok(validateHealthCard(card({ number: '0123-456789' }), saved).number)
  assert.ok(validateHealthCard(card({ number: '0 123 456 789' }), saved).number)
})

test('the same code is refused, but an empty code is not a duplicate', () => {
  assert.ok(validateHealthCard(card({ number: '555 666', code: 'ab 12' }), saved).code)
  assert.equal(validateHealthCard(card({ number: '555 666', code: '' }), [{ id: 'a', number: '1111', code: '' }]).code, undefined)
})

test('editing a card does not collide with itself', () => {
  assert.equal(hasErrors(validateHealthCard(card({ code: 'AB-12' }), saved, 'a')), false)
})
