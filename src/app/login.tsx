import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthLoginScreen } from '@/screens/AuthLoginScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn, signInWithGoogle } = useAccount()

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

  async function handleGoogle() {
    setSubmitting(true)
    setErrorMessage(undefined)
    try {
      // Pure sign-in: a Google account with no Elder profile is rejected with 'app/no-profile',
      // surfaced via toPtMessage. No navigation — RootNavigator owns auth navigation.
      await signInWithGoogle({ mode: 'signin' })
    } catch (e) {
      // A user-cancelled Google flow is not an error — swallow the sentinel silently.
      if (e && typeof e === 'object' && (e as { code?: string }).code === 'app/google-cancelled') {
        setErrorMessage(undefined)
      } else {
        setErrorMessage(toPtMessage(e))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLoginScreen
      topInset={insets.top}
      onBack={() => router.back()}
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      submitting={submitting}
      errorMessage={errorMessage}
    />
  );
}
