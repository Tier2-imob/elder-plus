import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CIRCLE_ROLE_LABELS, type PermissionKey } from '@/components/care/types'
import { APPOINTMENT_STATS, HEALTH_REMINDERS } from '@/data/care-private-data'
import { useMedications } from '@/hooks/useMedications'
import { CareScreen } from '@/screens/CareScreen'
import { CircleSetupScreen, type CircleSetupMode, type InvitePreview } from '@/screens/CircleSetupScreen'
import {
  canDissolve,
  canLeave,
  canManage,
  circleErrorMessage,
  formatPhone,
  hasPermission,
  isAssignable,
} from '@/services/circle-rules'
import type { InviteDoc } from '@/services/firebase/types'
import { useAccount } from '@/state/account-context'
import { useCareTasks } from '@/state/care-tasks-context'
import { toFamilyMember, useCircle } from '@/state/circle-context'

const pad = (n: number) => String(n).padStart(2, '0')
const shortDay = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`

/** Run a circle action and turn any failure into an Error carrying the PT message for the screen. */
function inPortuguese<A extends unknown[], R>(label: string, action: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await action(...args)
    } catch (e) {
      console.warn(`${label} failed`, e)
      throw new Error(circleErrorMessage(e))
    }
  }
}

function roleLabelOf(invite: { role: InviteDoc['role']; label: string | null }) {
  const role = CIRCLE_ROLE_LABELS[invite.role]
  return invite.label ? `${role} — ${invite.label}` : role
}

function toInvitePreview(invite: InviteDoc): InvitePreview {
  const has = (p: PermissionKey) => invite.permissions.includes(p)
  return {
    code: invite.code,
    circleName: invite.circleName,
    invitedByName: invite.createdByName,
    roleLabel: roleLabelOf(invite).toLowerCase(),
    canSee: [has('ver-rotina') && 'a rotina', has('ver-saude') && 'a saúde'].filter(Boolean) as string[],
    canEdit: [has('editar-rotina') && 'a rotina', has('editar-saude') && 'a saúde'].filter(Boolean) as string[],
    canManage: has('gerenciar-membros'),
    expiresLabel: shortDay(invite.expiresAt.toDate()),
    isTitular: invite.role === 'titular',
  }
}

function leaveBlockedReason(code: ReturnType<typeof canLeave>): string | undefined {
  if (code === 'circle/not-allowed') return 'Como pessoa assistida, você é o centro do círculo e não pode sair dele.'
  if (code === 'circle/last-manager') return circleErrorMessage({ code })
  return undefined
}

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
  const {
    circleLoading,
    circle,
    membership,
    members,
    createCircle,
    invites,
    createInvite,
    revokeInvite,
    approveMember,
    removeMember,
    updateMember,
    leaveCircle,
    updateMyPhone,
    dissolveCircle,
    lookupInvite,
    acceptInvite,
    cancelPending,
  } = useCircle()
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
        onCreate={inPortuguese('createCircle', createCircle)}
        onLookupInvite={inPortuguese('lookupInvite', async (code: string) => toInvitePreview(await lookupInvite(code)))}
        onAcceptInvite={inPortuguese('acceptInvite', acceptInvite)}
        // The titular can never leave, not even while pending.
        onCancelPending={membership?.role === 'titular' ? undefined : inPortuguese('cancelPending', cancelPending)}
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
      // Responsible-person options: active members who can see the routine.
      familyMembers={members.filter(isAssignable).map((m) => toFamilyMember(m, membership))}
      access={{
        canSeeRoutine: hasPermission(membership, 'ver-rotina'),
        canEditRoutine: hasPermission(membership, 'editar-rotina'),
        canSeeHealth: hasPermission(membership, 'ver-saude'),
        canEditHealth: hasPermission(membership, 'editar-saude'),
      }}
      circleName={circle.subject.name}
      circleMembers={members.filter((m) => m.status === 'ativo').map((m) => toFamilyMember(m, membership))}
      familySelf={{
        phone: membership.phone,
        formatPhone,
        onSavePhone: inPortuguese('updateMyPhone', updateMyPhone),
        onLeave: inPortuguese('leaveCircle', leaveCircle),
        leaveBlockedReason: leaveBlockedReason(canLeave(membership, members)),
        onDissolve: canDissolve(membership, members, circle)
          ? inPortuguese('dissolveCircle', dissolveCircle)
          : undefined,
      }}
      familyManagement={
        canManage(membership)
          ? {
              inviterName: membership.name,
              // One titular only: not once linked, nor while a titular invite or request is open.
              canInviteTitular:
                circle.subject.uid === null &&
                !members.some((m) => m.role === 'titular') &&
                !invites.some((i) => i.role === 'titular'),
              titularLinked: circle.subject.uid !== null,
              grantable: membership.permissions,
              pendingMembers: members.filter((m) => m.status === 'pendente').map((m) => toFamilyMember(m, membership)),
              invites: invites.map((i) => ({
                code: i.code,
                roleLabel: roleLabelOf(i),
                expiresLabel: shortDay(i.expiresAt.toDate()),
              })),
              onCreateInvite: inPortuguese('createInvite', async (input) => {
                const invite = await createInvite(input)
                return { code: invite.code, expiresAt: invite.expiresAt.toDate() }
              }),
              onApprove: inPortuguese('approveMember', approveMember),
              onReject: inPortuguese('removeMember', removeMember),
              onRemoveMember: inPortuguese('removeMember', removeMember),
              onUpdateMember: inPortuguese('updateMember', updateMember),
              onRevokeInvite: inPortuguese('revokeInvite', revokeInvite),
            }
          : undefined
      }
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
