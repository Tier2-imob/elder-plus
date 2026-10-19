import { FloatingNav } from '@/components/FloatingNav'
import { Logo } from '@/components/Logo'
import { FamilyView } from '@/components/care/FamilyView'
import { HealthView } from '@/components/care/HealthView'
import { RoutineView } from '@/components/care/RoutineView'
import type {
  FamilyMember,
  HealthReminder,
  HealthStats,
  Medication,
  Task,
} from '@/components/care/types'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

type CareTab = 'rotina' | 'saude' | 'familia'
type RoutineMode = 'today' | 'week'

const TABS: { key: CareTab; label: string; icon: string }[] = [
  { key: 'rotina',  label: 'Rotina',  icon: 'event-note' },
  { key: 'saude',   label: 'Saúde',   icon: 'favorite-border' },
  { key: 'familia', label: 'Família', icon: 'group' },
]

const ROUTINE_MODES: { key: RoutineMode; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week',  label: 'Semana' },
]

// ─── Tela principal ────────────────────────────────────────────────────────────

export function CareScreen({
  onNavigate,
  tasks,
  doneIds,
  tasksLoading = false,
  medications,
  healthReminders,
  healthStats,
  familyMembers,
  onToggleDone,
  onReschedule,
  onAssign,
  topInset = 0,
  bottomInset = 0,
}: {
  onNavigate: (key: string) => void
  tasks: Task[]
  doneIds: Set<string>
  tasksLoading?: boolean
  medications: Medication[]
  healthReminders: HealthReminder[]
  healthStats: HealthStats
  familyMembers: FamilyMember[]
  onToggleDone: (taskId: string, isDone: boolean) => void
  onReschedule: (taskId: string, time: string) => void
  onAssign: (taskId: string, assignee: string) => void
  topInset?: number
  bottomInset?: number
}) {
  const [tab, setTab] = useState<CareTab>('rotina')
  const [routineMode, setRoutineMode] = useState<RoutineMode>('today')

  return (
    <View className="flex-1 bg-offwhite">
      {/* Topo */}
      <View
        className="px-6 pb-4 bg-offwhite"
        style={{ paddingTop: topInset + 16 }}
      >
        <Logo size="sm" style={{ width: 80, height: 24, marginBottom: 18 }} />

        {/* Abas: Rotina / Saúde / Família */}
        <View
          className="flex-row rounded-2xl p-1.5"
          style={{ backgroundColor: 'rgba(17,55,92,0.07)' }}
        >
          {TABS.map(({ key, label, icon }) => {
            const isActive = tab === key
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => setTab(key)}
                className="flex-1 items-center py-2.5 rounded-xl active:opacity-80"
                style={{ backgroundColor: isActive ? '#11375C' : 'transparent' }}
              >
                <MaterialIcons
                  name={icon as never}
                  size={16}
                  color={isActive ? '#FFFFFF' : '#6B7A85'}
                />
                <Text
                  className="font-hanken-bold text-xs mt-0.5"
                  style={{ color: isActive ? '#FFFFFF' : '#6B7A85' }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Sub-toggle Hoje/Semana (apenas na aba Rotina) */}
        {tab === 'rotina' ? (
          <View
            className="flex-row rounded-xl p-1 mt-2.5"
            style={{ backgroundColor: 'rgba(17,55,92,0.05)' }}
          >
            {ROUTINE_MODES.map(({ key, label }) => {
              const isActive = routineMode === key
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setRoutineMode(key)}
                  className="flex-1 items-center py-2 rounded-lg active:opacity-80"
                  style={{ backgroundColor: isActive ? '#11375C' : 'transparent' }}
                >
                  <Text
                    className="font-hanken-bold text-xs"
                    style={{ color: isActive ? '#FFFFFF' : '#6B7A85' }}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
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
        {tab === 'rotina' ? (
          tasksLoading && tasks.length === 0 ? (
            <Text className="font-hanken text-muted text-sm px-1 py-4">
              Carregando tarefas…
            </Text>
          ) : (
            <RoutineView
              mode={routineMode}
              tasks={tasks}
              doneIds={doneIds}
              members={familyMembers}
              onToggleDone={(id) => onToggleDone(id, doneIds.has(id))}
              onReschedule={onReschedule}
              onAssign={onAssign}
            />
          )
        ) : tab === 'saude' ? (
          <HealthView
            medications={medications}
            reminders={healthReminders}
            stats={healthStats}
            tasksDone={doneIds.size}
            tasksTotal={tasks.length}
          />
        ) : (
          <FamilyView members={familyMembers} />
        )}
      </ScrollView>

      <FloatingNav active="care" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}