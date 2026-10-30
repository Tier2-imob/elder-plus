/**
 * What a Firestore document snapshot lets the app conclude. Kept free of Firebase imports so it can
 * be unit-tested (tests/unit).
 *
 * - `skip`: the snapshot only reflects the app's own write, which the server has not confirmed yet
 *   (only when the caller asked to wait for the server).
 * - `unconfirmed`: the document is absent AND the snapshot came from the local cache. On a device
 *   with no connection and nothing cached, Firestore answers like this after its offline timeout:
 *   absence proves nothing, so it must not be read as "the user has no circle".
 * - `ready`: trustworthy — the document exists, or the server confirmed it does not.
 */
export type SnapshotState = 'skip' | 'unconfirmed' | 'ready'

export function classifySnapshot(
  snapshot: { exists: boolean; fromCache: boolean; hasPendingWrites: boolean },
  { waitForServerWrites = false }: { waitForServerWrites?: boolean } = {}
): SnapshotState {
  if (waitForServerWrites && snapshot.hasPendingWrites) return 'skip'
  // A local delete in flight (leaving a circle) is also "absent from the cache" but is not offline.
  if (!snapshot.exists && snapshot.fromCache && !snapshot.hasPendingWrites) return 'unconfirmed'
  return 'ready'
}
