import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginScreen } from '@/screens/LoginScreen';
import type { AccountRole } from '@/components/types';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleSelectRole(role: AccountRole) {
    router.push({ pathname: '/signup', params: { role } });
  }

  return (
    <LoginScreen
      topInset={insets.top}
      onSelectRole={handleSelectRole}
      // "Já tenho conta — Entrar" ainda não tem destino: o fluxo de login
      // pra quem já é usuário não existe neste projeto novo ainda.
      // onLogin={() => router.push('/algum-lugar')}
      backgroundIlustration={require('@/assets/images/ilustrations/an-elderly-couple-walking-hand-in-hand-along-a-win.jpg')}
      brandMark={require('@/assets/images/brand/Simbolo - azul.png')}
    />
  );
}
