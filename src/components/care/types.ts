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
  /** uid of the responsible circle member (only while they are an active member). */
  assigneeId?: string
  /** That member's current name, for display. */
  assignee?: string
  status?: TaskStatus
  description?: string
  /** Creation moment; undefined/null on the initial seeded tasks. */
  createdAt?: Date | null
  /** Name of who created the task; undefined on the initial seeded tasks. */
  createdBy?: string
}

/** Fields the user fills in the "Nova tarefa" form. */
export type NewTaskInput = {
  title: string
  description?: string
  category: TaskCategory
  dayKey: string
  day: string
  time: string
  /** uid of the responsible circle member. */
  assigneeId?: string
}

/** Time slots offered when creating or postponing a task. */
export const TASK_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
]

/** Fixed homologation week (TODO: follow the real calendar). */
export const WEEK_DAYS = [
  { key: 'mon', short: 'Seg', date: '12', full: 'Segunda-feira' },
  { key: 'tue', short: 'Ter', date: '13', full: 'Terça-feira' },
  { key: 'wed', short: 'Qua', date: '14', full: 'Quarta-feira' },
  { key: 'thu', short: 'Qui', date: '15', full: 'Quinta-feira' },
  { key: 'fri', short: 'Sex', date: '16', full: 'Sexta-feira' },
  { key: 'sat', short: 'Sáb', date: '17', full: 'Sábado' },
  { key: 'sun', short: 'Dom', date: '18', full: 'Domingo' },
]

export const TODAY_KEY = 'wed'

// ─── Saúde ─────────────────────────────────────────────────────────────────────

export type MedicationDoseState = 'tomou' | 'nao-tomou' | 'atrasou'

export type MedicationDose = {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string
  /** Scheduled slot, "HH:MM". */
  time: string
  state: MedicationDoseState
}

export type Medication = {
  id: string
  name: string
  principle: string
  dose: string
  via: string
  /** Daily dose times in "HH:MM", ascending. */
  times: string[]
  stock: number
  stockUnit: string
  /** Doses registered today, one per slot at most. */
  today: MedicationDose[]
  /** Doses registered before today (last 7 days), newest first. */
  history: MedicationDose[]
}

/** Fields the user fills in the medication form (create and edit). */
export type MedicationInput = {
  name: string
  principle: string
  dose: string
  via: string
  times: string[]
  stock: number
  stockUnit: string
}

/** Stock at or below this many units is flagged as low. */
export const LOW_STOCK_THRESHOLD = 5

/** "Tomei" registered more than this many minutes after the slot counts as late ("atrasou"). */
export const LATE_TOLERANCE_MIN = 60

export const MEDICATION_VIAS = ['oral', 'sublingual', 'injetável', 'inalatória', 'tópica', 'colírio']

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
  | 'gerenciar-membros'

export type FamilyMember = {
  id: string
  name: string
  /** Display line: "Filha — Familiar". */
  role: string
  initials: string
  lastAccess: string
  permissions: PermissionKey[]
  /** The viewer's own card. */
  isSelf?: boolean
  /** The viewer may edit or remove this member. */
  editable?: boolean
  circleRole?: CircleRole
  label?: string | null
  /** Digits ("11912345678"), when the member registered one. */
  phone?: string | null
}

/** An open invite as the Familia tab lists it. */
export type InviteSummary = {
  code: string
  /** "Familiar", "Profissional — Geriatra"... */
  roleLabel: string
  /** "23/10" */
  expiresLabel: string
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'ver-rotina': 'Ver rotina',
  'editar-rotina': 'Editar rotina',
  'ver-saude': 'Ver saúde',
  'editar-saude': 'Editar saúde',
  emergencia: 'Contato de emergência',
  'gerenciar-membros': 'Gerenciar membros',
}

// ─── Círculo de cuidado ──────────────────────────────────────────────────────

/**
 * Role inside a care circle. `titular` is the assisted person WITH an account (a nominal titular
 * has no member doc — it lives only in the circle's `subject`). Partners never join a circle.
 */
export type CircleRole = 'titular' | 'admin' | 'familiar' | 'profissional' | 'observador'

export type MemberStatus = 'pendente' | 'ativo'

export const ALL_PERMISSIONS: PermissionKey[] = [
  'ver-rotina',
  'editar-rotina',
  'ver-saude',
  'editar-saude',
  'emergencia',
  'gerenciar-membros',
]

export const CIRCLE_ROLE_LABELS: Record<CircleRole, string> = {
  titular: 'Pessoa assistida',
  admin: 'Administrador',
  familiar: 'Familiar',
  profissional: 'Profissional',
  observador: 'Observador',
}

/** Starting permission set per role; a manager can then adjust each member individually. */
export const ROLE_DEFAULT_PERMISSIONS: Record<CircleRole, PermissionKey[]> = {
  titular: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  familiar: ['ver-rotina', 'editar-rotina', 'ver-saude'],
  profissional: ['ver-saude', 'editar-saude'],
  observador: ['ver-rotina'],
}

/** Limits agreed for the MVP (also enforced by the Firestore rules where possible). */
export const CIRCLE_LIMITS = {
  /** Active + pending members. */
  maxMembers: 10,
  maxEmergencyContacts: 3,
  inviteValidityDays: 7,
  /** Circles one account can take part in (active or pending). Mirrors firestore.rules. */
  maxCircles: 5,
}
