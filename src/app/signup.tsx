import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AccountRole } from '@/components/types'
import { SignupScreen } from '@/screens/SignupScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

export default function Signup() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { role: rawRole } = useLocalSearchParams<{ role?: string }>()
  const { signUp } = useAccount()

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  const role: AccountRole = rawRole === 'partner' ? 'partner' : rawRole === 'elder' ? 'elder' : 'family'

  async function handleContinue({ name, email, password }: { name: string; email: string; password: string }) {
    setSubmitting(true)
    setErrorMessage(undefined)
    try {
      // No navigation here. For elder/family, signUp succeeds, account becomes non-null, and
      // RootNavigator (the single redirect owner) replaces to /explore. For partner, signUp throws
      // 'app/partner-not-available' before any session exists.
      await signUp({ name, role, email, password })
    } catch (e) {
      setErrorMessage(toPtMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SignupScreen
      role={role}
      topInset={insets.top}
      onBack={() => router.back()}
      onContinue={handleContinue}
      submitting={submitting}
      errorMessage={errorMessage}
      asset={require('@/assets/images/ilustrations/a-man-seen-from-behind-standing-on-a-path--looking.jpg')}
    />
  );
}
