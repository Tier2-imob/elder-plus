import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Text, View } from 'react-native'

import type { HealthReminder, HealthStats, Medication, MedicationDoseState } from './types'

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

function SectionTitle({ children }: { children: string }) {
  return <Text className="font-hanken-bold text-navy text-base mb-4">{children}</Text>
}

function MedicationCard({ medication }: { medication: Medication }) {
  const lowStock = medication.stock <= 5

  return (
    <View className="rounded-3xl border border-hairline bg-white p-5 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-hanken-extrabold text-navy text-[17px] leading-6 flex-1 mr-3">
          {medication.name}
        </Text>
        <View
          className="px-2.5 py-1 rounded-full"
          style={{ backgroundColor: lowStock ? 'rgba(192,57,43,0.12)' : 'rgba(56,142,60,0.12)' }}
        >
          <Text
            className="font-hanken-bold text-[11px]"
            style={{ color: lowStock ? '#C0392B' : '#388E3C' }}
          >
            {lowStock ? 'Estoque baixo' : 'Em estoque'}
          </Text>
        </View>
      </View>

      <Text className="font-hanken text-muted text-[13px] mb-3">{medication.principle}</Text>

      {/* Dose + via */}
      <View className="flex-row items-center gap-4 mb-2">
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
          </Text>
        </View>
      </View>

      {/* Horários */}
      <View className="flex-row items-center gap-1.5 mb-4">
        <MaterialIcons name="schedule" size={15} color="#6B7A85" />
        <Text className="font-hanken-medium text-[13px]" style={{ color: '#16283A' }}>
          {medication.times.join(', ')}
        </Text>
      </View>

      {/* Histórico de tomadas */}
      <View className="flex-row flex-wrap gap-2">
        {medication.history.map((dose) => {
          const meta = DOSE_META[dose.state]
          return (
            <View key={dose.date} className="px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.bg }}>
              <Text className="font-hanken-bold text-[11px]" style={{ color: meta.color }}>
                {dose.date} · {meta.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function HealthView({
  medications,
  reminders,
  stats,
  tasksDone,
  tasksTotal,
}: {
  medications: Medication[]
  reminders: HealthReminder[]
  stats: HealthStats
  tasksDone: number
  tasksTotal: number
}) {
  const doses = medications.flatMap((m) => m.history)
  const taken = doses.filter((d) => d.state === 'tomou').length
  const medsPct = doses.length ? Math.round((taken / doses.length) * 100) : 0

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
            <Text className="font-hanken-bold text-offwhite text-sm">{medsPct}%</Text>
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
      {medications.map((medication) => (
        <MedicationCard key={medication.id} medication={medication} />
      ))}
    </View>
  )
}
