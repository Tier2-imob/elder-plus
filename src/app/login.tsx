import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthLoginScreen } from '@/screens/AuthLoginScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn } = useAccount()

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  async function handleSubmit({ email, password }: { email: string; password: string }) {
    setSubmitting(true)
    setErrorMessage(undefined)
    try {
      // No navigation on success — RootNavigator redirects once account becomes non-null.
      await signIn({ email, password })
    } catch (e) {
      setErrorMessage(toPtMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLoginScreen
      topInset={insets.top}
      onBack={() => router.back()}
      onSubmit={handleSubmit}
      submitting={submitting}
      errorMessage={errorMessage}
    />
  );
}
