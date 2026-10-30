import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ageFromBirthDate,
  formatBirthDate,
  formatPhone,
  maskBirthDate,
  maskInput,
  maskPhone,
  normalizePhone,
  parseBirthDate,
  parsePhone,
} from '../../src/services/person-data.ts'

const today = new Date(2026, 9, 30) // 30/10/2026

test('maskBirthDate formats progressively while typing', () => {
  assert.equal(maskBirthDate('1'), '1')
  assert.equal(maskBirthDate('15'), '15')
  assert.equal(maskBirthDate('150'), '15/0')
  assert.equal(maskBirthDate('15031'), '15/03/1')
  assert.equal(maskBirthDate('15031948'), '15/03/1948')
  assert.equal(maskBirthDate('15/03/1948999'), '15/03/1948')
  assert.equal(maskBirthDate('ab15cd'), '15')
})

test('parseBirthDate: empty is allowed and gives null', () => {
  assert.deepEqual(parseBirthDate('', today), { value: null })
  assert.deepEqual(parseBirthDate('   ', today), { value: null })
})

test('parseBirthDate: a valid date gives the stored ISO string', () => {
  assert.deepEqual(parseBirthDate('15/03/1948', today), { value: '1948-03-15' })
  assert.deepEqual(parseBirthDate('29/02/1952', today), { value: '1952-02-29' }) // leap year
  assert.deepEqual(parseBirthDate('30/10/2026', today), { value: '2026-10-30' }) // today is not the future
})

test('parseBirthDate: incomplete or malformed dates are refused', () => {
  for (const text of ['15/03', '15/03/48', '1503/1948', '15-03-1948', 'abc', '15/3/1948']) {
    assert.ok(parseBirthDate(text, today).error, text)
  }
})

test('parseBirthDate: dates that do not exist are refused', () => {
  for (const text of ['31/02/1950', '29/02/1950', '00/01/1950', '15/13/1950', '32/01/1950']) {
    assert.ok(parseBirthDate(text, today).error, text)
  }
})

test('parseBirthDate: the future and implausible years are refused', () => {
  assert.match(parseBirthDate('31/10/2026', today).error, /futuro/)
  assert.match(parseBirthDate('01/01/2030', today).error, /futuro/)
  assert.match(parseBirthDate('01/01/1890', today).error, /ano de nascimento/)
})

test('formatBirthDate shows dd/mm/aaaa and leaves anything else alone', () => {
  assert.equal(formatBirthDate('1948-03-15'), '15/03/1948')
  assert.equal(formatBirthDate('not a date'), 'not a date')
})

test('ageFromBirthDate counts whole years', () => {
  assert.equal(ageFromBirthDate('1948-03-15', today), 78) // birthday already happened
  assert.equal(ageFromBirthDate('1948-12-25', today), 77) // not yet
  assert.equal(ageFromBirthDate('1948-10-30', today), 78) // birthday today
  assert.equal(ageFromBirthDate('2030-01-01', today), null)
  assert.equal(ageFromBirthDate('garbage', today), null)
})

test('normalizePhone accepts 10 or 11 digits with the area code', () => {
  assert.equal(normalizePhone('(11) 91234-5678'), '11912345678')
  assert.equal(normalizePhone('11 3123-4567'), '1131234567')
  assert.equal(normalizePhone('+55 11 91234-5678'), '11912345678')
  assert.equal(normalizePhone('91234-5678'), null) // no area code
  assert.equal(normalizePhone('123'), null)
  assert.equal(normalizePhone(''), null)
})

test('formatPhone and maskPhone', () => {
  assert.equal(formatPhone('11912345678'), '(11) 91234-5678')
  assert.equal(formatPhone('1131234567'), '(11) 3123-4567')
  assert.equal(maskPhone(''), '')
  assert.equal(maskPhone('1'), '(1')
  assert.equal(maskPhone('11'), '(11')
  assert.equal(maskPhone('119'), '(11) 9')
  assert.equal(maskPhone('1191234'), '(11) 9123-4') // 7 digits: still a 10-digit layout
  assert.equal(maskPhone('1131234567'), '(11) 3123-4567')
  assert.equal(maskPhone('11912345678'), '(11) 91234-5678')
  assert.equal(maskPhone('119123456789999'), '(11) 91234-5678')
})

test('parsePhone: empty is allowed, otherwise it must be valid', () => {
  assert.deepEqual(parsePhone(''), { value: null })
  assert.deepEqual(parsePhone('(11) 91234-5678'), { value: '11912345678' })
  assert.ok(parsePhone('(11) 9123').error)
})

test('maskInput: deleting only a formatting character removes the last digit instead', () => {
  assert.equal(maskInput('(11) 9', '(11) ', maskPhone), '(11') // backspace over the space after ")"
  assert.equal(maskInput('15/0', '15/', maskBirthDate), '15') // backspace over "/"
  assert.equal(maskInput('(11) 9', '(11) 98', maskPhone), '(11) 98') // typing a digit
  assert.equal(maskInput('15/03', '15/0', maskBirthDate), '15/0') // deleting a digit
})
