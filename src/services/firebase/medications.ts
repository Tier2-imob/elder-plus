import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import { db } from './config'
import type { MedicationDoc, MedicationDoseDoc } from './types'

/** Fields the user edits in the medication form. `createdAt` is stamped by `createMedication`. */
export type MedicationFields = Omit<MedicationDoc, 'id' | 'createdAt'>

/** Deterministic dose id: one doc per medication + day + slot. */
export function doseId(medicationId: string, date: string, time: string): string {
  return `${medicationId}_${date}_${time.replace(':', '')}`
}

/** List medications under users/{uid}/medications, oldest first. */
export async function listMedications(uid: string): Promise<MedicationDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'medications'), orderBy('createdAt', 'asc'))
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name,
      principle: data.principle ?? '',
      dose: data.dose,
      via: data.via,
      times: data.times ?? [],
      stock: data.stock ?? 0,
      stockUnit: data.stockUnit,
      createdAt: data.createdAt ?? null,
    }
  })
}

/**
 * Create a medication with an auto-generated id. The returned doc carries the local time as a
 * stand-in for the server `createdAt` until the next `listMedications`.
 */
export async function createMedication(uid: string, input: MedicationFields): Promise<MedicationDoc> {
  const ref = await addDoc(collection(db, 'users', uid, 'medications'), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...input, createdAt: Timestamp.now() }
}

/** Overwrite the editable fields of a medication (createdAt is kept). */
export async function updateMedication(
  uid: string,
  medicationId: string,
  input: MedicationFields
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'medications', medicationId), { ...input })
}

/** Delete a medication and every dose registered for it. */
export async function deleteMedication(uid: string, medicationId: string): Promise<void> {
  const doses = await getDocs(
    query(collection(db, 'users', uid, 'medicationDoses'), where('medicationId', '==', medicationId))
  )
  const batch = writeBatch(db)
  doses.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'users', uid, 'medications', medicationId))
  await batch.commit()
}

/** List doses registered on or after `fromDate` ("YYYY-MM-DD"), across all medications. */
export async function listDosesSince(uid: string, fromDate: string): Promise<MedicationDoseDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'medicationDoses'), where('date', '>=', fromDate))
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      medicationId: data.medicationId,
      date: data.date,
      time: data.time,
      state: data.state,
      stockDecremented: data.stockDecremented === true,
      recordedAt: data.recordedAt ?? null,
    }
  })
}

/**
 * Register a dose slot and, when `stockDecremented`, take one unit off the medication's stock in
 * the same batch (a batch, not a transaction, so it also queues while offline).
 */
export async function recordDose(
  uid: string,
  dose: Omit<MedicationDoseDoc, 'id' | 'recordedAt'>
): Promise<MedicationDoseDoc> {
  const id = doseId(dose.medicationId, dose.date, dose.time)
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid, 'medicationDoses', id), { ...dose, recordedAt: serverTimestamp() })
  if (dose.stockDecremented) {
    batch.update(doc(db, 'users', uid, 'medications', dose.medicationId), { stock: increment(-1) })
  }
  await batch.commit()
  return { id, ...dose, recordedAt: Timestamp.now() }
}

/** Remove a registered dose, giving the unit back to the stock if registering it took one. */
export async function undoDose(uid: string, dose: MedicationDoseDoc): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'medicationDoses', dose.id))
  if (dose.stockDecremented) {
    batch.update(doc(db, 'users', uid, 'medications', dose.medicationId), { stock: increment(1) })
  }
  await batch.commit()
}
