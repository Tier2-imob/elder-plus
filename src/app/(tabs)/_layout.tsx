import { Tabs } from 'expo-router'

import { CareTasksProvider } from '@/state/care-tasks-context'
import { useAccount } from '@/state/account-context'

/**
 * Explorar and Cuidados as tabs: both stay mounted once visited, so switching between them is
 * instant and never refetches. Each screen draws its own FloatingNav (the default tab bar is
 * hidden). The tasks provider wraps both so they share one live task list.
 */
export default function TabsLayout() {
  const { account } = useAccount()

  return (
    <CareTasksProvider uid={account?.uid}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="care" />
      </Tabs>
    </CareTasksProvider>
  )
}
