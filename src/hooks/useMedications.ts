import { useCallback, useEffect, useRef, useState } from 'react';

import {
  LATE_TOLERANCE_MIN,
  type Medication,
  type MedicationInput,
} from '@/components/care/types';
import * as medications from '@/services/firebase/medications';
import type { MedicationDoc, MedicationDoseDoc } from '@/services/firebase/types';

/** Days (today included) covered by the dose history and the weekly adherence summary. */
const WINDOW_DAYS = 7

/** Local calendar day as "YYYY-MM-DD" (not toISOString, which is UTC). */
function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function daysAgo(n: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - n)
  return date
}

/** The moment a "HH:MM" slot happens on a "YYYY-MM-DD" day, in local time. */
function slotMoment(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

function toMedication(doc: MedicationDoc, doses: MedicationDoseDoc[], today: string): Medication {
  const own = doses
    .filter((d) => d.medicationId === doc.id)
    .map((d) => ({ date: d.date, time: d.time, state: d.state }))
  return {
    id: doc.id,
    name: doc.name,
    principle: doc.principle,
    dose: doc.dose,
    via: doc.via,
    times: doc.times,
    stock: doc.stock,
    stockUnit: doc.stockUnit,
    today: own.filter((d) => d.date === today),
    history: own
      .filter((d) => d.date < today)
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date))),
  }
}

/**
 * Taken / expected doses over the last WINDOW_DAYS. A slot is expected once its moment has passed
 * (and the medication already existed then); a slot registered early also counts. Returns null
 * when nothing is expected yet.
 */
function weeklyAdherence(docs: MedicationDoc[], doses: MedicationDoseDoc[]): number | null {
  const now = new Date()
  const byId = new Map(doses.map((d) => [d.id, d]))
  let expected = 0
  let taken = 0
  for (const med of docs) {
    const created = med.createdAt ? med.createdAt.toDate() : new Date(0)
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const day = dateKey(daysAgo(i))
      for (const time of med.times) {
        const logged = byId.get(medications.doseId(med.id, day, time))
        const slot = slotMoment(day, time)
        if (!logged && (slot > now || slot < created)) continue
        expected++
        if (logged && logged.state !== 'nao-tomou') taken++
      }
    }
  }
  return expected ? Math.round((taken / expected) * 100) : null
}

/**
 * Loads the user's medications and the doses registered in the last week. Dose registration and
 * undo are optimistic (stock included) and roll back on failure; create/update/remove are not
 * (the form needs to know it failed) and throw so the modal can show the error.
 */
export function useMedications(uid: string | undefined) {
  const [docs, setDocs] = useState<MedicationDoc[]>([])
  const [doses, setDoses] = useState<MedicationDoseDoc[]>([])
  const [medicationsLoading, setMedicationsLoading] = useState(uid !== undefined)
  const [medicationsError, setMedicationsError] = useState<string | undefined>(undefined)

  // Dose ids with a write in flight. A fast double tap fires twice before `doses` re-renders, so
  // the state check alone would record the slot (and take the stock) twice.
  const pendingDoseIds = useRef<Set<string>>(new Set())

  // Reset during render when the uid changes (same pattern as CareTasksProvider).
  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) {
    setLoadedForUid(uid)
    setDocs([])
    setDoses([])
    setMedicationsError(undefined)
    setMedicationsLoading(uid !== undefined)
  }

  useEffect(() => {
    if (!uid) return

    let active = true

    Promise.all([
      medications.listMedications(uid),
      medications.listDosesSince(uid, dateKey(daysAgo(WINDOW_DAYS - 1))),
    ])
      .then(([loadedMeds, loadedDoses]) => {
        if (!active) return
        setDocs(loadedMeds)
        setDoses(loadedDoses)
      })
      .catch((e) => {
        console.warn('listMedications failed', e)
        if (active) setMedicationsError('Não foi possível carregar os medicamentos.')
      })
      .finally(() => {
        if (active) setMedicationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [uid])

  const adjustStock = (medicationId: string, delta: number) =>
    setDocs((prev) =>
      prev.map((d) => (d.id === medicationId ? { ...d, stock: Math.max(0, d.stock + delta) } : d))
    )

  /** Register today's `time` slot as taken (on time or late, by the clock) or skipped. */
  const recordDose = useCallback(
    async (medicationId: string, time: string, taken: boolean): Promise<void> => {
      if (!uid) return
      const med = docs.find((d) => d.id === medicationId)
      if (!med) return

      const now = new Date()
      const date = dateKey(now)
      const id = medications.doseId(medicationId, date, time)
      if (pendingDoseIds.current.has(id) || doses.some((d) => d.id === id)) return
      pendingDoseIds.current.add(id)

      const lateAfter = slotMoment(date, time).getTime() + LATE_TOLERANCE_MIN * 60_000
      const state = !taken ? 'nao-tomou' : now.getTime() > lateAfter ? 'atrasou' : 'tomou'
      const stockDecremented = taken && med.stock > 0
      const optimistic: MedicationDoseDoc = {
        id, medicationId, date, time, state, stockDecremented, recordedAt: null,
      }

      setMedicationsError(undefined)
      setDoses((prev) => [...prev, optimistic])
      if (stockDecremented) adjustStock(medicationId, -1)

      try {
        await medications.recordDose(uid, { medicationId, date, time, state, stockDecremented })
      } catch (e) {
        console.warn('recordDose failed', e)
        setDoses((prev) => prev.filter((d) => d.id !== id))
        if (stockDecremented) adjustStock(medicationId, 1)
        setMedicationsError('Não foi possível registrar a dose. Tente novamente.')
      } finally {
        pendingDoseIds.current.delete(id)
      }
    },
    [uid, docs, doses]
  )

  /** Undo today's registration of the `time` slot. */
  const undoDose = useCallback(
    async (medicationId: string, time: string): Promise<void> => {
      if (!uid) return
      const id = medications.doseId(medicationId, dateKey(new Date()), time)
      const dose = doses.find((d) => d.id === id)
      if (!dose || pendingDoseIds.current.has(id)) return
      pendingDoseIds.current.add(id)

      setMedicationsError(undefined)
      setDoses((prev) => prev.filter((d) => d.id !== id))
      if (dose.stockDecremented) adjustStock(medicationId, 1)

      try {
        await medications.undoDose(uid, dose)
      } catch (e) {
        console.warn('undoDose failed', e)
        setDoses((prev) => [...prev, dose])
        if (dose.stockDecremented) adjustStock(medicationId, -1)
        setMedicationsError('Não foi possível desfazer o registro. Tente novamente.')
      } finally {
        pendingDoseIds.current.delete(id)
      }
    },
    [uid, doses]
  )

  const create = useCallback(
    async (input: MedicationInput): Promise<void> => {
      if (!uid) throw new Error('No signed-in user')
      const created = await medications.createMedication(uid, input)
      setDocs((prev) => [...prev, created])
    },
    [uid]
  )

  const update = useCallback(
    async (medicationId: string, input: MedicationInput): Promise<void> => {
      if (!uid) throw new Error('No signed-in user')
      await medications.updateMedication(uid, medicationId, input)
      setDocs((prev) => prev.map((d) => (d.id === medicationId ? { ...d, ...input } : d)))
    },
    [uid]
  )

  const remove = useCallback(
    async (medicationId: string): Promise<void> => {
      if (!uid) throw new Error('No signed-in user')
      await medications.deleteMedication(uid, medicationId)
      setDocs((prev) => prev.filter((d) => d.id !== medicationId))
      setDoses((prev) => prev.filter((d) => d.medicationId !== medicationId))
    },
    [uid]
  )

  const today = dateKey(new Date())

  return {
    medications: docs.map((d) => toMedication(d, doses, today)),
    medsAdherence: weeklyAdherence(docs, doses),
    medicationsLoading,
    medicationsError,
    recordDose,
    undoDose,
    create,
    update,
    remove,
  }
}
