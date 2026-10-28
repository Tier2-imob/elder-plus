#!/usr/bin/env node
/**
 * Firestore migrations, versioned and tracked per environment.
 *
 *   npm run migrate:dev            → Firebase Emulator (project demo-elder, local)
 *   npm run migrate:hml            → homologação (project elder-29dc3)
 *   add -- --dry-run               → report what would change, write nothing
 *
 * Each file in scripts/migrations/ exports { id, description, up(db, { dryRun }) } and is applied
 * once per environment, in file-name order; applied ids are recorded in _migrations/{id} (a
 * collection the app cannot read or write — firestore.rules has no match for it). Migrations must
 * be idempotent: a run interrupted halfway is simply run again.
 *
 * Homologação uses Google credentials: GOOGLE_APPLICATION_CREDENTIALS pointing to a service account
 * key of elder-29dc3 (keep it out of git, e.g. in secrets/).
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const ENVIRONMENTS = {
  dev: { projectId: 'demo-elder', emulator: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080' },
  hml: { projectId: 'elder-29dc3' },
}

const args = process.argv.slice(2)
const envName = args[args.indexOf('--env') + 1]
const dryRun = args.includes('--dry-run')
const env = ENVIRONMENTS[envName]
if (!env) {
  console.error(`Ambiente inválido: "${envName}". Use --env dev ou --env hml.`)
  process.exit(1)
}
if (env.emulator) process.env.FIRESTORE_EMULATOR_HOST = env.emulator
else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Homologação: defina GOOGLE_APPLICATION_CREDENTIALS com a chave da conta de serviço de elder-29dc3.')
  process.exit(1)
}

initializeApp({ projectId: env.projectId })
const db = getFirestore()

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const files = readdirSync(dir).filter((f) => /^\d{3}-.+\.mjs$/.test(f)).sort()

console.log(`Ambiente: ${envName} (${env.projectId}${env.emulator ? ` — emulador ${env.emulator}` : ''})${dryRun ? ' — simulação' : ''}`)
for (const file of files) {
  const migration = await import(pathToFileURL(join(dir, file)).href)
  const ref = db.collection('_migrations').doc(migration.id)
  if ((await ref.get()).exists) {
    console.log(`  ✓ ${migration.id} (já aplicada)`)
    continue
  }
  const changed = await migration.up(db, { dryRun })
  if (dryRun) {
    console.log(`  • ${migration.id}: ${changed} documento(s) mudariam — ${migration.description}`)
    continue
  }
  await ref.set({ description: migration.description, changed, appliedAt: FieldValue.serverTimestamp() })
  console.log(`  + ${migration.id}: ${changed} documento(s) — ${migration.description}`)
}
