// Shared helpers for the Firestore security-rules tests (run with `npm run test:rules`).
//
// Each *.test.mjs file is one `scenario`: it builds its data and then awaits its checks one after the
// other (many build on the state left by the previous one). Every check is a real subtest:
// `check(name, true, fn)` passes when the write/read is allowed, `check(name, false, fn)` when the
// rules refuse it.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'

const RULES = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

// The running scenario's test context, so checks register as its subtests (sequentially).
let current

/** Run `body` as one test whose checks run in order. Do not await it at the top level of a file. */
export function scenario(name, body) {
  return test(name, async (t) => {
    current = t
    await body()
  })
}

/** Test environment on the Firestore emulator (started by `firebase emulators:exec`). */
export async function setup(name) {
  // emulators:exec exposes the emulator as 0.0.0.0:<port>; connect through the loopback address.
  const address = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').replace('0.0.0.0', '127.0.0.1')
  const [host, port] = address.split(':')
  // One project id per file keeps files that run in parallel from sharing data.
  const env = await initializeTestEnvironment({
    projectId: `demo-elder-${name}`,
    firestore: { rules: RULES, host, port: Number(port) },
  })
  current.after(() => env.cleanup())
  return env
}

/**
 * `check(name, true, fn)`: `fn` must be allowed by the rules; `check(name, false, fn)`: refused.
 * `check(name, fn)` is the same as `check(name, true, fn)`. Await it so checks run in order.
 */
export function check(name, okOrFn, maybeFn) {
  const ok = typeof okOrFn === 'function' ? true : okOrFn
  const fn = typeof okOrFn === 'function' ? okOrFn : maybeFn
  return current.test(name, async () => {
    if (ok) await assertSucceeds(fn())
    else await assertFails(fn())
  })
}

/** A plain assertion as a named subtest (e.g. counters after a sequence of writes). */
export function assertEq(name, actual, expected) {
  return current.test(name, () => assert.deepStrictEqual(actual, expected))
}
