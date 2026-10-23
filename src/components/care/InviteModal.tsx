import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native'

import { CancelButton, Chip, ModalSheet } from './TaskPickers'
import {
  CIRCLE_ROLE_LABELS,
  PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  type CircleRole,
  type PermissionKey,
} from './types'

/** Roles a manager can invite (`titular` only while the assisted person has no linked account). */
const INVITABLE_ROLES: CircleRole[] = ['familiar', 'profissional', 'observador', 'admin']

/** Permissions an invite can grant. `emergencia` is set later, when editing the member. */
const INVITE_PERMISSIONS: PermissionKey[] = [
  'ver-rotina',
  'editar-rotina',
  'ver-saude',
  'editar-saude',
  'gerenciar-membros',
]

const ROLE_HINTS: Record<CircleRole, string> = {
  titular: 'A própria pessoa assistida, com conta no Elder+. Ela terá acesso a tudo e não poderá ser removida.',
  admin: 'Ajuda a cuidar de tudo, inclusive convidar e aprovar pessoas.',
  familiar: 'Acompanha a rotina e a saúde e ajuda nas tarefas.',
  profissional: 'Médico, enfermeiro ou cuidador: acompanha e registra a saúde.',
  observador: 'Só acompanha a rotina, sem editar.',
}

const defaultsFor = (role: CircleRole, grantable: PermissionKey[]) =>
  ROLE_DEFAULT_PERMISSIONS[role].filter((p) => INVITE_PERMISSIONS.includes(p) && grantable.includes(p))

/** Editar implica ver: checking editar-* checks ver-*; unchecking ver-* unchecks editar-*. */
function togglePermission(current: PermissionKey[], key: PermissionKey): PermissionKey[] {
  const set = new Set(current)
  if (set.has(key)) {
    set.delete(key)
    if (key === 'ver-rotina') set.delete('editar-rotina')
    if (key === 'ver-saude') set.delete('editar-saude')
  } else {
    set.add(key)
    if (key === 'editar-rotina') set.add('ver-rotina')
    if (key === 'editar-saude') set.add('ver-saude')
  }
  return INVITE_PERMISSIONS.filter((p) => set.has(p))
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatDay = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`

/**
 * "Convidar para o círculo": pick the role and permissions, then share the generated code.
 * Mount it only while open so every opening starts clean.
 */
export function InviteModal({
  circleName,
  inviterName,
  canInviteTitular,
  grantable,
  onCreate,
  onClose,
}: {
  circleName: string
  inviterName: string
  /** The titular is still nominal: offer to link the assisted person's own account. */
  canInviteTitular: boolean
  /** The inviter's own permissions (nobody grants what they don't have). */
  grantable: PermissionKey[]
  /** Rejects with a user-facing PT message. */
  onCreate: (input: {
    role: CircleRole
    label?: string
    permissions: PermissionKey[]
  }) => Promise<{ code: string; expiresAt: Date }>
  onClose: () => void
}) {
  const roles: CircleRole[] = canInviteTitular ? [...INVITABLE_ROLES, 'titular'] : INVITABLE_ROLES
  const [role, setRole] = useState<CircleRole>('familiar')
  const [label, setLabel] = useState('')
  const [permissions, setPermissions] = useState<PermissionKey[]>(defaultsFor('familiar', grantable))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [created, setCreated] = useState<{ code: string; expiresAt: Date } | null>(null)

  function pickRole(next: CircleRole) {
    setRole(next)
    setPermissions(defaultsFor(next, grantable))
  }

  async function handleCreate() {
    if (submitting) return
    setSubmitting(true)
    setError(undefined)
    try {
      setCreated(await onCreate({ role, label: label.trim() || undefined, permissions }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o convite.')
    } finally {
      setSubmitting(false)
    }
  }

  function share() {
    if (!created) return
    void Share.share({
      message:
        `${inviterName} convidou você para o círculo de cuidado de ${circleName} no Elder+.\n\n` +
        `Abra o app, vá em Cuidados → "Tenho um convite" e digite o código:\n${created.code}\n\n` +
        `Válido até ${formatDay(created.expiresAt)}.`,
    })
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ModalSheet onClose={onClose} maxHeight="90%">
          {created ? (
            <View className="items-center">
              <View className="w-16 h-16 rounded-3xl items-center justify-center bg-navy/10 mb-4">
                <MaterialIcons name="mark-email-read" size={30} color="#11375C" />
              </View>
              <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-xl mb-2">
                Convite gerado
              </Text>
              <Text className="font-hanken text-muted text-[15px] leading-[22px] text-center mb-5">
                Envie o código para a pessoa. Ela digita em Cuidados → &quot;Tenho um convite&quot;, e você aprova a entrada
                dela aqui na aba Família.
              </Text>
              <View
                accessible
                accessibilityLabel={`Código do convite: ${created.code.split('').join(' ')}`}
                className="w-full items-center py-4 rounded-2xl mb-2"
                style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
              >
                <Text selectable className="font-hanken-extrabold text-navy text-[26px] tracking-widest">
                  {created.code}
                </Text>
              </View>
              <Text className="font-hanken text-muted text-sm mb-5">
                Válido até {formatDay(created.expiresAt)} · uso único
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compartilhar convite"
                onPress={share}
                className="w-full min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy active:opacity-90"
              >
                <MaterialIcons name="share" size={21} color="#FFFFFF" />
                <Text className="font-hanken-bold text-base text-white">Compartilhar convite</Text>
              </Pressable>
              <View className="w-full">
                <CancelButton label="Concluído" onPress={onClose} />
              </View>
            </View>
          ) : (
            <>
              <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-xl mb-1">
                Convidar para o círculo
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text className="font-hanken-medium text-navy text-[15px] mt-4 mb-2">Quem é a pessoa</Text>
                <View className="flex-row flex-wrap gap-2">
                  {roles.map((r) => (
                    <Chip key={r} label={CIRCLE_ROLE_LABELS[r]} active={role === r} onPress={() => pickRole(r)} />
                  ))}
                </View>
                <Text className="font-hanken text-muted text-sm leading-5 mt-2">{ROLE_HINTS[role]}</Text>

                <Text className="font-hanken-medium text-navy text-[15px] mt-5 mb-2">
                  Relação <Text className="font-hanken text-muted">(opcional)</Text>
                </Text>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Ex: Filho, Geriatra, Cuidadora"
                  placeholderTextColor="#6B7A85"
                  autoCapitalize="sentences"
                  accessibilityLabel="Relação com a pessoa assistida (opcional)"
                  className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-base text-ink"
                />

                {role === 'titular' ? (
                  <Text className="font-hanken text-muted text-sm leading-5 mt-5">
                    A pessoa assistida terá acesso a tudo no círculo.
                  </Text>
                ) : (
                  <>
                    <Text className="font-hanken-medium text-navy text-[15px] mt-5 mb-1">O que ela pode fazer</Text>
                    {INVITE_PERMISSIONS.filter((p) => grantable.includes(p)).map((p) => {
                      const checked = permissions.includes(p)
                      return (
                        <Pressable
                          key={p}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          accessibilityLabel={PERMISSION_LABELS[p]}
                          onPress={() => setPermissions((prev) => togglePermission(prev, p))}
                          className="min-h-[56px] flex-row items-center gap-3 active:opacity-70"
                        >
                          <View
                            className={`w-7 h-7 rounded-lg items-center justify-center border-2 ${
                              checked ? 'bg-navy border-navy' : 'bg-white border-hairline'
                            }`}
                          >
                            {checked ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
                          </View>
                          <Text className="flex-1 font-hanken text-ink text-base">{PERMISSION_LABELS[p]}</Text>
                        </Pressable>
                      )
                    })}
                    <Text className="font-hanken text-muted text-sm leading-5 mt-1">
                      Contato de emergência é definido depois, na ficha do membro.
                    </Text>
                  </>
                )}
              </ScrollView>

              {error ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-4"
                >
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gerar convite"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                disabled={submitting}
                onPress={handleCreate}
                className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-4 active:opacity-90"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="person-add" size={21} color="#FFFFFF" />
                )}
                <Text className="font-hanken-bold text-base text-white">Gerar convite</Text>
              </Pressable>
              <CancelButton onPress={onClose} />
            </>
          )}
        </ModalSheet>
      </KeyboardAvoidingView>
    </Modal>
  )
}
