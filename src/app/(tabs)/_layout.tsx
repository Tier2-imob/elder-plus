import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FloatingNav } from '@/components/FloatingNav'
import { useAccount } from '@/state/account-context'
import { CareTasksProvider } from '@/state/care-tasks-context'
import { CircleProvider } from '@/state/circle-context'

/**
 * Explorar and Cuidados as tabs: both stay mounted once visited, so switching between them is
 * instant and never refetches. The FloatingNav is the tab bar and is drawn once here (not by each
 * screen), so it persists while the screens change and its selection animates. The circle and tasks
 * providers wrap both so they share one live state.
 */
export default function TabsLayout() {
  const { account } = useAccount()
  const insets = useSafeAreaInsets()

  return (
    <CircleProvider account={account}>
      <CareTasksProvider>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={({ state, navigation }) => (
            <FloatingNav
              active={state.routes[state.index].name === 'care' ? 'care' : 'explore'}
              onPress={(key) => navigation.navigate(key)}
              bottomInset={insets.bottom}
            />
          )}
        >
          <Tabs.Screen name="explore" />
          <Tabs.Screen name="care" />
        </Tabs>
      </CareTasksProvider>
    </CircleProvider>
  )
}
