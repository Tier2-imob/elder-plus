import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseTimeToMinutes, pickNearestPending } from '../../src/services/nearest-task.ts'

// Today in these tests is 30/10/2026 (a Friday).
const at = (h, m = 0) => new Date(2026, 9, 30, h, m)
const TODAY = '2026-10-30'
const task = (id, time, dayKey = TODAY) => ({ id, time, dayKey })
const none = new Set()

test('parseTimeToMinutes reads HH:MM and "<n>h"', () => {
  assert.equal(parseTimeToMinutes('09:30'), 570)
  assert.equal(parseTimeToMinutes('9:05'), 545)
  assert.equal(parseTimeToMinutes('14h'), 840)
  assert.equal(parseTimeToMinutes('8'), 480)
  assert.equal(parseTimeToMinutes('00:00'), 0)
})

test('parseTimeToMinutes: anything unparseable sorts last', () => {
  for (const text of ['25:00', '12:60', 'cedo', '', '8:5']) {
    assert.equal(parseTimeToMinutes(text), Number.POSITIVE_INFINITY, text)
  }
})

test('picks the earliest pending task at or after now', () => {
  const tasks = [task('a', '08:00'), task('b', '15:00'), task('c', '12:00'), task('d', '20:00')]
  assert.equal(pickNearestPending(tasks, none, at(11, 0)).id, 'c')
  assert.equal(pickNearestPending(tasks, none, at(12, 0)).id, 'c') // "at" counts
  assert.equal(pickNearestPending(tasks, none, at(12, 1)).id, 'b')
})

test('falls back to the earliest pending task of today when none is left later today', () => {
  const tasks = [task('a', '08:00'), task('b', '15:00')]
  assert.equal(pickNearestPending(tasks, none, at(22, 0)).id, 'a')
})

test('a task tomorrow beats an earlier time today that already passed', () => {
  const tasks = [task('today-early', '08:00'), task('tomorrow', '07:00', '2026-10-31')]
  assert.equal(pickNearestPending(tasks, none, at(22, 0)).id, 'tomorrow')
})

test('later days are ordered by date, then by time', () => {
  const tasks = [task('c', '09:00', '2026-11-02'), task('b', '18:00', '2026-10-31'), task('a', '20:00', '2026-10-31')]
  assert.equal(pickNearestPending(tasks, none, at(22, 0)).id, 'b')
})

test('pending tasks of past days are ignored', () => {
  const tasks = [task('old', '08:00', '2026-10-29')]
  assert.equal(pickNearestPending(tasks, none, at(9, 0)), null)
  assert.equal(pickNearestPending([...tasks, task('now', '10:00')], none, at(9, 0)).id, 'now')
})

test('done tasks are skipped, and nothing pending gives null', () => {
  const tasks = [task('a', '12:00'), task('b', '15:00')]
  assert.equal(pickNearestPending(tasks, new Set(['a']), at(11, 0)).id, 'b')
  assert.equal(pickNearestPending(tasks, new Set(['a', 'b']), at(11, 0)), null)
  assert.equal(pickNearestPending([], none, at(11, 0)), null)
})

test('ties keep the incoming order (Firestore order)', () => {
  const tasks = [task('first', '12:00'), task('second', '12:00')]
  assert.equal(pickNearestPending(tasks, none, at(10, 0)).id, 'first')
})

test('an unparseable time never wins over a real one', () => {
  const tasks = [task('x', 'cedo'), task('y', '23:00')]
  assert.equal(pickNearestPending(tasks, none, at(10, 0)).id, 'y')
})
