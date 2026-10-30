import { FloatingNav } from '@/components/FloatingNav'
import { CircleSwitcher } from '@/components/care/CircleSwitcher'
import { Logo } from '@/components/Logo'
import { FamilyView, type FamilyLifecycle, type FamilyManagement, type FamilySelf } from '@/components/care/FamilyView'
import { InactiveBanner } from '@/components/care/InactiveBanner'
import { HealthView } from '@/components/care/HealthView'
import { MedicationModal } from '@/components/care/MedicationModal'
import { NewTaskModal } from '@/components/care/NewTaskModal'
import { RoutineView } from '@/components/care/RoutineView'
import type {
  FamilyMember,
  HealthReminder,
  HealthStats,
  Medication,
  MedicationInput,
  NewTaskInput,
  Task,
  TaskCategory,
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
  medsAdherence,
  medicationsLoading = false,
  medicationsError,
  healthReminders,
  healthStats,
  familyMembers,
  circleName,
  circleMembers,
  familyManagement,
  familySelf,
  familyLifecycle,
  circleStatus,
  access,
  circleSwitcher,
  onToggleDone,
  onReschedule,
  onAssign,
  onChangeTaskCategory,
  onDeleteTask,
  onCreateTask,
  onRecordDose,
  onUndoDose,
  onCreateMedication,
  onUpdateMedication,
  onDeleteMedication,
  topInset = 0,
  bottomInset = 0,
}: {
  onNavigate: (key: string) => void
  tasks: Task[]
  doneIds: Set<string>
  tasksLoading?: boolean
  medications: Medication[]
  medsAdherence: number | null
  medicationsLoading?: boolean
  medicationsError?: string
  healthReminders: HealthReminder[]
  healthStats: HealthStats
  familyMembers: FamilyMember[]
  /** Assisted person's name (the circle's titular). */
  circleName: string
  /** Real circle members for the Família tab. */
  circleMembers: FamilyMember[]
  /** Invite/approve actions, only for members who manage the circle. */
  familyManagement?: FamilyManagement
  /** The viewer's own phone and leaving. */
  familySelf: FamilySelf
  /** Inactivate / delete for good (managers; present only when one of them applies). */
  familyLifecycle?: FamilyLifecycle
  /** Inactive circle: banner on every tab (data kept, read-only); `onReactivate` for managers. */
  circleStatus: { inactive: boolean; sinceLabel?: string; onReactivate?: () => Promise<void> }
  /** Circle selector (users in more than one circle). */
  circleSwitcher: {
    circles: { id: string; name: string; inactive?: boolean }[]
    activeCircleId: string | null
    onSelect: (circleId: string) => void
    onAdd?: () => void
  }
  /** What the viewer may see/edit (from their circle permissions). */
  access: { canSeeRoutine: boolean; canEditRoutine: boolean; canSeeHealth: boolean; canEditHealth: boolean }
  onToggleDone: (taskId: string, isDone: boolean) => void
  onReschedule: (taskId: string, time: string) => void
  onAssign: (taskId: string, assignee: string) => void
  onChangeTaskCategory: (taskId: string, category: TaskCategory) => void
  onDeleteTask: (taskId: string) => void
  /** Persists a new task; rejects on failure so the form can show the error. */
  onCreateTask: (input: NewTaskInput) => Promise<void>
  onRecordDose: (medicationId: string, time: string, taken: boolean) => void
  onUndoDose: (medicationId: string, time: string) => void
  /** Create/update/delete reject on failure so the medication form can show the error. */
  onCreateMedication: (input: MedicationInput) => Promise<void>
  onUpdateMedication: (medicationId: string, input: MedicationInput) => Promise<void>
  onDeleteMedication: (medicationId: string) => Promise<void>
  topInset?: number
  bottomInset?: number
}) {
  const visibleTabs = TABS.filter(
    (t) => (t.key !== 'rotina' || access.canSeeRoutine) && (t.key !== 'saude' || access.canSeeHealth)
  )
  const [selectedTab, setTab] = useState<CareTab>('rotina')
  // Família is always visible, so this never comes out empty.
  const tab = visibleTabs.some((t) => t.key === selectedTab) ? selectedTab : visibleTabs[0].key
  const [routineMode, setRoutineMode] = useState<RoutineMode>('today')
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  // 'new' = create form; a Medication = edit form for it; null = closed.
  const [medicationForm, setMedicationForm] = useState<Medication | 'new' | null>(null)

  return (
    <View className="flex-1 bg-offwhite">
      {/* Topo */}
      <View
        className="px-6 pb-4 bg-offwhite"
        style={{ paddingTop: topInset + 16 }}
      >
        <Logo size="sm" style={{ width: 80, height: 24, marginBottom: 18 }} />
        <CircleSwitcher {...circleSwitcher} />

        {/* Abas: Rotina / Saúde / Família */}
        <View
          className="flex-row rounded-2xl p-1.5"
          style={{ backgroundColor: 'rgba(17,55,92,0.07)' }}
        >
          {visibleTabs.map(({ key, label, icon }) => {
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
        {circleStatus.inactive ? (
          <InactiveBanner
            personName={circleName}
            sinceLabel={circleStatus.sinceLabel}
            onReactivate={circleStatus.onReactivate}
          />
        ) : null}

        {tab === 'rotina' ? (
          tasksLoading && tasks.length === 0 ? (
            <Text className="font-hanken text-muted text-sm px-1 py-4">
              Carregando tarefas…
            </Text>
          ) : (
            <>
              {access.canEditRoutine ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nova tarefa"
                  onPress={() => setNewTaskOpen(true)}
                  className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mb-4 active:opacity-90"
                >
                  <MaterialIcons name="add" size={20} color="#FFFFFF" />
                  <Text className="font-hanken-bold text-base text-white">Nova tarefa</Text>
                </Pressable>
              ) : null}
              <RoutineView
                mode={routineMode}
                tasks={tasks}
                doneIds={doneIds}
                members={familyMembers}
                onToggleDone={(id) => onToggleDone(id, doneIds.has(id))}
                onReschedule={onReschedule}
                onAssign={onAssign}
                onChangeCategory={onChangeTaskCategory}
                onDelete={onDeleteTask}
                readOnly={!access.canEditRoutine}
              />
            </>
          )
        ) : tab === 'saude' ? (
          <HealthView
            medications={medications}
            medsAdherence={medsAdherence}
            medicationsLoading={medicationsLoading}
            medicationsError={medicationsError}
            reminders={healthReminders}
            stats={healthStats}
            tasksDone={doneIds.size}
            tasksTotal={tasks.length}
            onRecordDose={onRecordDose}
            onUndoDose={onUndoDose}
            onAddMedication={() => setMedicationForm('new')}
            onEditMedication={setMedicationForm}
            readOnly={!access.canEditHealth}
          />
        ) : (
          <FamilyView circleName={circleName} members={circleMembers} management={familyManagement} self={familySelf} lifecycle={familyLifecycle} />
        )}
      </ScrollView>

      {/* Rendered only while open so each opening starts with a clean form. */}
      {newTaskOpen ? (
        <NewTaskModal
          members={familyMembers}
          onClose={() => setNewTaskOpen(false)}
          onSubmit={onCreateTask}
        />
      ) : null}

      {medicationForm === 'new' ? (
        <MedicationModal onClose={() => setMedicationForm(null)} onSubmit={onCreateMedication} />
      ) : medicationForm ? (
        <MedicationModal
          medication={medicationForm}
          onClose={() => setMedicationForm(null)}
          onSubmit={(input) => onUpdateMedication(medicationForm.id, input)}
          onDelete={() => onDeleteMedication(medicationForm.id)}
        />
      ) : null}

      <FloatingNav active="care" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}