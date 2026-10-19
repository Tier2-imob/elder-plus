import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Text, View } from 'react-native'

import { TaskCard } from './TaskCard'
import type { FamilyMember, Task } from './types'

const WEEK_DAYS = [
  { key: 'mon', short: 'Seg', date: '12', full: 'Segunda-feira' },
  { key: 'tue', short: 'Ter', date: '13', full: 'Terça-feira' },
  { key: 'wed', short: 'Qua', date: '14', full: 'Quarta-feira' },
  { key: 'thu', short: 'Qui', date: '15', full: 'Quinta-feira' },
  { key: 'fri', short: 'Sex', date: '16', full: 'Sexta-feira' },
  { key: 'sat', short: 'Sáb', date: '17', full: 'Sábado' },
  { key: 'sun', short: 'Dom', date: '18', full: 'Domingo' },
]

export const TODAY_KEY = 'wed'

type ToggleProps = {
  tasks: Task[]
  doneIds: Set<string>
  members: FamilyMember[]
  onToggleDone: (id: string) => void
  onReschedule: (id: string, time: string) => void
  onAssign: (id: string, assignee: string) => void
}

function EmptyDay({ label }: { label: string }) {
  return (
    <View className="items-center py-10 px-6">
      <MaterialIcons name="event-available" size={48} color="#CFD7DE" />
      <Text className="font-hanken-bold text-[#CFD7DE] text-base mt-3 text-center">
        {label}
      </Text>
    </View>
  )
}

export function RoutineView({
  mode,
  tasks,
  doneIds,
  members,
  onToggleDone,
  onReschedule,
  onAssign,
}: ToggleProps & { mode: 'today' | 'week' }) {
  const cardProps = (task: Task) => ({
    task,
    done: doneIds.has(task.id),
    members,
    onToggleDone: () => onToggleDone(task.id),
    onReschedule: (time: string) => onReschedule(task.id, time),
    onAssign: (assignee: string) => onAssign(task.id, assignee),
  })

  if (mode === 'today') {
    const todayTasks = tasks.filter((t) => t.dayKey === TODAY_KEY)
    if (todayTasks.length === 0) return <EmptyDay label="Nenhuma tarefa para hoje" />
    return (
      <View>
        {todayTasks.map((task) => (
          <TaskCard key={task.id} {...cardProps(task)} />
        ))}
      </View>
    )
  }

  return (
    <View>
      {WEEK_DAYS.map((day) => {
        const dayTasks = tasks.filter((t) => t.dayKey === day.key)
        const isToday = day.key === TODAY_KEY

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
