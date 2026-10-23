import { Tabs } from 'expo-router'

import { useAccount } from '@/state/account-context'
import { CareTasksProvider } from '@/state/care-tasks-context'
import { CircleProvider } from '@/state/circle-context'

/**
 * Explorar and Cuidados as tabs: both stay mounted once visited, so switching between them is
 * instant and never refetches. Each screen draws its own FloatingNav (the default tab bar is
 * hidden). The circle and tasks providers wrap both so they share one live state.
 */
export default function TabsLayout() {
  const { account } = useAccount()

  return (
    <CircleProvider account={account}>
      <CareTasksProvider>
        <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
          <Tabs.Screen name="explore" />
          <Tabs.Screen name="care" />
        </Tabs>
      </CareTasksProvider>
    </CircleProvider>
  )
}
