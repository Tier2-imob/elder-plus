import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCareTasks } from '@/hooks/useCareTasks'
import { CareScreen } from '@/screens/CareScreen'
import { useAccount } from '@/state/account-context'

export default function Care() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const { tasks, doneIds, tasksLoading, complete } = useCareTasks(account?.uid)

  return (
    <CareScreen
      topInset={insets.top}
      bottomInset={insets.bottom}
      tasks={tasks}
      doneIds={doneIds}
      tasksLoading={tasksLoading}
      onComplete={complete}
      onNavigate={(key) => {
        if (key === 'explore') router.replace('/explore')
      }}
    />
  )
}
