import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';

import type { AccountRole } from '@/components/types';

type Account = {  name: string, role: AccountRole } | null

type AccountContextValue = {
    account: Account
    setAccount: (account: Account) => void
    favorites: Set<string>
    toggleFavorite: (id: string) => void
    isFavorite: (id: string) => boolean
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }){
    const [account, setAccount] = useState<Account>(null)
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    
    const toggleFavorite = useCallback((id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)

            return next
        })
    }, [])

    const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])
    const value = useMemo(
        () => ({account, setAccount, favorites, toggleFavorite, isFavorite}),
        [account, favorites, toggleFavorite, isFavorite]
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