import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dateKey, dayLabel, msUntilMidnight, parseDateKey, resolveDayKey, weekDays } from '../../src/services/week.ts'

test('dateKey is the local calendar day, zero-padded', () => {
  assert.equal(dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
  assert.equal(dateKey(new Date(2026, 10, 12, 0, 0)), '2026-11-12')
})

test('parseDateKey accepts real dates only', () => {
  assert.equal(dateKey(parseDateKey('2026-11-12')), '2026-11-12')
  assert.equal(parseDateKey('2026-02-30'), null)
  assert.equal(parseDateKey('wed'), null)
  assert.equal(parseDateKey('2026-1-2'), null)
})

test('the week goes Monday to Sunday around the date, whatever day it is', () => {
  // 12/11/2026 is a Thursday.
  const week = weekDays(new Date(2026, 10, 12, 15, 30))
  assert.deepEqual(week.map((d) => d.key), [
    '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
  ])
  assert.equal(week[0].short, 'Seg')
  assert.equal(week[3].full, 'Quinta-feira')
  assert.equal(week[3].date, '12')
  // Sunday and Monday belong to the right weeks.
  assert.equal(weekDays(new Date(2026, 10, 15))[0].key, '2026-11-09')
  assert.equal(weekDays(new Date(2026, 10, 9))[0].key, '2026-11-09')
})

test('the week crosses months and years', () => {
  const week = weekDays(new Date(2026, 11, 31)) // Thursday
  assert.equal(week[0].key, '2026-12-28')
  assert.equal(week[6].key, '2027-01-03')
})

test('dayLabel names the weekday and the date', () => {
  assert.equal(dayLabel('2026-11-12'), 'Quinta-feira, 12/11')
  assert.equal(dayLabel('lixo'), 'lixo')
})

test('legacy weekday keys land on that day of the current week', () => {
  const now = new Date(2026, 10, 12) // Thursday
  assert.equal(resolveDayKey('mon', now), '2026-11-09')
  assert.equal(resolveDayKey('wed', now), '2026-11-11')
  assert.equal(resolveDayKey('sun', now), '2026-11-15')
  assert.equal(resolveDayKey('2026-11-20', now), '2026-11-20')
})

test('msUntilMidnight counts to the next local midnight', () => {
  assert.equal(msUntilMidnight(new Date(2026, 10, 12, 23, 59, 0)), 60_000)
  assert.equal(msUntilMidnight(new Date(2026, 10, 12, 0, 0, 0)), 86_400_000)
})
