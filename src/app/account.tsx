import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AccountScreen } from '@/screens/AccountScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

export default function Account() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account, addProfile, signOut } = useAccount()

  if (!account) return null

  return (
    <AccountScreen
      name={account.name}
      roles={account.roles}
      topInset={insets.top}
      onAddProfile={async (role) => {
        try {
          await addProfile(role)
        } catch (e) {
          console.warn('addProfile failed', e)
          throw new Error(toPtMessage(e))
        }
      }}
      // No navigation: RootNavigator sends a signed-out user to the start screen.
      onSignOut={() => void signOut()}
      onBack={() => router.back()}
    />
  )
}
