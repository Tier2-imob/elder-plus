import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import type { AccountRole } from '@/components/types';
import { TERMS_VERSION } from '@/constants/constants';
import {
    assertNotLockedOut,
    clearLockout,
    registerFailedAttempt,
} from '@/services/auth-lockout';
import type { AuthUser } from '@/services/firebase/auth';
import * as auth from '@/services/firebase/auth';
import * as favorites from '@/services/firebase/favorites';
import type { UserProfile } from '@/services/firebase/types';
import * as users from '@/services/firebase/users';
import { clearAllCaches, readCache, writeCache } from '@/services/local-cache';

/** `role` = primary profile (signup); `roles` = every profile of the account (includes `role`). */
type Account = { name: string; role: AccountRole; roles: AccountRole[]; uid: string } | null

/** Last resolved account, so a returning user enters the app without waiting for Firestore. */
const ACCOUNT_CACHE_KEY = 'account'

/** Minimum time between two server checks of the session (see checkSession). */
const SESSION_CHECK_INTERVAL_MS = 60_000

type AccountContextValue = {
    account: Account
    loading: boolean
    signUp: (input: { name: string; role: AccountRole; email: string; password: string; acceptedTerms: boolean }) => Promise<void>
    signIn: (input: { email: string; password: string }) => Promise<void>
    signInWithGoogle: (
        input: { mode: 'signup'; name?: string; role: AccountRole } | { mode: 'signin' }
    ) => Promise<void>
    signOut: () => Promise<void>
    /** Add a profile (elder or family) to the account; partner only exists from signup. */
    addProfile: (role: Exclude<AccountRole, 'partner'>) => Promise<void>
    /** Send the password-reset e-mail (same outcome whether or not the e-mail has an account). */
    requestPasswordReset: (email: string) => Promise<void>
    /** Why the user was signed out without asking (e.g. the password was changed), if so. */
    sessionNotice: string | undefined
    clearSessionNotice: () => void
    favorites: Set<string>
    toggleFavorite: (id: string) => void
    isFavorite: (id: string) => boolean
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }){
    const [account, setAccount] = useState<Account>(null)
    const [loading, setLoading] = useState(true)
    // Why the user was signed out without asking (shown on the sign-in screens until the next sign-in).
    const [sessionNotice, setSessionNotice] = useState<string | undefined>(undefined)
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
    const [, setProfileError] = useState<string | undefined>(undefined)

    const favoritesRef = useRef(favoriteIds)
    useEffect(() => {
        favoritesRef.current = favoriteIds
    }, [favoriteIds])

    // UIDs whose profile was just created/confirmed by an explicit signUp/signInWithGoogle call.
    // The sign-UP paths await createProfile before returning, then set the account directly. The
    // auth-state listener, however, can fire the instant Firebase authenticates — BEFORE that write
    // lands — and read a null profile. This guard lets such an early, stale listener callback skip
    // its 'no profile' branch for a uid we are actively provisioning, so it cannot clobber the
    // account the explicit path is about to set. It never masks the genuine no-profile case
    // (Google mode:'signin' / an interrupted signup), because those uids are never recorded here.
    const provisioningUidsRef = useRef<Set<string>>(new Set())

    // Load favorites for a signed-in uid; never throws (empties the set on failure).
    const loadFavorites = useCallback(async (uid: string) => {
        try {
            const ids = await favorites.listFavorites(uid)
            setFavoriteIds(new Set(ids))
        } catch (e) {
            console.warn('favorites load failed', e)
            setFavoriteIds(new Set())
        }
    }, [])

    // Shared account resolver: read the profile for a known-authenticated user and commit the
    // account state (the same `account` RootNavigator reacts to). Used by both the auth-state
    // listener and the explicit post-signup resolution so navigation never depends solely on a
    // listener callback that may have already fired too early.
    // Returns the account, null when the profile does not exist, or undefined when it could not be
    // read (network) — the listener keeps a cached account in that last case instead of signing out.
    const resolveAccount = useCallback(
        async (user: AuthUser): Promise<Account | undefined> => {
            let profile: UserProfile | null
            try {
                profile = await users.getProfile(user.uid)
            } catch (e) {
                console.warn('profile load failed', e)
                return undefined
            }

            if (!profile) {
                return null
            }

            const next: Account = { name: profile.name, role: profile.role, roles: profile.roles, uid: user.uid }
            setAccount(next)
            setSessionNotice(undefined)
            void writeCache(ACCOUNT_CACHE_KEY, next)
            // Favorites are not needed to show the first screen: load them without blocking.
            void loadFavorites(user.uid)
            return next
        },
        [loadFavorites]
    )

    useEffect(() => {
        const unsub = auth.observeAuth(async (user) => {
            try {
                if (!user) {
                    setAccount(null)
                    setFavoriteIds(new Set())
                    // Session over (logout, revoked or expired): wipe every cached entry from the
                    // device — profile and the circle's tasks — not just the account.
                    void clearAllCaches()
                    return
                }

                // Returning user: enter the app right away with the cached account, then refresh
                // the profile from Firestore in the background.
                const cached = await readCache<NonNullable<Account>>(ACCOUNT_CACHE_KEY)
                const hasCached = cached?.uid === user.uid
                if (hasCached) {
                    setAccount({ ...cached, roles: cached.roles ?? [cached.role] })
                    setLoading(false)
                }

                const resolved = await resolveAccount(user)
                if (resolved) return
                // Profile unreadable (offline, timeout) but known from cache: stay signed in.
                if (resolved === undefined && hasCached) return

                // Profile not found. If this uid is being provisioned by an in-flight explicit
                // signUp/signInWithGoogle, this is the known listener-timing race: the profile
                // write has not landed yet. Skip the 'no profile' branch and let the explicit path
                // set the account once createProfile resolves.
                if (provisioningUidsRef.current.has(user.uid)) return

                // Genuine 'no app profile' case (signup interrupted after createUser but before the
                // profile write, or a Google mode:'signin' with no Elder profile): treat as
                // signed-out at the app layer + surface a one-time error.
                setAccount(null)
                setFavoriteIds(new Set())
                void clearAllCaches()
                setProfileError('Não foi possível carregar seu perfil. Entre novamente.')
            } finally {
                setLoading(false)
            }
        })

        return unsub
    }, [resolveAccount])

    const signUp = useCallback(
        async (input: { name: string; role: AccountRole; email: string; password: string; acceptedTerms: boolean }) => {
            const role = users.normalizeRole(input.role)
            if (role === 'partner') {
                // Partner is blocked in Wave 1 BEFORE any Firebase call: no auth user and no
                // users/{uid} profile is ever created for a partner.
                const error = new Error('partner-not-available') as Error & { code?: string }
                error.code = 'app/partner-not-available'
                throw error
            }
            if (input.acceptedTerms !== true) {
                // Defense in depth: the screen gates "Continuar" on acceptance, but never create an
                // auth user / profile without recorded consent — block BEFORE any Firebase call,
                // mirroring the partner-block pattern.
                const error = new Error('terms-not-accepted') as Error & { code?: string }
                error.code = 'app/terms-not-accepted'
                throw error
            }
            // auth.signUp awaits createProfile before resolving, so the profile is guaranteed to
            // exist once this returns. Resolve the account here directly instead of relying on the
            // auth-state listener, which may have fired before the profile write landed.
            const user = await auth.signUp({
                name: input.name,
                role,
                email: input.email,
                password: input.password,
                termsVersion: TERMS_VERSION,
            })
            provisioningUidsRef.current.add(user.uid)
            try {
                await resolveAccount(user)
            } finally {
                provisioningUidsRef.current.delete(user.uid)
            }
        },
        [resolveAccount]
    )

    const signIn = useCallback(async (input: { email: string; password: string }) => {
        // Client-side temporary lockout (no backend): while blocked, reject BEFORE touching
        // Firebase so a locked account never reaches the network. A failed attempt increments the
        // per-email counter; the 5th failure starts the cooldown. A success clears it.
        assertNotLockedOut(input.email)
        try {
            await auth.signIn(input)
        } catch (e) {
            const lockout = registerFailedAttempt(input.email)
            // If this failure triggered the block, surface the lockout error (with remaining time)
            // instead of the raw Firebase credential error.
            throw lockout ?? e
        }
        clearLockout(input.email)
    }, [])

    const signInWithGoogle = useCallback(
        async (input: { mode: 'signup'; name?: string; role: AccountRole } | { mode: 'signin' }) => {
            if (input.mode === 'signup' && users.normalizeRole(input.role) === 'partner') {
                // Partner is blocked before any Google/Firebase call, mirroring the email signUp
                // guard (auth.signInWithGoogle also guards defensively).
                const error = new Error('partner-not-available') as Error & { code?: string }
                error.code = 'app/partner-not-available'
                throw error
            }
            // auth.signInWithGoogle awaits createProfile (signup mode) or rejects with
            // 'app/no-profile' (signin mode, no Elder profile) before resolving. On success the
            // profile is guaranteed to exist, so resolve the account here directly rather than
            // depending on a listener callback that may have fired before the write landed.
            const user = await auth.signInWithGoogle(input)
            provisioningUidsRef.current.add(user.uid)
            try {
                await resolveAccount(user)
            } finally {
                provisioningUidsRef.current.delete(user.uid)
            }
        },
        [resolveAccount]
    )

    const signOut = useCallback(async () => {
        await auth.logout()
    }, [])

    const addProfile = useCallback(
        async (role: Exclude<AccountRole, 'partner'>) => {
            if (!account) return
            await users.addRole(account.uid, role)
            const next: Account = { ...account, roles: [...new Set([...account.roles, role])] }
            setAccount(next)
            void writeCache(ACCOUNT_CACHE_KEY, next)
        },
        [account]
    )

    const requestPasswordReset = useCallback(async (email: string) => {
        await auth.requestPasswordReset(email.trim())
    }, [])

    // Sessions end when the password changes: a reset revokes every refresh token of the account.
    // Confirm the session with the server on start and each time the app comes back to the
    // foreground (at most once a minute), instead of waiting up to an hour for the ID token to expire.
    const clearSessionNotice = useCallback(() => setSessionNotice(undefined), [])
    const lastSessionCheckRef = useRef(0)
    useEffect(() => {
        if (!account) return
        let active = true
        const check = () => {
            const now = Date.now()
            if (now - lastSessionCheckRef.current < SESSION_CHECK_INTERVAL_MS) return
            lastSessionCheckRef.current = now
            auth.verifySession().then((result) => {
                if (!active || result !== 'revoked') return
                setSessionNotice('Sua senha foi alterada ou sua sessão expirou. Entre novamente para continuar.')
                auth.logout().catch((e) => console.warn('logout after revoked session failed', e))
            })
        }
        check()
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') check()
        })
        return () => {
            active = false
            subscription.remove()
        }
    }, [account])

    const toggleFavorite = useCallback((id: string) => {
        if (!account) return
        const wasFavorite = favoritesRef.current.has(id)
        setFavoriteIds((prev) => {
            const next = new Set(prev)
            if (wasFavorite) next.delete(id)
            else next.add(id)
            return next
        })
        const op = wasFavorite
            ? favorites.removeFavorite(account.uid, id)
            : favorites.addFavorite(account.uid, id)
        op.catch((e) => {
            console.warn('toggleFavorite failed', e)
            setFavoriteIds((prev) => {
                const next = new Set(prev)
                if (wasFavorite) next.add(id)
                else next.delete(id)
                return next
            })
        })
    }, [account])

    const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])

    const value = useMemo(
        () => ({
            account,
            loading,
            signUp,
            signIn,
            signInWithGoogle,
            signOut,
            addProfile,
            requestPasswordReset,
            sessionNotice,
            clearSessionNotice,
            favorites: favoriteIds,
            toggleFavorite,
            isFavorite,
        }),
        [
            account,
            loading,
            signUp,
            signIn,
            signInWithGoogle,
            signOut,
            addProfile,
            requestPasswordReset,
            sessionNotice,
            clearSessionNotice,
            favoriteIds,
            toggleFavorite,
            isFavorite,
        ]
    )

    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(){
    const context = useContext(AccountContext)
    if (!context){
        throw new Error('useAccount precisa ser usado dentro de um AccountProvider')
    }

    return context
}
