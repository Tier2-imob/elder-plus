import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import { AccountProvider, useAccount } from '@/state/account-context'
import '../../global.css'

SplashScreen.preventAutoHideAsync()

const AUTH_ROUTES = ['index', 'login', 'signup'] as const

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { account, loading } = useAccount()
  const segments = useSegments()
  const router = useRouter()

  // Hide the native splash only once BOTH fonts and the auth/profile state are resolved,
  // so the user never sees an unstyled or pre-auth frame (AC-1).
  useEffect(() => {
    if (fontsReady && !loading) SplashScreen.hideAsync()
  }, [fontsReady, loading])

  // Single source of truth for auth-state navigation. The signup/login wrappers never call
  // router.replace to a protected route; they only set their local submitting/errorMessage.
  useEffect(() => {
    if (!fontsReady || loading) return
    const current = segments[0] ?? 'index'
    const inAuthRoute = (AUTH_ROUTES as readonly string[]).includes(current)
    // signed out on a protected route → back to the role picker/login entry
    if (!account && !inAuthRoute) {
      router.replace('/')
      return
    }
    // signed in while sitting on an auth route (index/login/signup) → into the app.
    if (account && inAuthRoute) router.replace('/explore')
  }, [account, loading, fontsReady, segments, router])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="business" />
      <Stack.Screen name="care" />
      <Stack.Screen name="documents" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'HankenGrotesk-Regular':   require('@/assets/fonts/HankenGrotesk-Regular.ttf'),
    'HankenGrotesk-SemiBold':  require('@/assets/fonts/HankenGrotesk-SemiBold.ttf'),
    'HankenGrotesk-Bold':      require('@/assets/fonts/HankenGrotesk-Bold.ttf'),
    'HankenGrotesk-ExtraBold': require('@/assets/fonts/HankenGrotesk-ExtraBold.ttf'),
  })

  return (
    <AccountProvider>
      <RootNavigator fontsReady={!!(fontsLoaded || fontError)} />
    </AccountProvider>
  )
}
