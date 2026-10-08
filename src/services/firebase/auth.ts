import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from 'firebase/auth'

import type { AccountRole } from '@/components/types'

import { auth } from './config'
import { createProfile } from './users'

/**
 * Create an auth user and its users/{uid} profile. On a profile-write failure the just-created
 * auth user is cleaned up (deleteUser, falling back to signOut) BEFORE the promise rejects, so no
 * stranded half-account lingers. NOTE: this does NOT guard the 'partner' role — that guard lives in
 * AccountContext (FEAT-002) and runs before auth.signUp is ever called.
 */
export async function signUp(input: {
  name: string
  role: AccountRole
  email: string
  password: string
}): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password)
  try {
    await createProfile(cred.user.uid, {
      name: input.name,
      role: input.role,
      email: input.email,
    })
  } catch (profileError) {
    // Clean up the just-created auth user before rejecting so the email is freed for a retry.
    try {
      await deleteUser(cred.user)
    } catch {
      await firebaseSignOut(auth)
    }
    throw profileError
  }
  return cred.user
}

/** Sign in with email + password. */
export async function signIn(input: {
  email: string
  password: string
}): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, input.email, input.password)
}

/** Sign out the current user. */
export async function logout(): Promise<void> {
  await firebaseSignOut(auth)
}

/** Subscribe to auth-state changes. Returns the unsubscribe function. */
export function observeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb)
}
