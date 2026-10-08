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

import type { AccountRole } from '@/components/types';
import * as auth from '@/services/firebase/auth';
import * as favorites from '@/services/firebase/favorites';
import type { UserProfile } from '@/services/firebase/types';
import * as users from '@/services/firebase/users';

type Account = { name: string; role: AccountRole; uid: string } | null

type AccountContextValue = {
    account: Account
    loading: boolean
    signUp: (input: { name: string; role: AccountRole; email: string; password: string }) => Promise<void>
    signIn: (input: { email: string; password: string }) => Promise<void>
    signOut: () => Promise<void>
    favorites: Set<string>
    toggleFavorite: (id: string) => void
    isFavorite: (id: string) => boolean
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }){
    const [account, setAccount] = useState<Account>(null)
    const [loading, setLoading] = useState(true)
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
    const [, setProfileError] = useState<string | undefined>(undefined)

    const favoritesRef = useRef(favoriteIds)
    useEffect(() => {
        favoritesRef.current = favoriteIds
    }, [favoriteIds])

    useEffect(() => {
        const unsub = auth.observeAuth(async (user) => {
            try {
                if (!user) {
                    setAccount(null)
                    setFavoriteIds(new Set())
                    return
                }

                let profile: UserProfile | null = null
                try {
                    profile = await users.getProfile(user.uid)
                } catch (e) {
                    console.warn('profile load failed', e)
                }

                if (!profile) {
                    // Auth user exists but no app profile (e.g. signup interrupted after
                    // createUser but before the profile write): treat as signed-out at the app
                    // layer + surface a one-time error.
                    setAccount(null)
                    setFavoriteIds(new Set())
                    setProfileError('Não foi possível carregar seu perfil. Entre novamente.')
                    return
                }

                setAccount({ name: profile.name, role: profile.role, uid: user.uid })

                try {
                    const ids = await favorites.listFavorites(user.uid)
                    setFavoriteIds(new Set(ids))
                } catch (e) {
                    console.warn('favorites load failed', e)
                    setFavoriteIds(new Set())
                }
            } finally {
                setLoading(false)
            }
        })

        return unsub
    }, [])

    const signUp = useCallback(
        async (input: { name: string; role: AccountRole; email: string; password: string }) => {
            const role = users.normalizeRole(input.role)
            if (role === 'partner') {
                // Partner is blocked in Wave 1 BEFORE any Firebase call: no auth user and no
                // users/{uid} profile is ever created for a partner.
                const error = new Error('partner-not-available') as Error & { code?: string }
                error.code = 'app/partner-not-available'
                throw error
            }
            await auth.signUp({ name: input.name, role, email: input.email, password: input.password })
        },
        []
    )

    const signIn = useCallback(async (input: { email: string; password: string }) => {
        await auth.signIn(input)
    }, [])

    const signOut = useCallback(async () => {
        await auth.logout()
    }, [])

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
            signOut,
            favorites: favoriteIds,
            toggleFavorite,
            isFavorite,
        }),
        [account, loading, signUp, signIn, signOut, favoriteIds, toggleFavorite, isFavorite]
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
