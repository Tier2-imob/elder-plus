import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseTimeToMinutes, pickNearestPending } from '../../src/services/nearest-task.ts'

const at = (h, m = 0) => new Date(2026, 9, 30, h, m)
const task = (id, time) => ({ id, time })
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

test('falls back to the earliest pending task when none is left today', () => {
  const tasks = [task('a', '08:00'), task('b', '15:00')]
  assert.equal(pickNearestPending(tasks, none, at(22, 0)).id, 'a')
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
