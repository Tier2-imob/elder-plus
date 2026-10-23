import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { TaskDetailsModal } from './TaskDetailsModal'
import { GhostButton, MemberOptions, PickerModal, TimeOptions } from './TaskPickers'
import {
  STATUS_META,
  TASK_CATEGORIES,
  type FamilyMember,
  type Task,
  type TaskStatus,
} from './types'

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
  const [detailsOpen, setDetailsOpen] = useState(false)

  const category = TASK_CATEGORIES[task.category ?? 'outro']
  const status: TaskStatus = done ? 'concluida' : (task.status ?? 'pendente')
  const statusMeta = STATUS_META[status]

  return (
    // The modals are siblings of the card, not children: RN touch handling bubbles through the React
    // tree, so a tap inside a modal would otherwise reach the card's onPress.
    <>
    {/* Tapping anywhere on the card opens the details; the inner buttons keep their own action.
        accessible={false} keeps those buttons reachable by screen readers; the top-right button is
        the accessible entry point for the details. */}
    <Pressable
      accessible={false}
      onPress={() => setDetailsOpen(true)}
      className="rounded-3xl border mb-4 p-5 active:opacity-90"
      style={{
        borderColor: done ? '#C8E6C9' : '#E4DCD3',
        backgroundColor: done ? '#F5FBF5' : '#FFFFFF',
      }}
    >
      {/* Linha superior: ícone da categoria + tags + detalhes */}
      <View className="flex-row items-center gap-2 mb-4">
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

        <View className="flex-1 flex-row flex-wrap items-center justify-end gap-2">
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes de ${task.title}`}
          onPress={() => setDetailsOpen(true)}
          hitSlop={8}
          className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
          style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
        >
          <MaterialIcons name="info-outline" size={18} color="#11375C" />
        </Pressable>
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
    </Pressable>

      {/* Modal: Adiar */}
      <PickerModal visible={rescheduleOpen} title="Adiar para" onClose={() => setRescheduleOpen(false)}>
        <TimeOptions
          labelPrefix="Adiar para"
          onPick={(time) => {
            setRescheduleOpen(false)
            onReschedule(time)
          }}
        />
      </PickerModal>

      {/* Modal: Atribuir */}
      <PickerModal visible={assignOpen} title="Atribuir responsável" onClose={() => setAssignOpen(false)}>
        <MemberOptions
          members={members}
          onPick={(name) => {
            setAssignOpen(false)
            onAssign(name)
          }}
        />
      </PickerModal>

      {/* Modal: Detalhes */}
      <TaskDetailsModal
        visible={detailsOpen}
        task={task}
        done={done}
        members={members}
        onClose={() => setDetailsOpen(false)}
        onToggleDone={onToggleDone}
        onReschedule={onReschedule}
        onAssign={onAssign}
      />
    </>
  )
}
