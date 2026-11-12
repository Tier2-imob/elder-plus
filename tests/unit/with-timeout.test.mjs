import assert from 'node:assert/strict'
import { test } from 'node:test'

import { TimeoutError, withTimeout } from '../../src/services/with-timeout.ts'

const later = (ms, value, fail = false) =>
  new Promise((resolve, reject) => setTimeout(() => (fail ? reject(value) : resolve(value)), ms))

test('resolves with the value when the operation is fast enough', async () => {
  assert.equal(await withTimeout(later(5, 'ok'), 200), 'ok')
})

test('rejects with the operation error when it fails in time', async () => {
  const boom = new Error('boom')
  await assert.rejects(withTimeout(later(5, boom, true), 200), boom)
})

test('rejects with a TimeoutError (code app/timeout) when it takes too long', async () => {
  await assert.rejects(withTimeout(later(200, 'late'), 20), (e) => {
    assert.ok(e instanceof TimeoutError)
    assert.equal(e.code, 'app/timeout')
    return true
  })
})
