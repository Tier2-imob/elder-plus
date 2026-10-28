import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Tiny JSON cache over AsyncStorage for "show the last known data instantly, refresh in the
 * background" (stale-while-revalidate). Never throws: a missing, corrupt or unreadable entry reads
 * as null, and a failed write is only logged — the cache is an accelerator, never the source of truth.
 */

const PREFIX = 'elder:cache:'

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (e) {
    console.warn('readCache failed', key, e)
    return null
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('writeCache failed', key, e)
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key)
  } catch (e) {
    console.warn('clearCache failed', key, e)
  }
}

/**
 * Remove every app cache entry (account profile, circle tasks…) from the device — used when the
 * session ends, so no care data stays on the phone after logout. Never throws.
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX))
    if (keys.length) await AsyncStorage.multiRemove(keys)
  } catch (e) {
    console.warn('clearAllCaches failed', e)
  }
}
