import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { InviteModal } from './InviteModal'
import {
  PERMISSION_LABELS,
  type CircleRole,
  type FamilyMember,
  type InviteSummary,
  type PermissionKey,
} from './types'

/** Everything the Família tab needs to manage the circle (present only for managers). */
export type FamilyManagement = {
  inviterName: string
  canInviteTitular: boolean
  grantable: PermissionKey[]
  pendingMembers: FamilyMember[]
  invites: InviteSummary[]
  /** All reject with a user-facing PT message. */
  onCreateInvite: (input: {
    role: CircleRole
    label?: string
    permissions: PermissionKey[]
  }) => Promise<{ code: string; expiresAt: Date }>
  onApprove: (memberId: string) => Promise<void>
  onReject: (memberId: string) => Promise<void>
  onRevokeInvite: (code: string) => Promise<void>
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="font-hanken-bold text-navy text-lg mb-3 mt-2">
      {children}
    </Text>
  )
}

/** A pill action with its own busy state (48px tall, inside a 56px+ row). */
function SmallAction({
  label,
  accessibilityLabel,
  tone,
  busy,
  onPress,
}: {
  label: string
  accessibilityLabel: string
  tone: 'primary' | 'danger' | 'neutral'
  busy: boolean
  onPress: () => void
}) {
  const style = {
    primary: { bg: '#11375C', fg: '#FFFFFF' },
    danger: { bg: 'rgba(192,57,43,0.10)', fg: '#C0392B' },
    neutral: { bg: 'rgba(17,55,92,0.06)', fg: '#11375C' },
  }[tone]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      className="min-h-[48px] px-4 rounded-2xl items-center justify-center active:opacity-70"
      style={{ backgroundColor: style.bg }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={style.fg} />
      ) : (
        <Text className="font-hanken-bold text-[15px]" style={{ color: style.fg }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function FamilyView({
  circleName,
  members,
  management,
}: {
  circleName: string
  members: FamilyMember[]
  /** Present when the viewer can manage members (convidar, aprovar). */
  management?: FamilyManagement
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  // The row action in flight ("approve:<id>", "revoke:<code>"...), and the last action error.
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | undefined>(undefined)

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return
    setBusy(key)
    setActionError(undefined)
    try {
      await action()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir.')
    } finally {
      setBusy(null)
    }
  }

  // Contato de emergência aparece no topo (privacidade by design: o círculo é
  // ordenado por papel crítico primeiro).
  const ordered = [...members].sort(
    (a, b) =>
      Number(b.permissions.includes('emergencia')) -
      Number(a.permissions.includes('emergencia'))
  )

  return (
    <View>
      {/* Círculo */}
      <View className="flex-row items-center gap-3 p-4 rounded-2xl mb-6" style={{ backgroundColor: 'rgba(17,55,92,0.05)' }}>
        <MaterialIcons name="diversity-3" size={22} color="#11375C" />
        <View className="flex-1">
          <Text className="font-hanken text-muted text-xs">Círculo de cuidado de</Text>
          <Text className="font-hanken-extrabold text-navy text-base">{circleName}</Text>
        </View>
      </View>

      {management ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Convidar pessoa para o círculo de cuidado"
          onPress={() => setInviteOpen(true)}
          className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-dashed mb-6 active:opacity-70"
          style={{ borderColor: '#11375C', backgroundColor: 'rgba(17,55,92,0.04)' }}
        >
          <MaterialIcons name="person-add" size={21} color="#11375C" />
          <Text className="font-hanken-bold text-base" style={{ color: '#11375C' }}>
            Convidar para o círculo
          </Text>
        </Pressable>
      ) : null}

      {actionError ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          className="font-hanken-medium text-terracotta text-[15px] leading-[22px] mb-4"
        >
          {actionError}
        </Text>
      ) : null}

      {/* Aguardando aprovação */}
      {management && management.pendingMembers.length ? (
        <View className="mb-4">
          <SectionTitle>Aguardando aprovação</SectionTitle>
          {management.pendingMembers.map((member) => (
            <View key={member.id} className="rounded-3xl border bg-white p-5 mb-3" style={{ borderColor: '#DD7C54' }}>
              <Text className="font-hanken-extrabold text-navy text-[17px]">{member.name}</Text>
              <Text className="font-hanken text-muted text-[15px] mb-4">{member.role}</Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <SmallAction
                    label="Aprovar"
                    accessibilityLabel={`Aprovar a entrada de ${member.name}`}
                    tone="primary"
                    busy={busy === `approve:${member.id}`}
                    onPress={() => run(`approve:${member.id}`, () => management.onApprove(member.id))}
                  />
                </View>
                <View className="flex-1">
                  <SmallAction
                    label="Recusar"
                    accessibilityLabel={`Recusar a entrada de ${member.name}`}
                    tone="danger"
                    busy={busy === `reject:${member.id}`}
                    onPress={() => run(`reject:${member.id}`, () => management.onReject(member.id))}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {management ? <SectionTitle>Membros</SectionTitle> : null}
      {ordered.map((member) => {
        const isEmergency = member.permissions.includes('emergencia')

        return (
          <View
            key={member.id}
            className="rounded-3xl border bg-white p-5 mb-4"
            style={{ borderColor: isEmergency ? '#C0392B' : '#E4DCD3' }}
          >
            <View className="flex-row items-center gap-3.5 mb-3">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: isEmergency ? 'rgba(192,57,43,0.12)' : 'rgba(17,55,92,0.08)' }}
              >
                <Text
                  className="font-hanken-extrabold text-sm"
                  style={{ color: isEmergency ? '#C0392B' : '#11375C' }}
                >
                  {member.initials}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-hanken-extrabold text-navy text-base">{member.name}</Text>
                  {isEmergency ? (
                    <MaterialIcons name="emergency" size={16} color="#C0392B" />
                  ) : null}
                </View>
                <Text className="font-hanken text-muted text-[13px]">{member.role}</Text>
              </View>
            </View>

            {/* Último acesso */}
            <View className="flex-row items-center gap-1.5 mb-3">
              <MaterialIcons name="history" size={14} color="#6B7A85" />
              <Text className="font-hanken text-muted text-xs">Último acesso: {member.lastAccess}</Text>
            </View>

            {/* Permissões ativas */}
            <View className="flex-row flex-wrap gap-2">
              {member.permissions.map((permission) => (
                <View
                  key={permission}
                  className="px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      permission === 'emergencia' ? 'rgba(192,57,43,0.12)' : 'rgba(17,55,92,0.08)',
                  }}
                >
                  <Text
                    className="font-hanken-bold text-[11px]"
                    style={{ color: permission === 'emergencia' ? '#C0392B' : '#11375C' }}
                  >
                    {PERMISSION_LABELS[permission]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )
      })}

      {/* Convites enviados */}
      {management && management.invites.length ? (
        <View className="mt-2">
          <SectionTitle>Convites enviados</SectionTitle>
          {management.invites.map((invite) => (
            <View
              key={invite.code}
              className="min-h-[56px] flex-row items-center gap-3 rounded-2xl border border-hairline bg-white px-4 py-3 mb-3"
            >
              <View className="flex-1">
                <Text selectable className="font-hanken-bold text-navy text-base tracking-wider">
                  {invite.code}
                </Text>
                <Text className="font-hanken text-muted text-sm">
                  {invite.roleLabel} · válido até {invite.expiresLabel}
                </Text>
              </View>
              <SmallAction
                label="Cancelar"
                accessibilityLabel={`Cancelar o convite ${invite.code}`}
                tone="neutral"
                busy={busy === `revoke:${invite.code}`}
                onPress={() => run(`revoke:${invite.code}`, () => management.onRevokeInvite(invite.code))}
              />
            </View>
          ))}
        </View>
      ) : null}

      {inviteOpen && management ? (
        <InviteModal
          circleName={circleName}
          inviterName={management.inviterName}
          canInviteTitular={management.canInviteTitular}
          grantable={management.grantable}
          onCreate={management.onCreateInvite}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
    </View>
  )
}
