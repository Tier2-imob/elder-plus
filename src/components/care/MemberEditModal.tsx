import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

import { CancelButton, Chip, ModalSheet } from './TaskPickers'
import {
  ALL_PERMISSIONS,
  CIRCLE_ROLE_LABELS,
  PERMISSION_LABELS,
  type CircleRole,
  type FamilyMember,
  type PermissionKey,
} from './types'

/** Roles a manager can give (the titular role only comes from linking the assisted person). */
const EDITABLE_ROLES: CircleRole[] = ['admin', 'familiar', 'profissional', 'observador']

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
  return ALL_PERMISSIONS.filter((p) => set.has(p))
}

/**
 * A manager editing another member: role, relation, permissions (including the emergency contact,
 * which needs the member's own phone) and removal. Mount it only while open.
 */
export function MemberEditModal({
  member,
  grantable,
  onSave,
  onRemove,
  onClose,
}: {
  member: FamilyMember
  /** The editor's own permissions (nobody grants what they don't have). */
  grantable: PermissionKey[]
  /** Both reject with a user-facing PT message. */
  onSave: (changes: { role: CircleRole; label: string | null; permissions: PermissionKey[] }) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}) {
  const [role, setRole] = useState<CircleRole>(member.circleRole ?? 'familiar')
  const [label, setLabel] = useState(member.label ?? '')
  const [permissions, setPermissions] = useState<PermissionKey[]>(member.permissions)
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const hasPhone = !!member.phone

  async function run(kind: 'save' | 'remove', action: () => Promise<void>) {
    if (busy) return
    setBusy(kind)
    setError(undefined)
    try {
      await action()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.')
      setBusy(null)
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ModalSheet onClose={onClose} maxHeight="90%">
          <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-xl mb-1">
            {member.name}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className="font-hanken-medium text-navy text-[15px] mt-4 mb-2">Papel no círculo</Text>
            <View className="flex-row flex-wrap gap-2">
              {EDITABLE_ROLES.map((r) => (
                <Chip key={r} label={CIRCLE_ROLE_LABELS[r]} active={role === r} onPress={() => setRole(r)} />
              ))}
            </View>

            <Text className="font-hanken-medium text-navy text-[15px] mt-5 mb-2">
              Relação <Text className="font-hanken text-muted">(opcional)</Text>
            </Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Ex: Filho, Geriatra, Cuidadora"
              placeholderTextColor="#6B7A85"
              accessibilityLabel="Relação com a pessoa assistida (opcional)"
              className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-base text-ink"
            />

            <Text className="font-hanken-medium text-navy text-[15px] mt-5 mb-1">O que a pessoa pode fazer</Text>
            {ALL_PERMISSIONS.filter((p) => grantable.includes(p)).map((p) => {
              const checked = permissions.includes(p)
              // Adding the emergency contact needs a phone; removing it is always possible.
              const disabled = p === 'emergencia' && !checked && !hasPhone
              return (
                <Pressable
                  key={p}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled }}
                  accessibilityLabel={PERMISSION_LABELS[p]}
                  accessibilityHint={disabled ? 'A pessoa precisa cadastrar o telefone dela primeiro' : undefined}
                  disabled={disabled}
                  onPress={() => setPermissions((prev) => togglePermission(prev, p))}
                  className="min-h-[56px] flex-row items-center gap-3 active:opacity-70"
                  style={{ opacity: disabled ? 0.5 : 1 }}
                >
                  <View
                    className={`w-7 h-7 rounded-lg items-center justify-center border-2 ${
                      checked ? 'bg-navy border-navy' : 'bg-white border-hairline'
                    }`}
                  >
                    {checked ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text className="font-hanken text-ink text-base">{PERMISSION_LABELS[p]}</Text>
                    {disabled ? (
                      <Text className="font-hanken text-muted text-sm">Sem telefone cadastrado</Text>
                    ) : null}
                  </View>
                </Pressable>
              )
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmRemove ? `Confirmar remoção de ${member.name}` : `Remover ${member.name} do círculo`}
              accessibilityState={{ busy: busy === 'remove', disabled: !!busy }}
              disabled={!!busy}
              onPress={() => (confirmRemove ? run('remove', onRemove) : setConfirmRemove(true))}
              className="min-h-[56px] items-center justify-center rounded-2xl mt-5 px-4 active:opacity-70"
              style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
            >
              {busy === 'remove' ? (
                <ActivityIndicator size="small" color="#C0392B" />
              ) : (
                <Text className="font-hanken-bold text-base text-center" style={{ color: '#C0392B' }}>
                  {confirmRemove ? 'Toque de novo para remover do círculo' : 'Remover do círculo'}
                </Text>
              )}
            </Pressable>
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
            accessibilityLabel="Salvar alterações"
            accessibilityState={{ busy: busy === 'save', disabled: !!busy }}
            disabled={!!busy}
            onPress={() => run('save', () => onSave({ role, label: label.trim() || null, permissions }))}
            className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-4 active:opacity-90"
          >
            {busy === 'save' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="check" size={21} color="#FFFFFF" />
            )}
            <Text className="font-hanken-bold text-base text-white">Salvar alterações</Text>
          </Pressable>
          <CancelButton onPress={onClose} />
        </ModalSheet>
      </KeyboardAvoidingView>
    </Modal>
  )
}
