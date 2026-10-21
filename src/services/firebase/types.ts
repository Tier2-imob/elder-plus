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
