#!/usr/bin/env node
/**
 * `npm run test:rules` — starts the Firestore emulator on a free port and runs tests/rules/*.test.mjs
 * against the rules in firestore.rules (Node's built-in test runner; needs Java for the emulator).
 *
 * The port is chosen at run time so a leftover emulator (or anything else on 8080) never blocks it.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolvePort(port))
    })
  })
}

const port = await freePort()
const configPath = join(mkdtempSync(join(tmpdir(), 'elder-rules-')), 'firebase.json')
writeFileSync(
  configPath,
  JSON.stringify({
    firestore: { rules: join(root, 'firestore.rules').replace(/\\/g, '/') },
    emulators: { firestore: { host: '127.0.0.1', port }, ui: { enabled: false }, singleProjectMode: true },
  })
)

const command =
  `npx firebase emulators:exec --config "${configPath}" --only firestore --project demo-elder ` +
  `"node --test tests/rules/*.test.mjs"`

const result = spawnSync(command, { cwd: root, stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
