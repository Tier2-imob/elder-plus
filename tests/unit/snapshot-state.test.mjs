// Run with `npm run test:unit` (Node strips the TypeScript types on import).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { classifySnapshot } from '../../src/services/firebase/snapshot-state.ts'

const snap = (exists, fromCache, hasPendingWrites = false) => ({ exists, fromCache, hasPendingWrites })

test('document from the server is ready', () => {
  assert.equal(classifySnapshot(snap(true, false)), 'ready')
})

test('document from the cache is ready (it exists)', () => {
  assert.equal(classifySnapshot(snap(true, true)), 'ready')
})

test('absent and confirmed by the server is ready (the user really has nothing)', () => {
  assert.equal(classifySnapshot(snap(false, false)), 'ready')
})

test('absent from the cache is unconfirmed: offline with nothing cached', () => {
  assert.equal(classifySnapshot(snap(false, true)), 'unconfirmed')
})

test('a local delete in flight is not mistaken for being offline', () => {
  assert.equal(classifySnapshot(snap(false, true, true)), 'ready')
})

test('waiting for the server skips snapshots with pending writes', () => {
  assert.equal(classifySnapshot(snap(true, false, true), { waitForServerWrites: true }), 'skip')
})

test('without waiting, pending writes are not skipped', () => {
  assert.equal(classifySnapshot(snap(true, false, true)), 'ready')
})
