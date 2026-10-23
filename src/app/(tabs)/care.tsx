import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { APPOINTMENT_STATS, FAMILY_MEMBERS, HEALTH_REMINDERS } from '@/data/care-private-data'
import { useMedications } from '@/hooks/useMedications'
import { CareScreen } from '@/screens/CareScreen'
import { useAccount } from '@/state/account-context'
import { useCareTasks } from '@/state/care-tasks-context'

export default function Care() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const { tasks, doneIds, tasksLoading, create, complete, uncomplete, rescheduleTime, assignTo } =
    useCareTasks()
  const meds = useMedications(account?.uid)

  return (
    <CareScreen
      topInset={insets.top}
      bottomInset={insets.bottom}
      tasks={tasks}
      doneIds={doneIds}
      tasksLoading={tasksLoading}
      medications={meds.medications}
      medsAdherence={meds.medsAdherence}
      medicationsLoading={meds.medicationsLoading}
      medicationsError={meds.medicationsError}
      healthReminders={HEALTH_REMINDERS}
      healthStats={APPOINTMENT_STATS}
      familyMembers={FAMILY_MEMBERS}
      onToggleDone={(taskId, isDone) => {
        if (isDone) uncomplete(taskId)
        else complete(taskId)
      }}
      onReschedule={rescheduleTime}
      onAssign={assignTo}
      onCreateTask={(input) => create(input, account?.name ?? '')}
      onRecordDose={meds.recordDose}
      onUndoDose={meds.undoDose}
      onCreateMedication={meds.create}
      onUpdateMedication={meds.update}
      onDeleteMedication={meds.remove}
      onNavigate={(key) => {
        // navigate (not replace): switches back to the mounted Explore tab; replace stacked a new
        // Explore on every round trip and refetched its data.
        if (key === 'explore') router.navigate('/explore')
      }}
    />
  )
}
