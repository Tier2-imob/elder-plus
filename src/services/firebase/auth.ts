import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes
} from '@react-native-google-signin/google-signin'
import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    deleteUser,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    type User,
    type UserCredential
} from 'firebase/auth'

import type { AccountRole } from '@/components/types'

import { auth } from './config'
import { createProfile, getProfile, normalizeRole } from './users'

/** Build an Error carrying an app/Firebase-style `code` for PT-BR mapping in auth-errors.ts. */
function errorWithCode(code: string, message = code): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

// Google OAuth Web client ID (type "Web") used as webClientId to obtain the Firebase idToken.
// NOTE: a native iOS client id + Android SHA-1 will be needed per-platform later when building for
// those platforms (the iosUrlScheme placeholder in app.json must also be replaced with the real
// reversed client id before any iOS build).
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '655190869254-a9vv7bu6hbdlip14nemp8lu09jvfaear.apps.googleusercontent.com'

// Configure the native Google sign-in module once at module load.
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID })

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

/**
 * Sign in with a Google account via the native development-build flow.
 *
 * - `mode: 'signup'` creates the users/{uid} profile for a NEW Google account, applying the SAME
 *   partner-block and orphan-cleanup rules as the email {@link signUp} path. For an already
 *   registered account it just signs in.
 * - `mode: 'signin'` only succeeds when a users/{uid} profile already exists; a Google account with
 *   no Elder profile is rejected with `app/no-profile` (no role can be invented on the login path).
 *
 * A user-cancelled flow rejects with the sentinel code `app/google-cancelled`, which the wrappers
 * swallow so no error is shown.
 */
export async function signInWithGoogle(
  input: { mode: 'signup'; role?: AccountRole; name?: string } | { mode: 'signin' }
): Promise<User> {
  // (a) Partner block FIRST — before any Google/Firebase call, mirroring the email signUp path.
  if (input.mode === 'signup' && normalizeRole(input.role) === 'partner') {
    throw errorWithCode('app/partner-not-available', 'partner-not-available')
  }

  let idToken: string | null
  try {
    // (b) Ensure Google Play Services is present (Android); always resolves true on iOS.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    // (c) Trigger the native Google flow.
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) {
      // Covers the cancelled response (and any non-success shape) — treated as a user cancel.
      throw errorWithCode('app/google-cancelled', 'google-cancelled')
    }
    idToken = response.data.idToken
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw errorWithCode('app/google-cancelled', 'google-cancelled')
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw errorWithCode('app/google-play-services-unavailable', 'play-services-unavailable')
      }
      throw errorWithCode('app/google-signin-failed', 'google-signin-failed')
    }
    throw error
  }

  if (!idToken) {
    throw errorWithCode('app/google-signin-failed', 'missing-id-token')
  }

  // (d) Build a Firebase credential from the Google idToken and sign in.
  const credential = GoogleAuthProvider.credential(idToken)
  const cred = await signInWithCredential(auth, credential)

  // (e) Resolve the app profile for this uid.
  const profile = await getProfile(cred.user.uid)

  if (profile) {
    // Existing user — valid for both signup and signin modes.
    return cred.user
  }

  if (input.mode === 'signin') {
    // No Elder profile for this Google account: reject and leave no lingering session.
    try {
      await firebaseSignOut(auth)
    } finally {
      await GoogleSignin.signOut().catch(() => {})
    }
    throw errorWithCode('app/no-profile', 'no-profile')
  }

  // NEW user on the signup path — create the profile, with the SAME orphan-cleanup as email signUp.
  try {
    await createProfile(cred.user.uid, {
      name: input.name ?? cred.user.displayName ?? 'Usuário',
      role: normalizeRole(input.role),
      email: cred.user.email ?? '',
    })
  } catch (profileError) {
    // Clean up the just-created auth user before rejecting so the account is freed for a retry.
    try {
      await deleteUser(cred.user)
    } catch {
      await firebaseSignOut(auth)
    }
    await GoogleSignin.signOut().catch(() => {})
    throw profileError
  }

  return cred.user
}

/** Sign out the current user. */
export async function logout(): Promise<void> {
  await firebaseSignOut(auth)
}

/** Subscribe to auth-state changes. Returns the unsubscribe function. */
export function observeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb)
}
