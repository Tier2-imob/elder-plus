import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

import '../../global.css'
import { AccountProvider } from '@/state/account-context'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'HankenGrotesk-Regular':   require('@/assets/fonts/HankenGrotesk-Regular.ttf'),
    'HankenGrotesk-SemiBold':  require('@/assets/fonts/HankenGrotesk-SemiBold.ttf'),
    'HankenGrotesk-Bold':      require('@/assets/fonts/HankenGrotesk-Bold.ttf'),
    'HankenGrotesk-ExtraBold': require('@/assets/fonts/HankenGrotesk-ExtraBold.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <AccountProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="discover" />
        <Stack.Screen name="business" />
        <Stack.Screen name="care" />
      </Stack>
    </AccountProvider>
  )
}