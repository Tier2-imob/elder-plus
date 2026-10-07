import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Logo } from '@/components/Logo'
import { FloatingNav } from '@/components/FloatingNav'

type WeekDay = {
  key: string
  short: string
  date: string
  full: string
}

const WEEK_DAYS: WeekDay[] = [
  { key: 'mon', short: 'Seg', date: '12', full: 'Segunda-feira' },
  { key: 'tue', short: 'Ter', date: '13', full: 'Terça-feira' },
  { key: 'wed', short: 'Qua', date: '14', full: 'Quarta-feira' },
  { key: 'thu', short: 'Qui', date: '15', full: 'Quinta-feira' },
  { key: 'fri', short: 'Sex', date: '16', full: 'Sexta-feira' },
  { key: 'sat', short: 'Sáb', date: '17', full: 'Sábado' },
  { key: 'sun', short: 'Dom', date: '18', full: 'Domingo' },
]

const TODAY_KEY = 'wed'

type Task = {
  id: string
  dayKey: string
  title: string
  time: string
  day: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const TASKS: Task[] = [
  {
    id: 't1',
    dayKey: 'wed',
    title: 'Consulta cardiologista',
    time: '09:30',
    day: 'Quarta-feira, 14',
    icon: 'favorite-border',
  },
  {
    id: 't2',
    dayKey: 'wed',
    title: 'Tomar medicação — Losartana',
    time: '12:00',
    day: 'Quarta-feira, 14',
    icon: 'medication',
  },
]

// ─── Card de tarefa ────────────────────────────────────────────────────────────

function TaskCard({
  task,
  done,
  onDone,
}: {
  task: Task
  done: boolean
  onDone: () => void
}) {
  return (
    <View
      className="rounded-3xl border mb-4 p-5"
      style={{
        borderColor: done ? '#C8E6C9' : '#E4DCD3',
        backgroundColor: done ? '#F5FBF5' : '#FFFFFF',
      }}
    >
      {/* Linha superior: ícone + botão concluir */}
      <View className="flex-row items-center justify-between mb-4">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: done ? '#C8E6C9' : 'rgba(17,55,92,0.08)' }}
        >
          <MaterialIcons
            name={done ? 'check' : task.icon}
            size={26}
            color={done ? '#388E3C' : '#11375C'}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? 'Tarefa concluída' : 'Marcar como concluída'}
          onPress={onDone}
          disabled={done}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-full"
          style={{
            backgroundColor: done ? '#C8E6C9' : 'rgba(17,55,92,0.06)',
            borderWidth: done ? 0 : 1.4,
            borderColor: '#E4DCD3',
          }}
        >
          <MaterialIcons
            name="check"
            size={16}
            color={done ? '#388E3C' : '#9fafbd'}
          />
          <Text
            className="font-hanken-bold text-sm"
            style={{ color: done ? '#388E3C' : '#9fafbd' }}
          >
            {done ? 'Concluída' : 'Concluir'}
          </Text>
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
      <View className="flex-row items-center gap-4">
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
          <Text
            className="font-hanken text-sm"
            style={{ color: done ? '#9fafbd' : '#6B7A85' }}
          >
            {task.day}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Estado vazio ──────────────────────────────────────────────────────────────

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

// ─── View: Hoje ────────────────────────────────────────────────────────────────

function TodayView({
  tasks,
  done,
  onDone,
}: {
  tasks: Task[]
  done: Set<string>
  onDone: (id: string) => void
}) {
  if (tasks.length === 0) {
    return <EmptyDay label="Nenhuma tarefa para hoje" />
  }

  return (
    <View>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          done={done.has(task.id)}
          onDone={() => onDone(task.id)}
        />
      ))}
    </View>
  )
}

// ─── View: Semana ──────────────────────────────────────────────────────────────

function WeekView({
  done,
  onDone,
}: {
  done: Set<string>
  onDone: (id: string) => void
}) {
  return (
    <View>
      {WEEK_DAYS.map((day) => {
        const dayTasks = TASKS.filter((t) => t.dayKey === day.key)
        const isToday  = day.key === TODAY_KEY

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

            {/* Tarefas ou estado vazio compacto */}
            {dayTasks.length === 0 ? (
              <View
                className="rounded-2xl border border-hairline py-4 px-5"
                style={{ backgroundColor: 'rgba(17,55,92,0.03)' }}
              >
                <Text className="font-hanken text-muted text-sm">Nenhuma tarefa agendada.</Text>
              </View>
            ) : (
              dayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  done={done.has(task.id)}
                  onDone={() => onDone(task.id)}
                />
              ))
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─── Tela principal ────────────────────────────────────────────────────────────

type CareView = 'today' | 'week'

export function CareScreen({
  onNavigate,
  topInset = 0,
  bottomInset = 0,
}: {
  onNavigate: (key: string) => void
  topInset?: number
  bottomInset?: number
}) {
  const [view, setView]   = useState<CareView>('today')
  const [done, setDone]   = useState<Set<string>>(new Set())

  const todayTasks = TASKS.filter((t) => t.dayKey === TODAY_KEY)

  function markDone(id: string) {
    setDone((prev) => { const next = new Set(prev); next.add(id); return next })
  }

  return (
    <View className="flex-1 bg-offwhite">
      {/* Topo */}
      <View
        className="px-6 pb-4 bg-offwhite"
        style={{ paddingTop: topInset + 16 }}
      >
        <Logo size="sm" style={{ width: 80, height: 24, marginBottom: 18 }} />

        {/* Seletor Hoje / Semana */}
        <View
          className="flex-row rounded-2xl p-1.5"
          style={{ backgroundColor: 'rgba(17,55,92,0.07)' }}
        >
          {(['today', 'week'] as CareView[]).map((v) => {
            const isActive = view === v
            const label    = v === 'today' ? 'Hoje' : 'Semana'
            return (
              <Pressable
                key={v}
                accessibilityRole="button"
                onPress={() => setView(v)}
                className="flex-1 items-center py-3 rounded-xl active:opacity-80"
                style={{ backgroundColor: isActive ? '#11375C' : 'transparent' }}
              >
                <Text
                  className="font-hanken-bold text-sm"
                  style={{ color: isActive ? '#FFFFFF' : '#6B7A85' }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: bottomInset + 100,
        }}
      >
        {view === 'today' ? (
          <TodayView tasks={todayTasks} done={done} onDone={markDone} />
        ) : (
          <WeekView done={done} onDone={markDone} />
        )}
      </ScrollView>

      <FloatingNav active="care" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}