import { useCallback, useEffect, useState } from 'react';

import * as reviews from '@/services/firebase/reviews';
import { useAccount } from '@/state/account-context';

/** The shape BusinessScreen consumes (no createdAt — ordering is server-side). */
export type Review = { id: string; author: string; rating: number; comment: string }

/**
 * Loads a business's reviews from Firestore and exposes a submit action that optimistically
 * prepends the new review, rethrowing on write failure so the screen keeps the user's inputs.
 */
export function useBusinessReviews(businessId: string) {
  const { account } = useAccount()

  const [reviews_, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset to the loading state during render whenever the business changes (the React-recommended
  // "adjust state when a prop changes" pattern), so a route component reused across different items
  // never shows the previous business's reviews.
  const [loadedForId, setLoadedForId] = useState(businessId)
  if (loadedForId !== businessId) {
    setLoadedForId(businessId)
    setReviews([])
    setLoading(true)
    setErrorMessage(null)
  }

  useEffect(() => {
    let active = true

    reviews
      .listReviews(businessId)
      .then((docs) => {
        if (!active) return
        setReviews(docs.map((d) => ({ id: d.id, author: d.author, rating: d.rating, comment: d.comment })))
      })
      .catch((e) => {
        if (!active) return
        console.warn('listReviews failed', e)
        setErrorMessage('Não foi possível carregar as avaliações.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [businessId])

  const submitReview = useCallback(
    async (rating: number, comment: string): Promise<void> => {
      const author = account?.name ?? 'Você'
      const authorUid = account?.uid ?? ''

      const optimistic: Review = { id: `optimistic-${Date.now()}`, author, rating, comment }
      setSubmitting(true)
      setErrorMessage(null)
      // Prepend manually so the new review shows on top without sorting on a null createdAt.
      setReviews((prev) => [optimistic, ...prev])

      try {
        const saved = await reviews.addReview(businessId, { rating, comment, author, authorUid })
        setReviews((prev) =>
          prev.map((r) =>
            r.id === optimistic.id ? { id: saved.id, author: saved.author, rating: saved.rating, comment: saved.comment } : r
          )
        )
      } catch (e) {
        console.warn('addReview failed', e)
        setReviews((prev) => prev.filter((r) => r.id !== optimistic.id))
        setErrorMessage('Não foi possível enviar sua avaliação. Tente novamente.')
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [account, businessId]
  )

  return { reviews: reviews_, loading, submitting, errorMessage, submitReview }
}
