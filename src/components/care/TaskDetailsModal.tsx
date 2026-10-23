import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'

import { CancelButton, Chip, GhostButton, MemberOptions, ModalSheet, TimeOptions } from './TaskPickers'
import {
  STATUS_META,
  TASK_CATEGORIES,
  type FamilyMember,
  type Task,
  type TaskCategory,
  type TaskStatus,
} from './types'

const pad = (n: number) => String(n).padStart(2, '0')

// Manual formatting keeps the output identical on every device (no dependency on Intl support).
function formatCreatedAt(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function DetailRow({ icon, label, value, muted = false }: {
  icon: string
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-hairline">
      <MaterialIcons name={icon as never} size={18} color="#6B7A85" style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className="font-hanken-medium text-muted text-xs mb-0.5">{label}</Text>
        <Text className={`text-[14.5px] leading-5 ${muted ? 'font-hanken text-muted' : 'font-hanken-medium text-ink'}`}>
          {value}
        </Text>
      </View>
    </View>
  )
}

/**
 * Task details. Adiar/Atribuir/Categoria swap the modal's content in place instead of opening a
 * second Modal: iOS ignores presenting a Modal while another one is still on screen. A tap outside
 * the card closes it.
 */
export function TaskDetailsModal({
  visible,
  task,
  done,
  members,
  onClose,
  onToggleDone,
  onReschedule,
  onAssign,
  onChangeCategory,
}: {
  visible: boolean
  task: Task
  done: boolean
  members: FamilyMember[]
  onClose: () => void
  onToggleDone: () => void
  onReschedule: (time: string) => void
  onAssign: (assignee: string) => void
  /** Omitted: the category is shown but not editable. */
  onChangeCategory?: (category: TaskCategory) => void
}) {
  const [view, setView] = useState<'details' | 'reschedule' | 'assign' | 'category'>('details')

  const category = TASK_CATEGORIES[task.category ?? 'outro']
  const status: TaskStatus = done ? 'concluida' : (task.status ?? 'pendente')
  const statusMeta = STATUS_META[status]
  // Seeded tasks predate the createdAt/createdBy fields.
  const isInitialTask = !task.createdAt && !task.createdBy

  function close() {
    setView('details')
    onClose()
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <ModalSheet onClose={close} maxHeight="85%">
          {view === 'category' && onChangeCategory ? (
            <>
              <Text className="font-hanken-extrabold text-navy text-lg mb-4">Categoria</Text>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((key) => (
                  <Chip
                    key={key}
                    label={TASK_CATEGORIES[key].label}
                    color={TASK_CATEGORIES[key].color}
                    active={(task.category ?? 'outro') === key}
                    onPress={() => {
                      onChangeCategory(key)
                      setView('details')
                    }}
                  />
                ))}
              </View>
              <CancelButton label="Voltar" onPress={() => setView('details')} />
            </>
          ) : view === 'reschedule' ? (
            <>
              <Text className="font-hanken-extrabold text-navy text-lg mb-4">Adiar para</Text>
              <TimeOptions
                selected={task.time}
                labelPrefix="Adiar para"
                onPick={(time) => {
                  onReschedule(time)
                  setView('details')
                }}
              />
              <CancelButton label="Voltar" onPress={() => setView('details')} />
            </>
          ) : view === 'assign' ? (
            <>
              <Text className="font-hanken-extrabold text-navy text-lg mb-4">Atribuir responsável</Text>
              <MemberOptions
                members={members}
                onPick={(name) => {
                  onAssign(name)
                  setView('details')
                }}
              />
              <CancelButton label="Voltar" onPress={() => setView('details')} />
            </>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Cabeçalho: ícone + tags */}
                <View className="flex-row items-center gap-3 mb-3">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: done ? '#C8E6C9' : `${category.color}1A` }}
                  >
                    <MaterialIcons
                      name={done ? 'check' : category.icon}
                      size={24}
                      color={done ? '#388E3C' : category.color}
                    />
                  </View>
                  <View className="flex-1 flex-row flex-wrap gap-2">
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

                <Text className="font-hanken-extrabold text-navy text-[20px] leading-6 mb-2">{task.title}</Text>

                <DetailRow icon="schedule" label="Quando" value={`${task.day} · ${task.time}`} />
                <DetailRow
                  icon="person"
                  label="Responsável"
                  value={task.assignee ?? 'Ninguém atribuído'}
                  muted={!task.assignee}
                />
                <DetailRow
                  icon="notes"
                  label="Descrição"
                  value={task.description ?? 'Sem descrição'}
                  muted={!task.description}
                />
                <DetailRow
                  icon="event"
                  label="Criada em"
                  value={task.createdAt ? formatCreatedAt(task.createdAt) : isInitialTask ? 'Tarefa inicial do Elder+' : '—'}
                  muted={!task.createdAt}
                />
                <DetailRow
                  icon="person-outline"
                  label="Criada por"
                  value={task.createdBy ?? (isInitialTask ? 'Elder+' : '—')}
                  muted={!task.createdBy}
                />
              </ScrollView>

              {/* Ações (as mesmas do card) */}
              <View className="flex-row flex-wrap items-center gap-2 mt-4">
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
                <GhostButton label="Adiar" icon="access-time" onPress={() => setView('reschedule')} />
                <GhostButton label="Atribuir" icon="person-add" onPress={() => setView('assign')} />
                {onChangeCategory ? (
                  <GhostButton label="Categoria" icon="label-outline" onPress={() => setView('category')} />
                ) : null}
              </View>

              <CancelButton label="Fechar" onPress={close} />
            </>
          )}
      </ModalSheet>
    </Modal>
  )
}
