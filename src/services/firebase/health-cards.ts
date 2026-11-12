import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

import { normalizeKey, type HealthCardFields } from '@/services/health-cards'

import { db } from './config'

/** circles/{circleId}/healthCards/{numberKey} document (+ its id, which is the numberKey). */
export type HealthCardDoc = HealthCardFields & { id: string; createdAt: Timestamp | null }

/** Thrown when another card already has the number: the card is not saved. */
export class DuplicateCardError extends Error {
  code = 'app/duplicate-card'
  constructor() {
    super('duplicate-card')
  }
}

const cardsOf = (circleId: string) => collection(db, 'circles', circleId, 'healthCards')

function toFields(input: HealthCardFields): HealthCardFields {
  return {
    operator: input.operator.trim(),
    plan: input.plan.trim(),
    number: input.number.trim(),
    code: input.code.trim(),
    holder: input.holder.trim(),
  }
}

/** The circle's cards, oldest first (the first one registered is the first one shown). */
export async function listHealthCards(circleId: string): Promise<HealthCardDoc[]> {
  const snap = await getDocs(query(cardsOf(circleId), orderBy('createdAt', 'asc')))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      operator: data.operator ?? '',
      plan: data.plan ?? '',
      number: data.number ?? '',
      code: data.code ?? '',
      holder: data.holder ?? '',
      createdAt: data.createdAt ?? null,
    }
  })
}

/** Creates a card. The doc id is the normalized number, so an existing one is refused atomically. */
export async function createHealthCard(circleId: string, input: HealthCardFields): Promise<HealthCardDoc> {
  const fields = toFields(input)
  const id = normalizeKey(fields.number)
  const ref = doc(cardsOf(circleId), id)
  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) throw new DuplicateCardError()
    tx.set(ref, { ...fields, numberKey: id, createdAt: serverTimestamp() })
  })
  return { id, ...fields, createdAt: Timestamp.now() }
}

/**
 * Edits a card. Same number: a plain update. Another number: the card moves to a new id, in one
 * transaction that refuses a number already in use and keeps the original creation moment.
 */
export async function updateHealthCard(
  circleId: string,
  card: HealthCardDoc,
  input: HealthCardFields
): Promise<HealthCardDoc> {
  const fields = toFields(input)
  const id = normalizeKey(fields.number)
  if (id === card.id) {
    await updateDoc(doc(cardsOf(circleId), card.id), fields)
    return { ...card, ...fields }
  }
  const from = doc(cardsOf(circleId), card.id)
  const to = doc(cardsOf(circleId), id)
  await runTransaction(db, async (tx) => {
    if ((await tx.get(to)).exists()) throw new DuplicateCardError()
    tx.delete(from)
    tx.set(to, { ...fields, numberKey: id, createdAt: card.createdAt ?? serverTimestamp() })
  })
  return { ...card, ...fields, id }
}

export async function deleteHealthCard(circleId: string, cardId: string): Promise<void> {
  await deleteDoc(doc(cardsOf(circleId), cardId))
}
