import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'

import { db } from './config'

/**
 * Care data written before care circles existed lives under users/{uid}/. Moving it into the
 * user's own circle keeps their routine and health history (MVP step 3).
 *
 * Each document keeps its id (dose ids embed the medication id, task ids are referenced by
 * nothing else) and its data as-is (timestamps included). Every chunk sets the circle copy and
 * deletes the legacy doc in the same batch, so nothing is ever lost or duplicated; an interrupted
 * run simply resumes with whatever is still under users/{uid}/ next time.
 */
const COLLECTIONS = ['tasks', 'medications', 'medicationDoses'] as const

// Firestore allows 500 writes per batch; each move is 2 writes.
const MOVES_PER_BATCH = 200

/** Move the user's legacy care data into `circleId`. Returns how many documents were moved. */
export async function migrateLegacyCareData(uid: string, circleId: string): Promise<number> {
  let moved = 0
  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, name))
    for (let i = 0; i < snap.docs.length; i += MOVES_PER_BATCH) {
      const batch = writeBatch(db)
      for (const legacy of snap.docs.slice(i, i + MOVES_PER_BATCH)) {
        batch.set(doc(db, 'circles', circleId, name, legacy.id), legacy.data())
        batch.delete(legacy.ref)
      }
      await batch.commit()
      moved += Math.min(MOVES_PER_BATCH, snap.docs.length - i)
    }
  }
  return moved
}
