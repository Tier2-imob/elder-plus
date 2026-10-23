import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Modal, Pressable, Text, View } from 'react-native'

import { TASK_TIMES, type FamilyMember } from './types'

// Peças compartilhadas entre o TaskCard, a janela de detalhes da tarefa e os formulários
// (nova tarefa, medicamento).

export function FieldLabel({ children, optional = false }: { children: string; optional?: boolean }) {
  return (
    <Text className="font-hanken-medium text-navy text-xs mb-2 mt-4">
      {children}
      {optional ? <Text className="font-hanken text-muted"> (opcional)</Text> : null}
    </Text>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <Text className="font-hanken-medium text-terracotta text-xs mt-2">{message}</Text> : null
}

export function Chip({ label, active, onPress, color = '#11375C' }: {
  label: string
  active: boolean
  onPress: () => void
  color?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="px-3 py-2 rounded-full active:opacity-70"
      style={{
        backgroundColor: active ? color : 'rgba(17,55,92,0.06)',
        borderWidth: 1.4,
        borderColor: active ? color : '#E4DCD3',
      }}
    >
      <Text className="font-hanken-bold text-xs" style={{ color: active ? '#FFFFFF' : '#11375C' }}>{label}</Text>
    </Pressable>
  )
}

export function GhostButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center gap-1.5 px-3 py-2 rounded-full active:opacity-70"
      style={{ backgroundColor: 'rgba(17,55,92,0.06)', borderWidth: 1.4, borderColor: '#E4DCD3' }}
    >
      <MaterialIcons name={icon as never} size={14} color="#11375C" />
      <Text className="font-hanken-bold text-xs" style={{ color: '#11375C' }}>{label}</Text>
    </Pressable>
  )
}

export function CancelButton({ label = 'Cancelar', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center py-3 mt-3 rounded-2xl active:opacity-70"
      style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
    >
      <Text className="font-hanken-bold text-sm text-muted">{label}</Text>
    </Pressable>
  )
}

/**
 * Modal backdrop + centred card. A tap on the dimmed area outside the card closes it; the card
 * itself is wrapped in a no-op Pressable so taps on its non-interactive parts don't bubble up.
 */
export function ModalSheet({
  onClose,
  maxHeight,
  children,
}: {
  onClose: () => void
  maxHeight?: `${number}%`
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fechar"
      onPress={onClose}
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(22,40,58,0.45)' }}
    >
      <Pressable accessible={false} onPress={() => {}} className="w-full rounded-3xl bg-white p-5" style={{ maxHeight }}>
        {children}
      </Pressable>
    </Pressable>
  )
}

export function PickerModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <ModalSheet onClose={onClose}>
        <Text className="font-hanken-extrabold text-navy text-lg mb-4">{title}</Text>
        {children}
        <CancelButton onPress={onClose} />
      </ModalSheet>
    </Modal>
  )
}

export function TimeOptions({
  selected,
  labelPrefix,
  onPick,
}: {
  /** One time (single pick) or several (multi pick, e.g. medication schedule). */
  selected?: string | string[]
  labelPrefix: string
  onPick: (time: string) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {TASK_TIMES.map((time) => {
        const active = Array.isArray(selected) ? selected.includes(time) : time === selected
        return (
          <Pressable
            key={time}
            accessibilityRole="button"
            accessibilityLabel={`${labelPrefix} ${time}`}
            accessibilityState={{ selected: active }}
            onPress={() => onPick(time)}
            className="px-3.5 py-2.5 rounded-xl active:opacity-70"
            style={{ backgroundColor: active ? '#11375C' : 'rgba(17,55,92,0.07)' }}
          >
            <Text className="font-hanken-bold text-sm" style={{ color: active ? '#FFFFFF' : '#11375C' }}>
              {time}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function MemberOptions({
  members,
  onPick,
}: {
  members: FamilyMember[]
  /** Receives the member's id. */
  onPick: (memberId: string) => void
}) {
  if (members.length === 0) {
    return (
      <Text className="font-hanken text-muted text-[15px] leading-[22px]">
        Ninguém do círculo pode ser responsável ainda. Convide pessoas na aba Família.
      </Text>
    )
  }
  return (
    <View className="gap-2">
      {members.map((member) => (
        <Pressable
          key={member.id}
          accessibilityRole="button"
          accessibilityLabel={`Atribuir para ${member.name}`}
          onPress={() => onPick(member.id)}
          className="flex-row items-center gap-3 px-4 py-3 rounded-2xl active:opacity-70"
          style={{ backgroundColor: 'rgba(17,55,92,0.05)' }}
        >
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: '#11375C' }}>
            <Text className="font-hanken-bold text-xs" style={{ color: '#FFFFFF' }}>{member.initials}</Text>
          </View>
          <Text className="font-hanken-bold text-sm flex-1" style={{ color: '#11375C' }}>{member.name}</Text>
          <MaterialIcons name="chevron-right" size={18} color="#9fafbd" />
        </Pressable>
      ))}
    </View>
  )
}
