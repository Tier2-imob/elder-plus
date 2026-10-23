import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { APPOINTMENT_STATS, FAMILY_MEMBERS, HEALTH_REMINDERS } from '@/data/care-private-data'
import { useMedications } from '@/hooks/useMedications'
import { CareScreen } from '@/screens/CareScreen'
import { CircleSetupScreen, type CircleSetupMode } from '@/screens/CircleSetupScreen'
import { circleErrorMessage, hasPermission } from '@/services/circle-rules'
import { useAccount } from '@/state/account-context'
import { useCareTasks } from '@/state/care-tasks-context'
import { toFamilyMember, useCircle } from '@/state/circle-context'

export default function Care() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const {
    tasks,
    doneIds,
    tasksLoading,
    create,
    complete,
    uncomplete,
    rescheduleTime,
    assignTo,
    changeCategory,
    remove,
  } = useCareTasks()
  const { circleLoading, circle, membership, members, createCircle } = useCircle()
  const meds = useMedications(
    !circleLoading && circle && hasPermission(membership, 'ver-saude') ? circle.id : undefined
  )

  const onNavigate = (key: string) => {
    // navigate (not replace): switches back to the mounted Explore tab; replace stacked a new
    // Explore on every round trip and refetched its data.
    if (key === 'explore') router.navigate('/explore')
  }

  // Routine/health/family only open for an active member of a circle.
  if (account?.role === 'partner' || circleLoading || !circle || membership?.status !== 'ativo') {
    const mode: CircleSetupMode =
      account?.role === 'partner'
        ? 'partner'
        : circleLoading
          ? 'loading'
          : membership?.status === 'pendente'
            ? 'pending'
            : 'create'
    return (
      <CircleSetupScreen
        mode={mode}
        isElder={account?.role === 'elder'}
        circleName={circle?.subject.name}
        onCreate={async (subjectName) => {
          try {
            await createCircle(subjectName)
          } catch (e) {
            console.warn('createCircle failed', e)
            throw new Error(circleErrorMessage(e))
          }
        }}
        onNavigate={onNavigate}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    )
  }

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
      circleName={circle.subject.name}
      circleMembers={members.map(toFamilyMember)}
      onToggleDone={(taskId, isDone) => {
        if (isDone) uncomplete(taskId)
        else complete(taskId)
      }}
      onReschedule={rescheduleTime}
      onAssign={assignTo}
      onChangeTaskCategory={changeCategory}
      onDeleteTask={remove}
      onCreateTask={(input) => create(input, account?.name ?? '')}
      onRecordDose={meds.recordDose}
      onUndoDose={meds.undoDose}
      onCreateMedication={meds.create}
      onUpdateMedication={meds.update}
      onDeleteMedication={meds.remove}
      onNavigate={onNavigate}
    />
  )
}
