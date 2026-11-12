import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { useToday } from '@/hooks/useToday'
import { parseDateKey, weekDays } from '@/services/week'

import { TaskCard } from './TaskCard'
import { type FamilyMember, type Task, type TaskCategory } from './types'

// Tasks of a day in time order. Times are zero-padded "HH:MM", so string order is time order.
function byDay(tasks: Task[], dayKey: string) {
  return tasks.filter((t) => t.dayKey === dayKey).sort((a, b) => a.time.localeCompare(b.time))
}

type ToggleProps = {
  tasks: Task[]
  doneIds: Set<string>
  members: FamilyMember[]
  onToggleDone: (id: string) => void
  onReschedule: (id: string, time: string) => void
  onAssign: (id: string, assignee: string) => void
  onChangeCategory: (id: string, category: TaskCategory) => void
  onDelete: (id: string) => void
  /** Viewer without `editar-rotina`. */
  readOnly?: boolean
}

export function RoutineView({
  tasks,
  doneIds,
  members,
  onToggleDone,
  onReschedule,
  onAssign,
  onChangeCategory,
  onDelete,
  readOnly = false,
}: ToggleProps) {
  // The current week, Monday to Sunday; it moves on by itself when the day changes.
  const todayKey = useToday()
  const week = useMemo(() => weekDays(parseDateKey(todayKey) ?? new Date()), [todayKey])

  const cardProps = (task: Task) => ({
    task,
    done: doneIds.has(task.id),
    members,
    onToggleDone: () => onToggleDone(task.id),
    onReschedule: (time: string) => onReschedule(task.id, time),
    onAssign: (assignee: string) => onAssign(task.id, assignee),
    onChangeCategory: (category: TaskCategory) => onChangeCategory(task.id, category),
    onDelete: () => onDelete(task.id),
    readOnly,
  })

  return (
    <View>
      {week.map((day) => {
        const dayTasks = byDay(tasks, day.key)
        const isToday = day.key === todayKey

        return (
          <View key={day.key} className="mb-6">
            {/* Cabeçalho do dia */}
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: isToday ? '#11375C' : 'rgba(17,55,92,0.07)' }}
              >
                <Text
                  className="font-hanken-extrabold text-base"
                  style={{ color: isToday ? '#FFFFFF' : '#11375C' }}
                >
                  {day.date}
                </Text>
              </View>
              <View>
                <Text className="font-hanken-bold text-navy text-base">
                  {isToday ? `Hoje — ${day.full}` : day.full}
                </Text>
                <Text className="font-hanken text-muted text-xs">
                  {dayTasks.length === 0
                    ? 'Sem tarefas'
                    : `${dayTasks.length} tarefa${dayTasks.length > 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>

            {dayTasks.length === 0 ? (
              <View
                className="rounded-2xl border border-hairline py-4 px-5"
                style={{ backgroundColor: 'rgba(17,55,92,0.03)' }}
              >
                <Text className="font-hanken text-muted text-sm">Nenhuma tarefa agendada.</Text>
              </View>
            ) : (
              dayTasks.map((task) => <TaskCard key={task.id} {...cardProps(task)} />)
            )}
          </View>
        )
      })}
    </View>
  )
}
