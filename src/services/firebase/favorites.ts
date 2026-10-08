import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from './config'

/** List the favorite business ids under users/{uid}/favorites (doc id == businessId). */
export async function listFavorites(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'favorites'))
  return snap.docs.map((d) => d.id)
}

/** Add a favorite (one doc per business, doc id == businessId). */
export async function addFavorite(uid: string, businessId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'favorites', businessId), {
    businessId,
    createdAt: serverTimestamp(),
  })
}

/** Remove a favorite. */
export async function removeFavorite(uid: string, businessId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'favorites', businessId))
}
