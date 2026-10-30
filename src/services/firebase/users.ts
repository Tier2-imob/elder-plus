import { classifySnapshot } from './snapshot-state'
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FieldValue,
  type Unsubscribe,
} from 'firebase/firestore'

import type { AccountRole } from '@/components/types'

import { db } from './config'
import type { UserProfile } from './types'

/**
 * Normalize an unknown role value to an {@link AccountRole}. Returns `raw` when it is one of
 * 'elder' | 'family' | 'partner'; otherwise falls back to 'family'.
 */
export function normalizeRole(raw: unknown): AccountRole {
  return raw === 'elder' || raw === 'family' || raw === 'partner' ? raw : 'family'
}

/**
 * Create the users/{uid} profile document with a server timestamp.
 *
 * `termsVersion` and `termsAcceptedAt` are REQUIRED so every signup path (email + Google) records
 * LGPD consent consistently. `termsAcceptedAt` is expected to be a `serverTimestamp()` sentinel
 * supplied by the caller, so the acceptance moment is stamped by the server, not the client.
 */
export async function createProfile(
  uid: string,
  input: {
    name: string
    role: AccountRole
    email: string
    termsVersion: string
    termsAcceptedAt: FieldValue
  }
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    name: input.name,
    role: normalizeRole(input.role),
    roles: [normalizeRole(input.role)],
    email: input.email,
    createdAt: serverTimestamp(),
    termsVersion: input.termsVersion,
    termsAcceptedAt: input.termsAcceptedAt,
  })
}

/** Read the users/{uid} profile. Returns null when the document does not exist. */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    name: data.name,
    role: normalizeRole(data.role),
    roles: rolesOf(data),
    email: data.email,
    createdAt: data.createdAt ?? null,
    termsAcceptedAt: data.termsAcceptedAt ?? null,
    termsVersion: data.termsVersion ?? '',
    circleIds: circleIdsOf(data),
  }
}

/** Profiles of a users/{uid} doc: `roles`, or the single `role` of accounts created before. */
export function rolesOf(data: DocumentData | undefined): AccountRole[] {
  const roles = Array.isArray(data?.roles) ? data.roles.map(normalizeRole) : [normalizeRole(data?.role)]
  return [...new Set(roles)]
}

/** Circles of a users/{uid} doc: `circleIds`, or the single `circleId` of accounts created before. */
export function circleIdsOf(data: DocumentData | undefined): string[] {
  if (Array.isArray(data?.circleIds)) return data.circleIds.filter((id: unknown) => typeof id === 'string')
  return typeof data?.circleId === 'string' ? [data.circleId] : []
}

/** Add a profile to the account (elder or family; partner only at signup — see firestore.rules). */
export async function addRole(uid: string, role: Exclude<AccountRole, 'partner'>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { roles: arrayUnion(role) })
}

/**
 * Subscribe to the user's circles (users/{uid}.circleIds) and profiles, so creating, joining or
 * leaving a circle, or adding a profile, reaches every screen at once.
 *
 * Only server-confirmed values are emitted: Firestore shows a local write at once and reverts it
 * if the server rejects the batch, which made the UI jump into the circle and back. Skipping
 * snapshots with pending writes keeps the screen put until the server answers.
 * `includeMetadataChanges` is required for that: the server ack only flips hasPendingWrites
 * (the data is unchanged), and without it no snapshot would follow — the screen would wait forever.
 */
export function observeMemberships(
  uid: string,
  onNext: (value: { circleIds: string[]; roles: AccountRole[] }) => void,
  onError: (error: Error) => void,
  /**
   * The profile could not be read and nothing is cached (no connection): "no circles" would be a
   * guess, so the caller shows a connection error instead. The listener stays active, so a later
   * server snapshot still arrives through `onNext` on its own once the connection is back.
   */
  onUnconfirmed: () => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    { includeMetadataChanges: true },
    (snap) => {
      const state = classifySnapshot(
        { exists: snap.exists(), fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites },
        { waitForServerWrites: true }
      )
      if (state === 'skip') return
      if (state === 'unconfirmed') return onUnconfirmed()
      onNext({ circleIds: circleIdsOf(snap.data()), roles: rolesOf(snap.data()) })
    },
    onError
  )
}
