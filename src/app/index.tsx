import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AccountRole } from '@/components/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { useAccount } from '@/state/account-context';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, loading } = useAccount();

  function handleSelectRole(role: AccountRole) {
    router.push({ pathname: '/signup', params: { role } });
  }

  // While Firebase restores the persisted session (and the profile is read), render a blank
  // screen instead of the role picker, so a returning user never sees it flash.
  if (loading) return <View className='flex-1 bg-offwhite' />;
  // Already signed in → straight into the app.
  if (account) return <Redirect href='/explore' />;

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
