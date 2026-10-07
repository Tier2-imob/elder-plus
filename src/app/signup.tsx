import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AccountRole } from '@/components/types'
import { SignupScreen } from '@/screens/SignupScreen'
import { useAccount } from '@/state/account-context'

export default function Signup() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { role: rawRole } = useLocalSearchParams<{ role?: string }>()
  const { setAccount } = useAccount()

  const role: AccountRole = rawRole === 'partner' ? 'partner' : rawRole === 'elder' ? 'elder' : 'family'

  function handleContinue(name: string) {
    setAccount({ name, role })

    if (role === 'partner') {
      // TODO: o Portal do Parceiro ainda não existe neste projeto novo.
      // Por enquanto o cadastro de parceiro fica sem destino.
      return;
    }

    // Idoso e Família caem na mesma tela Explorar por enquanto.
    router.replace('/explore');
  }

  return (
    <SignupScreen
      role={role}
      topInset={insets.top}
      onBack={() => router.back()}
      onContinue={handleContinue}
      asset={require('@/assets/images/ilustrations/a-man-seen-from-behind-standing-on-a-path--looking.jpg')}
    />
  );
}