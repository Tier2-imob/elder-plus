import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRef, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import { TaskDetailsModal } from './TaskDetailsModal'
import { GhostButton, MemberOptions, PickerModal, TimeOptions } from './TaskPickers'
import {
  STATUS_META,
  TASK_CATEGORIES,
  type FamilyMember,
  type Task,
  type TaskCategory,
  type TaskStatus,
} from './types'

type Rect = { x: number; y: number; width: number; height: number }

/**
 * Delete mode for a card: a transparent full-screen layer (a Modal, so it also covers the header,
 * the tabs and the FloatingNav) with a translucent red box drawn exactly over the card and the
 * delete button in its centre. Any tap outside the button cancels.
 */
function DeleteOverlay({
  rect,
  title,
  onDelete,
  onDismiss,
}: {
  rect: Rect
  title: string
  onDelete: () => void
  onDismiss: () => void
}) {
  return (
    // Translucent bars: the Modal then spans the whole window, matching measureInWindow coordinates.
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancelar exclusão"
        onPress={onDismiss}
        style={{ flex: 1 }}
      >
        <View
          pointerEvents="box-none"
          className="absolute items-center justify-center rounded-3xl"
          style={{
            top: rect.y,
            left: rect.x,
            width: rect.width,
            height: rect.height,
            backgroundColor: 'rgba(192,57,43,0.55)',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Excluir a tarefa ${title}`}
            onPress={onDelete}
            className="min-h-[56px] flex-row items-center gap-2 px-6 rounded-full bg-white active:opacity-80"
          >
            <MaterialIcons name="delete-outline" size={22} color="#C0392B" />
            <Text className="font-hanken-bold text-base" style={{ color: '#C0392B' }}>
              Excluir tarefa
            </Text>
          </Pressable>
        </View>
      </Pressable>
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
  onChangeCategory,
  onDelete,
  readOnly = false,
  softShadow = false,
}: {
  task: Task
  done: boolean
  members: FamilyMember[]
  onToggleDone: () => void
  onReschedule: (time: string) => void
  onAssign: (assignee: string) => void
  onChangeCategory?: (category: TaskCategory) => void
  /** Enables delete mode (touch and hold the card). */
  onDelete?: () => void
  /** Viewer without `editar-rotina`: no actions, no delete, details without edits. */
  readOnly?: boolean
  /** No colored border, only a minimal shadow (Explore). */
  softShadow?: boolean
}) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteRect, setDeleteRect] = useState<Rect | null>(null)
  const cardRef = useRef<View>(null)

  const canDelete = !readOnly && !!onDelete

  function enterDeleteMode() {
    if (!canDelete) return
    cardRef.current?.measureInWindow((x, y, width, height) => setDeleteRect({ x, y, width, height }))
  }

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
      ref={cardRef}
      accessible={false}
      onPress={() => setDetailsOpen(true)}
      onLongPress={canDelete ? enterDeleteMode : undefined}
      delayLongPress={450}
      className={softShadow ? 'rounded-3xl mb-4 p-5 active:opacity-90' : 'rounded-3xl border mb-4 p-5 active:opacity-90'}
      style={{
        ...(softShadow
          ? { shadowColor: '#11375C', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
          : { borderColor: done ? '#C8E6C9' : '#E4DCD3' }),
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
          // Screen readers can't reliably "touch and hold": delete is offered as an action here.
          accessibilityHint={canDelete ? 'Toque e segure o card para excluir a tarefa' : undefined}
          accessibilityActions={canDelete ? [{ name: 'delete', label: 'Excluir tarefa' }] : undefined}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'delete') enterDeleteMode()
          }}
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

      {/* Ações (só para quem pode editar a rotina) */}
      {readOnly ? null : (
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
      )}
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
        onChangeCategory={onChangeCategory}
        readOnly={readOnly}
      />

      {deleteRect && canDelete && onDelete ? (
        <DeleteOverlay
          rect={deleteRect}
          title={task.title}
          onDismiss={() => setDeleteRect(null)}
          onDelete={() => {
            setDeleteRect(null)
            onDelete()
          }}
        />
      ) : null}
    </>
  )
}
