import type { HealthStats } from '@/components/care/types'

/**
 * Dados privados do círculo de cuidado (protótipo). Quando as coleções do
 * Firestore existirem (consultas/), estas constantes
 * saem daqui e passam a vir dos hooks correspondentes.
 */

export const APPOINTMENT_STATS: HealthStats = { appointmentsDone: 2, appointmentsTotal: 3 }
