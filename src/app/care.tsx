import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  APPOINTMENT_STATS,
  FAMILY_MEMBERS,
  HEALTH_REMINDERS,
  MEDICATIONS,
} from '@/data/care-private-data'
import { useCareTasks } from '@/hooks/useCareTasks'
import { CareScreen } from '@/screens/CareScreen'
import { useAccount } from '@/state/account-context'

export default function Care() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const { tasks, doneIds, tasksLoading, complete, uncomplete, rescheduleTime, assignTo } =
    useCareTasks(account?.uid)

  return (
    <CareScreen
      topInset={insets.top}
      bottomInset={insets.bottom}
      tasks={tasks}
      doneIds={doneIds}
      tasksLoading={tasksLoading}
      medications={MEDICATIONS}
      healthReminders={HEALTH_REMINDERS}
      healthStats={APPOINTMENT_STATS}
      familyMembers={FAMILY_MEMBERS}
      onToggleDone={(taskId, isDone) => {
        if (isDone) uncomplete(taskId)
        else complete(taskId)
      }}
      onReschedule={rescheduleTime}
      onAssign={assignTo}
      onNavigate={(key) => {
        if (key === 'explore') router.replace('/explore')
      }}
    />
  )
}
