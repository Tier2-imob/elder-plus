import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native'

import { InviteModal } from './InviteModal'
import { MemberEditModal } from './MemberEditModal'
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
  /** The assisted person's account is already linked (a second titular can't be approved). */
  titularLinked: boolean
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
  onUpdateMember: (
    memberId: string,
    changes: { role: CircleRole; label: string | null; permissions: PermissionKey[] }
  ) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
}

/** What every member can do about their own participation. */
export type FamilySelf = {
  /** Digits, or null. */
  phone: string | null
  /** Formats digits for display ("(11) 91234-5678"). */
  formatPhone: (digits: string) => string
  /** Both reject with a user-facing PT message. */
  onSavePhone: (phone: string) => Promise<void>
  onLeave: () => Promise<void>
  /** Why leaving is not possible right now (titular, last manager), if so. */
  leaveBlockedReason?: string
  /** Alone in the circle: leaving deletes it (and all its data). */
  onDissolve?: () => Promise<void>
}

/** "Você neste círculo": own phone and leaving. */
function SelfSection({ self }: { self: FamilySelf }) {
  const [phone, setPhone] = useState(self.phone ? self.formatPhone(self.phone) : '')
  const [busy, setBusy] = useState<'phone' | 'leave' | 'dissolve' | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDissolve, setConfirmDissolve] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | undefined>(undefined)

  async function run(kind: 'phone' | 'leave' | 'dissolve', action: () => Promise<void>, success?: string) {
    if (busy) return
    setBusy(kind)
    setMessage(undefined)
    try {
      await action()
      if (success) setMessage({ text: success, error: false })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Não foi possível concluir.', error: true })
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className="mt-4 rounded-3xl border border-hairline bg-white p-5">
      <Text accessibilityRole="header" className="font-hanken-bold text-navy text-lg mb-3">
        Você neste círculo
      </Text>
      <Text className="font-hanken-medium text-navy text-[15px] mb-2">Meu telefone</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="(11) 91234-5678"
          placeholderTextColor="#6B7A85"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          accessibilityLabel="Meu telefone, com DDD"
          className="flex-1 min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-base text-ink"
        />
        <SmallAction
          label="Salvar"
          accessibilityLabel="Salvar meu telefone"
          tone="primary"
          busy={busy === 'phone'}
          onPress={() => run('phone', () => self.onSavePhone(phone), 'Telefone salvo.')}
        />
      </View>
      <Text className="font-hanken text-muted text-sm leading-5 mt-2">
        Necessário para ser contato de emergência. Só quem participa do círculo vê.
      </Text>

      {message ? (
        <Text
          accessibilityRole={message.error ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          className="font-hanken-medium text-[15px] leading-[22px] mt-3"
          style={{ color: message.error ? '#DD7C54' : '#388E3C' }}
        >
          {message.text}
        </Text>
      ) : null}

      {self.onDissolve ? (
        // Alone in the circle: leaving means ending it.
        <View className="mt-5">
          <Text className="font-hanken text-ink text-[15px] leading-[22px]">
            Você é a única pessoa neste círculo. Ao sair, o círculo é encerrado e{' '}
            <Text className="font-hanken-bold">todas as tarefas, medicamentos e doses são apagados de vez</Text>.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              confirmDissolve
                ? 'Confirmar: sair e apagar o círculo e todos os dados'
                : 'Sair e excluir o círculo'
            }
            accessibilityState={{ busy: busy === 'dissolve', disabled: !!busy }}
            disabled={!!busy}
            onPress={() => {
              const dissolve = self.onDissolve
              if (!dissolve) return
              if (confirmDissolve) void run('dissolve', dissolve)
              else setConfirmDissolve(true)
            }}
            className="min-h-[56px] items-center justify-center rounded-2xl mt-3 px-4 active:opacity-70"
            style={{ backgroundColor: confirmDissolve ? '#C0392B' : 'rgba(192,57,43,0.08)' }}
          >
            {busy === 'dissolve' ? (
              <ActivityIndicator size="small" color={confirmDissolve ? '#FFFFFF' : '#C0392B'} />
            ) : (
              <Text
                className="font-hanken-bold text-base text-center"
                style={{ color: confirmDissolve ? '#FFFFFF' : '#C0392B' }}
              >
                {confirmDissolve ? 'Toque de novo para apagar tudo e sair' : 'Sair e excluir o círculo'}
              </Text>
            )}
          </Pressable>
          {confirmDissolve && busy !== 'dissolve' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar, manter o círculo"
              onPress={() => setConfirmDissolve(false)}
              className="min-h-[56px] items-center justify-center rounded-2xl mt-2 active:opacity-70"
              style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
            >
              <Text className="font-hanken-bold text-base text-navy">Cancelar, manter o círculo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : self.leaveBlockedReason ? (
        <Text className="font-hanken text-muted text-sm leading-5 mt-5">{self.leaveBlockedReason}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmLeave ? 'Confirmar saída do círculo' : 'Sair do círculo'}
          accessibilityState={{ busy: busy === 'leave', disabled: !!busy }}
          disabled={!!busy}
          onPress={() => (confirmLeave ? run('leave', self.onLeave) : setConfirmLeave(true))}
          className="min-h-[56px] items-center justify-center rounded-2xl mt-5 px-4 active:opacity-70"
          style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
        >
          {busy === 'leave' ? (
            <ActivityIndicator size="small" color="#C0392B" />
          ) : (
            <Text className="font-hanken-bold text-base text-center" style={{ color: '#C0392B' }}>
              {confirmLeave ? 'Toque de novo para sair do círculo' : 'Sair do círculo'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  )
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
  self,
}: {
  circleName: string
  members: FamilyMember[]
  /** Present when the viewer can manage members (convidar, aprovar). */
  management?: FamilyManagement
  self: FamilySelf
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
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
              {member.circleRole === 'titular' ? (
                <Text className="font-hanken text-ink text-[15px] leading-[22px] mb-4">
                  {management.titularLinked
                    ? 'A pessoa assistida já tem uma conta vinculada. Recuse este pedido.'
                    : 'Ao aprovar, esta conta passa a ser a pessoa assistida: terá acesso a tudo e não poderá ser removida do círculo.'}
                </Text>
              ) : null}
              <View className="flex-row gap-2">
                {member.circleRole === 'titular' && management.titularLinked ? null : (
                  <View className="flex-1">
                    <SmallAction
                      label="Aprovar"
                      accessibilityLabel={`Aprovar a entrada de ${member.name}`}
                      tone="primary"
                      busy={busy === `approve:${member.id}`}
                      onPress={() => run(`approve:${member.id}`, () => management.onApprove(member.id))}
                    />
                  </View>
                )}
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
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="font-hanken-extrabold text-navy text-[17px]">{member.name}</Text>
                  {member.isSelf ? (
                    <View className="px-2 py-0.5 rounded-full bg-navy/10">
                      <Text className="font-hanken-bold text-navy text-xs">Você</Text>
                    </View>
                  ) : null}
                  {isEmergency ? <MaterialIcons name="emergency" size={18} color="#C0392B" /> : null}
                </View>
                <Text className="font-hanken text-muted text-[15px]">{member.role}</Text>
              </View>
              {management && member.editable ? (
                <SmallAction
                  label="Editar"
                  accessibilityLabel={`Editar ${member.name}`}
                  tone="neutral"
                  busy={false}
                  onPress={() => setEditing(member)}
                />
              ) : null}
            </View>

            {/* Contato de emergência: telefone + ligar */}
            {isEmergency && member.phone && !member.isSelf ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ligar para ${member.name}, ${self.formatPhone(member.phone)}`}
                onPress={() => void Linking.openURL(`tel:${member.phone}`)}
                className="min-h-[56px] flex-row items-center gap-3 rounded-2xl px-4 mb-3 active:opacity-70"
                style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
              >
                <MaterialIcons name="call" size={22} color="#C0392B" />
                <Text className="flex-1 font-hanken-bold text-base" style={{ color: '#C0392B' }}>
                  Ligar · {self.formatPhone(member.phone)}
                </Text>
              </Pressable>
            ) : null}

            {/* Último acesso */}
            <View className="flex-row items-center gap-1.5 mb-3">
              <MaterialIcons name="history" size={16} color="#6B7A85" />
              <Text className="font-hanken text-muted text-sm">Último acesso: {member.lastAccess}</Text>
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
                    className="font-hanken-bold text-xs"
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

      <SelfSection self={self} />

      {editing && management ? (
        <MemberEditModal
          member={editing}
          grantable={management.grantable}
          onSave={(changes) => management.onUpdateMember(editing.id, changes)}
          onRemove={() => management.onRemoveMember(editing.id)}
          onClose={() => setEditing(null)}
        />
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
