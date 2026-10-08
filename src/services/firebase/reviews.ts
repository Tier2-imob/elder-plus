import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'

import { db } from './config'
import type { ReviewDoc } from './types'

/** List reviews for a business, newest first. */
export async function listReviews(businessId: string): Promise<ReviewDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'businesses', businessId, 'reviews'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      rating: data.rating,
      comment: data.comment,
      author: data.author,
      authorUid: data.authorUid,
      createdAt: data.createdAt ?? null,
    }
  })
}

/**
 * Add a review. Returns the new ReviewDoc; createdAt is null locally until the server round-trip
 * resolves the serverTimestamp().
 */
export async function addReview(
  businessId: string,
  input: { rating: number; comment: string; author: string; authorUid: string }
): Promise<ReviewDoc> {
  const ref = await addDoc(collection(db, 'businesses', businessId, 'reviews'), {
    rating: input.rating,
    comment: input.comment,
    author: input.author,
    authorUid: input.authorUid,
    createdAt: serverTimestamp(),
  })
  return {
    id: ref.id,
    rating: input.rating,
    comment: input.comment,
    author: input.author,
    authorUid: input.authorUid,
    createdAt: null,
  }
}
