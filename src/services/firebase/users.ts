import { doc, getDoc, serverTimestamp, setDoc, type FieldValue } from 'firebase/firestore'

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
    email: data.email,
    createdAt: data.createdAt ?? null,
    termsAcceptedAt: data.termsAcceptedAt ?? null,
    termsVersion: data.termsVersion ?? '',
  }
}
