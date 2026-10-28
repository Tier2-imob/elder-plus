import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthLoginScreen } from '@/screens/AuthLoginScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn, signInWithGoogle, sessionNotice } = useAccount()

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  // Remaining client-side lockout, in seconds. 0 = not locked. Drives the disabled button state
  // and counts down so the "tente novamente em Ns" message stays accurate without a re-tap.
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  // Tick the lockout countdown once per second while blocked, refreshing the message text.
  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const id = setInterval(() => {
      setLockoutSeconds((prev) => {
        const next = prev - 1
        if (next <= 0) {
          setErrorMessage(undefined)
          return 0
        }
        setErrorMessage(`Muitas tentativas. Tente novamente em ${next}s.`)
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [lockoutSeconds])

  async function handleSubmit({ email, password }: { email: string; password: string }) {
    setSubmitting(true)
    setErrorMessage(undefined)
    try {
      // No navigation on success — RootNavigator redirects once account becomes non-null.
      await signIn({ email, password })
    } catch (e) {
      setErrorMessage(toPtMessage(e))
      // When blocked by the client-side lockout, start the visible countdown and disable the form.
      if (e && typeof e === 'object' && (e as { code?: string }).code === 'app/too-many-attempts') {
        const remaining = (e as { remainingSeconds?: number }).remainingSeconds
        if (typeof remaining === 'number' && remaining > 0) setLockoutSeconds(remaining)
      }
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
      onForgotPassword={(email) => router.push({ pathname: '/forgot-password', params: { email } })}
      notice={sessionNotice}
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      submitting={submitting}
      errorMessage={errorMessage}
      disabled={lockoutSeconds > 0}
    />
  );
}
