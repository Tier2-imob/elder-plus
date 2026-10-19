import type MaterialIcons from '@expo/vector-icons/MaterialIcons'

// ─── Tipos compartilhados da área Cuidados (privada da família) ───────────────

export type TaskCategory =
  | 'consulta'
  | 'medicacao'
  | 'transporte'
  | 'exame'
  | 'domestica'
  | 'outro'

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida'

export type CategoryMeta = {
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
  color: string
}

export const TASK_CATEGORIES: Record<TaskCategory, CategoryMeta> = {
  consulta:   { label: 'Consulta',         icon: 'local-hospital', color: '#5B8DEF' },
  medicacao:  { label: 'Medicação',        icon: 'medication',     color: '#DD7C54' },
  transporte: { label: 'Transporte',       icon: 'directions-car', color: '#2E9E6B' },
  exame:      { label: 'Exame',            icon: 'assignment',     color: '#B0782A' },
  domestica:  { label: 'Tarefa doméstica', icon: 'home',           color: '#6B7A85' },
  outro:      { label: 'Rotina',           icon: 'event-note',     color: '#11375C' },
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pendente:     { label: 'Pendente',     color: '#B0782A', bg: 'rgba(176,120,42,0.12)' },
  em_andamento: { label: 'Em andamento', color: '#5B8DEF', bg: 'rgba(91,141,239,0.14)' },
  concluida:    { label: 'Concluída',    color: '#388E3C', bg: '#C8E6C9' },
}

export type Task = {
  id: string
  dayKey: string
  title: string
  time: string
  day: string
  icon: keyof typeof MaterialIcons.glyphMap
  category?: TaskCategory
  assignee?: string
  status?: TaskStatus
}

// ─── Saúde ─────────────────────────────────────────────────────────────────────

export type MedicationDoseState = 'tomou' | 'nao-tomou' | 'atrasou'

export type MedicationDose = { date: string; state: MedicationDoseState }

export type Medication = {
  id: string
  name: string
  principle: string
  dose: string
  via: string
  times: string[]
  stock: number
  stockUnit: string
  history: MedicationDose[]
}

export type HealthReminder = {
  id: string
  kind: 'consulta' | 'exame' | 'vacina'
  title: string
  detail: string
}

export type HealthStats = { appointmentsDone: number; appointmentsTotal: number }

// ─── Família (círculo de cuidado) ──────────────────────────────────────────────

export type PermissionKey =
  | 'ver-rotina'
  | 'editar-rotina'
  | 'ver-saude'
  | 'editar-saude'
  | 'emergencia'

export type FamilyMember = {
  id: string
  name: string
  role: string
  initials: string
  lastAccess: string
  permissions: PermissionKey[]
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'ver-rotina': 'Ver rotina',
  'editar-rotina': 'Editar rotina',
  'ver-saude': 'Ver saúde',
  'editar-saude': 'Editar saúde',
  emergencia: 'Contato de emergência',
}
