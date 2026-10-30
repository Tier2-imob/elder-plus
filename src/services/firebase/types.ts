import type { CircleRole, MemberStatus, PermissionKey } from '@/components/care/types'
import type { AccountRole } from '@/components/types'
import type { Timestamp } from 'firebase/firestore'

/** users/{uid} profile document. */
export type UserProfile = {
  name: string
  /** Primary profile (chosen at signup). */
  role: AccountRole
  /** Every profile of the account (a person can be both `elder` and `family`); includes `role`. */
  roles: AccountRole[]
  email: string
  createdAt: Timestamp | null
  /** Momento em que o usuário aceitou os termos (carimbo do servidor). LGPD. */
  termsAcceptedAt: Timestamp | null
  /** Versão dos termos aceita no cadastro (ver TERMS_VERSION). */
  termsVersion: string
  /**
   * Care circles this user belongs to (active or pending), up to MAX_CIRCLES. May hold a stale id
   * after a manager removes the user — `clearStaleCircle` removes it. Profiles from before
   * multi-circle only have `circleId`, read here as a one-item list.
   */
  circleIds: string[]
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
  /** uid of the circle member responsible for the task (optional). */
  assigneeId?: string
  /**
   * That member's name when assigned (kept for reading the raw data). The app shows the *current*
   * member's name from the circle instead, and nothing once they left.
   */
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

/** Who consented, when (server timestamp) and to which text version (CIRCLE_CONSENT_VERSION). */
export type ConsentRecord = { at: Timestamp | null; version: string }

/** circles/{circleId} document (+ its id). */
export type CircleDoc = {
  id: string
  /** The assisted person. `uid` is null while the titular is nominal (no account linked). */
  subject: { name: string; uid: string | null }
  /** persons/{subjectId}: the assisted person as an entity (null on circles from older versions). */
  subjectId: string | null
  createdBy: string
  createdAt: Timestamp | null
  /** Active + pending members (CIRCLE_LIMITS.maxMembers). */
  memberCount: number
  /** Members holding the `emergencia` permission (CIRCLE_LIMITS.maxEmergencyContacts). */
  emergencyCount: number
  /** Creator's declaration of authorization to register the assisted person's data. */
  consent: ConsentRecord & { by: string }
  /**
   * 'inativo' = read-only: every document is kept in the database but nothing can be written until a
   * manager reactivates it. Circles from before this field are 'ativo'.
   */
  status: 'ativo' | 'inativo'
  inactivatedAt: Timestamp | null
  inactivatedBy: string | null
}

/** circles/{circleId}/members/{uid} document. The doc id is the member's uid. */
export type CircleMemberDoc = {
  uid: string
  /** Display name, copied from the member's profile when joining. */
  name: string
  role: CircleRole
  /** Free-text relation shown on the card ("Filha", "Geriatra"). */
  label: string | null
  permissions: PermissionKey[]
  status: MemberStatus
  phone: string | null
  /** uid of who invited; null for the circle creator. */
  invitedBy: string | null
  /** Invite code used to join; null for the circle creator. */
  inviteCode: string | null
  joinedAt: Timestamp | null
  lastAccess: Timestamp | null
  /** Acceptance of the circle terms (creator declaration or invitee acceptance). */
  consent: ConsentRecord
}

/**
 * invites/{code} document. Top-level (not under the circle) because the invitee only knows the
 * code; it carries the names the acceptance screen shows, since a non-member cannot read the circle.
 */
export type InviteDoc = {
  code: string
  circleId: string
  circleName: string
  role: CircleRole
  label: string | null
  permissions: PermissionKey[]
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  expiresAt: Timestamp
  usedBy: string | null
  usedAt: Timestamp | null
  revoked: boolean
}

/**
 * persons/{personId}: the assisted person as a managed user. Exists without an account or password
 * (`uid` null) and is cared for by its circle; `uid` is linked once they get their own account.
 */
export type PersonDoc = {
  id: string
  name: string
  uid: string | null
  circleId: string
  createdBy: string
  createdAt: Timestamp | null
  /** Mirrors the circle's status (inactivating the circle inactivates the person; data is kept). */
  status: 'ativo' | 'inativo'
}
