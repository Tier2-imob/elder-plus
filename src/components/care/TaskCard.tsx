import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import {
  STATUS_META,
  TASK_CATEGORIES,
  type FamilyMember,
  type Task,
  type TaskStatus,
} from './types'

const RESCHEDULE_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
]

function GhostButton({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
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

function PickerModal({
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
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(22,40,58,0.45)' }}>
        <View className="w-full rounded-3xl bg-white p-5">
          <Text className="font-hanken-extrabold text-navy text-lg mb-4">{title}</Text>
          {children}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={onClose}
            className="items-center py-3 mt-3 rounded-2xl active:opacity-70"
            style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
          >
            <Text className="font-hanken-bold text-sm text-muted">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

export function TaskCard({
  task,
  done,
  members,
  onToggleDone,
  onReschedule,
  onAssign,
}: {
  task: Task
  done: boolean
  members: FamilyMember[]
  onToggleDone: () => void
  onReschedule: (time: string) => void
  onAssign: (assignee: string) => void
}) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const category = TASK_CATEGORIES[task.category ?? 'outro']
  const status: TaskStatus = done ? 'concluida' : (task.status ?? 'pendente')
  const statusMeta = STATUS_META[status]

  return (
    <View
      className="rounded-3xl border mb-4 p-5"
      style={{
        borderColor: done ? '#C8E6C9' : '#E4DCD3',
        backgroundColor: done ? '#F5FBF5' : '#FFFFFF',
      }}
    >
      {/* Linha superior: ícone da categoria + tags */}
      <View className="flex-row items-center justify-between mb-4">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: done ? '#C8E6C9' : `${category.color}1A` }}
        >
          <MaterialIcons
            name={done ? 'check' : category.icon}
            size={26}
            color={done ? '#388E3C' : category.color}
          />
        </View>

        <View className="flex-row items-center gap-2">
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: `${category.color}1A` }}>
            <Text className="font-hanken-bold text-[11px]" style={{ color: category.color }}>
              {category.label}
            </Text>
          </View>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusMeta.bg }}>
            <Text className="font-hanken-bold text-[11px]" style={{ color: statusMeta.color }}>
              {statusMeta.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Título */}
      <Text
        className="font-hanken-extrabold text-[19px] leading-6 mb-3"
        style={{
          color: done ? '#9fafbd' : '#11375C',
          textDecorationLine: done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Text>

      {/* Horário e dia */}
      <View className="flex-row items-center gap-4 mb-3">
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name="schedule" size={16} color={done ? '#9fafbd' : '#6B7A85'} />
          <Text
            className="font-hanken-bold text-base"
            style={{ color: done ? '#9fafbd' : '#11375C' }}
          >
            {task.time}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name="calendar-today" size={16} color={done ? '#9fafbd' : '#6B7A85'} />
          <Text className="font-hanken text-sm" style={{ color: done ? '#9fafbd' : '#6B7A85' }}>
            {task.day}
          </Text>
        </View>
      </View>

      {/* Responsável */}
      {task.assignee ? (
        <View className="flex-row items-center gap-1.5 mb-3">
          <MaterialIcons name="person" size={15} color={done ? '#9fafbd' : category.color} />
          <Text className="font-hanken-medium text-[13px]" style={{ color: done ? '#9fafbd' : '#16283A' }}>
            {task.assignee}
          </Text>
        </View>
      ) : null}

      {/* Ações */}
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? 'Desmarcar como concluída' : 'Marcar como concluída'}
          onPress={onToggleDone}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-full active:opacity-70"
          style={{
            backgroundColor: done ? '#C8E6C9' : 'rgba(56,142,60,0.10)',
            borderWidth: done ? 0 : 1.4,
            borderColor: '#C8E6C9',
          }}
        >
          <MaterialIcons name="check" size={16} color="#388E3C" />
          <Text className="font-hanken-bold text-sm" style={{ color: '#388E3C' }}>
            {done ? 'Concluída' : 'Concluir'}
          </Text>
        </Pressable>

        <GhostButton label="Adiar" icon="access-time" onPress={() => setRescheduleOpen(true)} />
        <GhostButton label="Atribuir" icon="person-add" onPress={() => setAssignOpen(true)} />
      </View>

      {/* Modal: Adiar */}
      <PickerModal visible={rescheduleOpen} title="Adiar para" onClose={() => setRescheduleOpen(false)}>
        <View className="flex-row flex-wrap gap-2">
          {RESCHEDULE_TIMES.map((time) => (
            <Pressable
              key={time}
              accessibilityRole="button"
              accessibilityLabel={`Adiar para ${time}`}
              onPress={() => {
                setRescheduleOpen(false)
                onReschedule(time)
              }}
              className="px-3.5 py-2.5 rounded-xl active:opacity-70"
              style={{ backgroundColor: 'rgba(17,55,92,0.07)' }}
            >
              <Text className="font-hanken-bold text-sm" style={{ color: '#11375C' }}>{time}</Text>
            </Pressable>
          ))}
        </View>
      </PickerModal>

      {/* Modal: Atribuir */}
      <PickerModal visible={assignOpen} title="Atribuir responsável" onClose={() => setAssignOpen(false)}>
        <View className="gap-2">
          {members.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Atribuir para ${member.name}`}
              onPress={() => {
                setAssignOpen(false)
                onAssign(member.name)
              }}
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
      </PickerModal>
    </View>
  )
}
