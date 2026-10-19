import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AccountRole } from '@/components/types';
import { LoginScreen } from '@/screens/LoginScreen';

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
      onLogin={() => router.push('/login')}
      backgroundIlustration={require('@/assets/images/ilustrations/an-elderly-couple-walking-hand-in-hand-along-a-win.jpg')}
      brandMark={require('@/assets/images/brand/Simbolo - azul.png')}
    />
  );
}
