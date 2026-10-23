import type {
  HealthReminder,
  HealthStats,
} from '@/components/care/types'

/**
 * Dados privados do círculo de cuidado (protótipo). Quando as coleções do
 * Firestore existirem (reminders/), estas constantes
 * saem daqui e passam a vir dos hooks correspondentes.
 */

export const HEALTH_REMINDERS: HealthReminder[] = [
  { id: 'hr1', kind: 'consulta', title: 'Consulta com cardiologista', detail: 'Qua, 14/09 às 09:30 — Clínica Vida Ativa' },
  { id: 'hr2', kind: 'exame', title: 'Exame de sangue pendente', detail: 'Resultado aguardando — laboratório Hemolab' },
  { id: 'hr3', kind: 'vacina', title: 'Vacina da gripe em atraso', detail: 'Campanha 2026 — UBS mais próxima' },
]

export const APPOINTMENT_STATS: HealthStats = { appointmentsDone: 2, appointmentsTotal: 3 }
