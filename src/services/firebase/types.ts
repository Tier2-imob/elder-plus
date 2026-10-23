import type { AccountRole } from '@/components/types'
import type { Timestamp } from 'firebase/firestore'

/** users/{uid} profile document. */
export type UserProfile = {
  name: string
  role: AccountRole
  email: string
  createdAt: Timestamp | null
  /** Momento em que o usuário aceitou os termos (carimbo do servidor). LGPD. */
  termsAcceptedAt: Timestamp | null
  /** Versão dos termos aceita no cadastro (ver TERMS_VERSION). */
  termsVersion: string
}

/** businesses/{businessId}/reviews/{reviewId} document (+ its id). */
export type ReviewDoc = {
  id: string
  rating: number
  comment: string
  author: string
  authorUid: string
  createdAt: Timestamp | null
}

/** users/{uid}/tasks/{taskId} document (+ its id). */
export type TaskDoc = {
  id: string
  dayKey: string
  title: string
  time: string
  day: string
  icon: string
  done: boolean
  order: number
  /** Family member responsible for executing the task (optional). */
  assignee?: string
  /** TaskCategory key (consulta, medicacao, ...). Absent on the initial seeded tasks. */
  category?: string
  /** Free-text details (optional). */
  description?: string
  /** Creation moment (server timestamp). Absent on the initial seeded tasks. */
  createdAt?: Timestamp | null
  /** Who created the task. Absent on the initial seeded tasks. */
  createdBy?: { uid: string; name: string }
}

/** A file stored under users/{uid}/documents/ in Cloud Storage. */
export type StoredDocument = {
  name: string
  fullPath: string
  url: string
  size?: number
  contentType?: string
  updated?: string
}

/** users/{uid}/medications/{medicationId} document (+ its id). */
export type MedicationDoc = {
  id: string
  name: string
  principle: string
  dose: string
  via: string
  /** Daily dose times in "HH:MM". */
  times: string[]
  stock: number
  stockUnit: string
  /** Creation moment (server timestamp); doses scheduled before it are not expected. */
  createdAt: Timestamp | null
}

/**
 * users/{uid}/medicationDoses/{medicationId}_{date}_{HHMM} document (+ its id). One doc per
 * scheduled slot, so registering the same slot twice overwrites instead of duplicating.
 */
export type MedicationDoseDoc = {
  id: string
  medicationId: string
  /** Local calendar day, "YYYY-MM-DD". */
  date: string
  /** Scheduled slot, "HH:MM". */
  time: string
  state: 'tomou' | 'nao-tomou' | 'atrasou'
  /** Whether registering this dose took one unit off the stock (undo gives it back). */
  stockDecremented: boolean
  recordedAt: Timestamp | null
}
