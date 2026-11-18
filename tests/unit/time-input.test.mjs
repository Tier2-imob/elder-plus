import assert from 'node:assert/strict'
import { test } from 'node:test'

import { maskTime, parseTimeInput } from '../../src/services/time-input.ts'

test('maskTime keeps two digits for the hour and puts the colon after them', () => {
  assert.equal(maskTime('1'), '1')
  assert.equal(maskTime('09'), '09')
  assert.equal(maskTime('093'), '09:3')
  assert.equal(maskTime('0930'), '09:30')
  assert.equal(maskTime('09:30'), '09:30')
  assert.equal(maskTime('09301'), '09:30')
  assert.equal(maskTime('ab1c2'), '12')
})

test('maskTime reads a lone hour digit before the colon as 0H', () => {
  assert.equal(maskTime('9:'), '09')
  assert.equal(maskTime('9:30'), '09:30')
})

test('maskTime never lets an impossible time be typed', () => {
  assert.equal(maskTime('5'), '05') // a first hour digit above 2 means 0H
  assert.equal(maskTime('51:99'), '05:19')
  assert.equal(maskTime('25'), '2') // after a 2 the hour digit is at most 3
  assert.equal(maskTime('24'), '2')
  assert.equal(maskTime('23'), '23')
  assert.equal(maskTime('1260'), '12:0') // the first minute digit is at most 5
  assert.equal(maskTime('2359'), '23:59')
  assert.equal(maskTime('0099'), '00')
})

test('parseTimeInput reads full times and bare hours', () => {
  assert.equal(parseTimeInput('09:30'), '09:30')
  assert.equal(parseTimeInput('0930'), '09:30')
  assert.equal(parseTimeInput('9:30'), '09:30')
  assert.equal(parseTimeInput('9'), '09:00')
  assert.equal(parseTimeInput('21'), '21:00')
  assert.equal(parseTimeInput('2359'), '23:59')
  assert.equal(parseTimeInput('00:00'), '00:00')
})

test('parseTimeInput refuses empty, incomplete and impossible times', () => {
  for (const text of ['', ' ', 'abc', '24:00', '2400', '12:60', '1260', '99', '09:3', '12345']) {
    assert.equal(parseTimeInput(text), null, text)
  }
})
