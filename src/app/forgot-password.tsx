import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen'
import { toPtMessage } from '@/services/firebase/auth-errors'
import { useAccount } from '@/state/account-context'

/** Wait before the link can be sent again (also eases Firebase's own rate limit). */
const RESEND_COOLDOWN_S = 60

export default function ForgotPassword() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>()
  const { requestPasswordReset } = useAccount()

  const [sentTo, setSentTo] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function handleSend(email: string) {
    setSubmitting(true)
    setErrorMessage(undefined)
    try {
      await requestPasswordReset(email)
      setSentTo(email)
      setCooldown(RESEND_COOLDOWN_S)
    } catch (e) {
      console.warn('requestPasswordReset failed', e)
      setErrorMessage(toPtMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ForgotPasswordScreen
      topInset={insets.top}
      initialEmail={typeof emailParam === 'string' ? emailParam : ''}
      sentTo={sentTo}
      submitting={submitting}
      errorMessage={errorMessage}
      cooldownSeconds={cooldown}
      onSend={handleSend}
      onBack={() => router.back()}
    />
  )
}
