import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Pressable, Text, View } from 'react-native'

import {
  LOW_STOCK_THRESHOLD,
  type HealthReminder,
  type HealthStats,
  type Medication,
  type MedicationDoseState,
} from './types'

const DOSE_META: Record<MedicationDoseState, { label: string; color: string; bg: string }> = {
  'tomou':      { label: 'Tomou',      color: '#388E3C', bg: 'rgba(56,142,60,0.12)' },
  'nao-tomou':  { label: 'Não tomou',  color: '#C0392B', bg: 'rgba(192,57,43,0.12)' },
  'atrasou':    { label: 'Atrasou',    color: '#B0782A', bg: 'rgba(176,120,42,0.12)' },
}

const REMINDER_META = {
  consulta: { icon: 'local-hospital' as const, color: '#5B8DEF' },
  exame:    { icon: 'assignment' as const,     color: '#B0782A' },
  vacina:   { icon: 'vaccines' as const,       color: '#DD7C54' },
}

/** How many past doses the card shows. */
const HISTORY_LIMIT = 4

function SectionTitle({ children }: { children: string }) {
  return <Text className="font-hanken-bold text-navy text-base mb-4">{children}</Text>
}

function DoseChip({ state, prefix }: { state: MedicationDoseState; prefix?: string }) {
  const meta = DOSE_META[state]
  return (
    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.bg }}>
      <Text className="font-hanken-bold text-[11px]" style={{ color: meta.color }}>
        {prefix ? `${prefix} · ` : ''}{meta.label}
      </Text>
    </View>
  )
}

/** "2026-10-21" → "21/10". */
function shortDate(date: string) {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

function stockBadge(stock: number) {
  if (stock === 0) return { label: 'Sem estoque', color: '#C0392B', bg: 'rgba(192,57,43,0.12)' }
  if (stock <= LOW_STOCK_THRESHOLD) return { label: 'Estoque baixo', color: '#C0392B', bg: 'rgba(192,57,43,0.12)' }
  return { label: 'Em estoque', color: '#388E3C', bg: 'rgba(56,142,60,0.12)' }
}

function MedicationCard({
  medication,
  nowTime,
  onRecordDose,
  onUndoDose,
  onEdit,
  readOnly,
}: {
  medication: Medication
  /** Current local time, "HH:MM" — slots before it and still unregistered show as overdue. */
  nowTime: string
  onRecordDose: (time: string, taken: boolean) => void
  onUndoDose: (time: string) => void
  onEdit: () => void
  /** Viewer without `editar-saude`: see doses and stock, no actions. */
  readOnly: boolean
}) {
  const badge = stockBadge(medication.stock)
  const lowStock = medication.stock <= LOW_STOCK_THRESHOLD
  // One unit per dose: stock / doses per day.
  const daysLeft = medication.times.length ? Math.floor(medication.stock / medication.times.length) : null

  return (
    <View className="rounded-3xl border border-hairline bg-white p-5 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-hanken-extrabold text-navy text-[17px] leading-6 flex-1 mr-3">
          {medication.name}
        </Text>
        <View className="px-2.5 py-1 rounded-full mr-2" style={{ backgroundColor: badge.bg }}>
          <Text className="font-hanken-bold text-[11px]" style={{ color: badge.color }}>{badge.label}</Text>
        </View>
        {readOnly ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${medication.name}`}
            onPress={onEdit}
            hitSlop={8}
            className="active:opacity-60"
          >
            <MaterialIcons name="edit" size={20} color="#11375C" />
          </Pressable>
        )}
      </View>

      {medication.principle ? (
        <Text className="font-hanken text-muted text-[13px] mb-3">{medication.principle}</Text>
      ) : null}

      {/* Dose + via + estoque */}
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1 mb-2">
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name="medication" size={15} color="#6B7A85" />
          <Text className="font-hanken-medium text-[13px]" style={{ color: '#16283A' }}>
            {medication.dose} · {medication.via}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <MaterialIcons name="inventory-2" size={15} color={lowStock ? '#C0392B' : '#6B7A85'} />
          <Text
            className="font-hanken-medium text-[13px]"
            style={{ color: lowStock ? '#C0392B' : '#16283A' }}
          >
            {medication.stock} {medication.stockUnit}
            {daysLeft !== null ? ` · ~${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : ''}
          </Text>
        </View>
      </View>

      {lowStock ? (
        <Text className="font-hanken-medium text-[12.5px] mb-2" style={{ color: '#C0392B' }}>
          {medication.stock === 0 ? 'Acabou — reponha o medicamento.' : 'Reponha em breve para não faltar.'}
        </Text>
      ) : null}

      {/* Doses de hoje */}
      <Text className="font-hanken-bold text-navy text-[13px] mt-2 mb-2">Hoje</Text>
      <View className="gap-2 mb-4">
        {medication.times.map((time) => {
          const logged = medication.today.find((d) => d.time === time)
          const overdue = !logged && time < nowTime
          return (
            <View
              key={time}
              className="flex-row items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ backgroundColor: 'rgba(17,55,92,0.04)' }}
            >
              <MaterialIcons name="schedule" size={16} color={overdue ? '#DD7C54' : '#6B7A85'} />
              <Text
                className="font-hanken-bold text-sm flex-1"
                style={{ color: overdue ? '#DD7C54' : '#16283A' }}
              >
                {time}{overdue ? ' · pendente' : ''}
              </Text>
              {logged && readOnly ? (
                <DoseChip state={logged.state} />
              ) : readOnly ? (
                <Text className="font-hanken text-muted text-xs">Sem registro</Text>
              ) : logged ? (
                <>
                  <DoseChip state={logged.state} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desfazer registro das ${time}`}
                    onPress={() => onUndoDose(time)}
                    hitSlop={8}
                    className="px-2 py-2 active:opacity-60"
                  >
                    <Text className="font-hanken-bold text-xs text-muted">Desfazer</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Pular dose das ${time}`}
                    onPress={() => onRecordDose(time, false)}
                    className="min-h-[40px] px-3 rounded-xl items-center justify-center active:opacity-70"
                    style={{ backgroundColor: 'rgba(17,55,92,0.06)', borderWidth: 1.4, borderColor: '#E4DCD3' }}
                  >
                    <Text className="font-hanken-bold text-xs" style={{ color: '#11375C' }}>Pular</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Registrar dose das ${time} como tomada`}
                    onPress={() => onRecordDose(time, true)}
                    className="min-h-[40px] px-3.5 rounded-xl flex-row items-center justify-center gap-1 bg-navy active:opacity-90"
                  >
                    <MaterialIcons name="check" size={15} color="#FFFFFF" />
                    <Text className="font-hanken-bold text-xs text-white">Tomei</Text>
                  </Pressable>
                </>
              )}
            </View>
          )
        })}
      </View>

      {/* Histórico de tomadas */}
      {medication.history.length ? (
        <View className="flex-row flex-wrap gap-2">
          {medication.history.slice(0, HISTORY_LIMIT).map((dose) => (
            <DoseChip
              key={`${dose.date}_${dose.time}`}
              state={dose.state}
              prefix={`${shortDate(dose.date)} ${dose.time}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function HealthView({
  medications,
  medsAdherence,
  medicationsLoading = false,
  medicationsError,
  reminders,
  stats,
  tasksDone,
  tasksTotal,
  onRecordDose,
  onUndoDose,
  onAddMedication,
  onEditMedication,
  readOnly = false,
}: {
  medications: Medication[]
  /** % of expected doses taken in the last 7 days; null when none was expected yet. */
  medsAdherence: number | null
  medicationsLoading?: boolean
  medicationsError?: string
  reminders: HealthReminder[]
  stats: HealthStats
  tasksDone: number
  tasksTotal: number
  onRecordDose: (medicationId: string, time: string, taken: boolean) => void
  onUndoDose: (medicationId: string, time: string) => void
  onAddMedication: () => void
  onEditMedication: (medication: Medication) => void
  /** Viewer without `editar-saude`. */
  readOnly?: boolean
}) {
  const now = new Date()
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <View>
      {/* Relatório semanal */}
      <View className="rounded-3xl bg-navy p-5 mb-6">
        <View className="flex-row items-center gap-2 mb-4">
          <MaterialIcons name="insights" size={18} color="#FDF9F6" />
          <Text className="font-hanken-bold text-offwhite text-base">Resumo da semana</Text>
        </View>
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-hanken text-white/70 text-sm">Medicações tomadas</Text>
            <Text className="font-hanken-bold text-offwhite text-sm">
              {medsAdherence === null ? '—' : `${medsAdherence}%`}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-hanken text-white/70 text-sm">Consultas (realizadas/agendadas)</Text>
            <Text className="font-hanken-bold text-offwhite text-sm">
              {stats.appointmentsDone}/{stats.appointmentsTotal}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-hanken text-white/70 text-sm">Tarefas concluídas</Text>
            <Text className="font-hanken-bold text-offwhite text-sm">
              {tasksDone}/{tasksTotal}
            </Text>
          </View>
        </View>
      </View>

      {/* Lembretes de saúde */}
      <SectionTitle>Lembretes de saúde</SectionTitle>
      <View className="mb-6">
        {reminders.map((reminder) => {
          const meta = REMINDER_META[reminder.kind]
          return (
            <View
              key={reminder.id}
              className="flex-row items-center gap-3 p-4 rounded-2xl border border-hairline bg-white mb-3"
            >
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center"
                style={{ backgroundColor: `${meta.color}1A` }}
              >
                <MaterialIcons name={meta.icon} size={19} color={meta.color} />
              </View>
              <View className="flex-1">
                <Text className="font-hanken-bold text-navy text-sm">{reminder.title}</Text>
                <Text className="font-hanken text-muted text-xs mt-0.5">{reminder.detail}</Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* Medicamentos */}
      <SectionTitle>Medicamentos</SectionTitle>
      {readOnly ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar medicamento"
          onPress={onAddMedication}
          className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mb-4 active:opacity-90"
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text className="font-hanken-bold text-base text-white">Adicionar medicamento</Text>
        </Pressable>
      )}

      {medicationsError ? (
        <Text className="font-hanken-medium text-terracotta text-[13px] mb-3">{medicationsError}</Text>
      ) : null}

      {medicationsLoading && medications.length === 0 ? (
        <Text className="font-hanken text-muted text-sm px-1 py-4">Carregando medicamentos…</Text>
      ) : medications.length === 0 ? (
        <View className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white">
          <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
            <MaterialIcons name="medication" size={22} color="#11375C" />
          </View>
          <Text className="font-hanken text-muted text-[13px] flex-1">
            {readOnly
              ? 'Nenhum medicamento cadastrado.'
              : 'Nenhum medicamento cadastrado. Adicione para registrar as doses e acompanhar o estoque.'}
          </Text>
        </View>
      ) : (
        medications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            nowTime={nowTime}
            onRecordDose={(time, taken) => onRecordDose(medication.id, time, taken)}
            onUndoDose={(time) => onUndoDose(medication.id, time)}
            onEdit={() => onEditMedication(medication)}
            readOnly={readOnly}
          />
        ))
      )}
    </View>
  )
}
