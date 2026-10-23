import type {
  FamilyMember,
  HealthReminder,
  HealthStats,
} from '@/components/care/types'

/**
 * Dados privados do círculo de cuidado (protótipo). Quando as coleções do
 * Firestore existirem (reminders/, family/), estes constantes
 * saem daqui e passam a vir dos hooks correspondentes.
 */

export const HEALTH_REMINDERS: HealthReminder[] = [
  { id: 'hr1', kind: 'consulta', title: 'Consulta com cardiologista', detail: 'Qua, 14/09 às 09:30 — Clínica Vida Ativa' },
  { id: 'hr2', kind: 'exame', title: 'Exame de sangue pendente', detail: 'Resultado aguardando — laboratório Hemolab' },
  { id: 'hr3', kind: 'vacina', title: 'Vacina da gripe em atraso', detail: 'Campanha 2026 — UBS mais próxima' },
]

export const APPOINTMENT_STATS: HealthStats = { appointmentsDone: 2, appointmentsTotal: 3 }

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'fm1',
    name: 'Maria Silva',
    role: 'Filha — cuidadora principal',
    initials: 'MS',
    lastAccess: 'hoje, 09:12',
    permissions: ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'emergencia'],
  },
  {
    id: 'fm2',
    name: 'João Silva',
    role: 'Filho',
    initials: 'JS',
    lastAccess: 'ontem, 18:40',
    permissions: ['ver-rotina', 'ver-saude'],
  },
  {
    id: 'fm3',
    name: 'Dra. Ana Costa',
    role: 'Médica — geriatra',
    initials: 'AC',
    lastAccess: 'seg, 14:05',
    permissions: ['ver-saude', 'editar-saude'],
  },
  {
    id: 'fm4',
    name: 'Carlos Souza',
    role: 'Cuidador profissional',
    initials: 'CS',
    lastAccess: 'hoje, 07:30',
    permissions: ['ver-rotina', 'editar-rotina'],
  },
]
