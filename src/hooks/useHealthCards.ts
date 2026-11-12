import { useCallback, useEffect, useState } from 'react'

import type { HealthCard, HealthCardInput } from '@/components/care/types'
import * as healthCards from '@/services/firebase/health-cards'
import type { HealthCardDoc } from '@/services/firebase/health-cards'

function toCard(doc: HealthCardDoc): HealthCard {
  return { id: doc.id, operator: doc.operator, number: doc.number, code: doc.code, holder: doc.holder }
}

/**
 * The circle's health plan cards. `circleId` is undefined while the circle is not ready or the
 * member lacks `ver-saude` (the rules deny the read otherwise). Create/update/remove throw so the
 * form can show the failure; a duplicate number throws DuplicateCardError.
 */
export function useHealthCards(circleId: string | undefined) {
  const [docs, setDocs] = useState<HealthCardDoc[]>([])
  const [loading, setLoading] = useState(circleId !== undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  // Reset during render when the circle changes (same pattern as useMedications).
  const [loadedFor, setLoadedFor] = useState(circleId)
  if (loadedFor !== circleId) {
    setLoadedFor(circleId)
    setDocs([])
    setError(undefined)
    setLoading(circleId !== undefined)
  }

  useEffect(() => {
    if (!circleId) return
    let active = true
    healthCards
      .listHealthCards(circleId)
      .then((loaded) => {
        if (active) setDocs(loaded)
      })
      .catch((e) => {
        console.warn('listHealthCards failed', e)
        if (active) setError('Não foi possível carregar os cartões.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [circleId])

  const create = useCallback(
    async (input: HealthCardInput): Promise<void> => {
      if (!circleId) throw new Error('No circle')
      const created = await healthCards.createHealthCard(circleId, input)
      setDocs((prev) => [...prev, created])
    },
    [circleId]
  )

  const update = useCallback(
    async (cardId: string, input: HealthCardInput): Promise<void> => {
      if (!circleId) throw new Error('No circle')
      const current = docs.find((d) => d.id === cardId)
      if (!current) throw new Error('Card not found')
      const updated = await healthCards.updateHealthCard(circleId, current, input)
      setDocs((prev) => prev.map((d) => (d.id === cardId ? updated : d)))
    },
    [circleId, docs]
  )

  const remove = useCallback(
    async (cardId: string): Promise<void> => {
      if (!circleId) throw new Error('No circle')
      await healthCards.deleteHealthCard(circleId, cardId)
      setDocs((prev) => prev.filter((d) => d.id !== cardId))
    },
    [circleId]
  )

  return { cards: docs.map(toCard), loading, error, create, update, remove }
}
