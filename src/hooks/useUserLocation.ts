import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

type LocationModule = typeof import('expo-location')

/**
 * expo-location is a native module: in a binary built before it was added, importing it throws
 * at load time and takes the whole Explore route down. Load it defensively so such a build just
 * shows the map without centring ('unsupported') until a new build is installed.
 */
const Location: LocationModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-location') as LocationModule
  } catch (e) {
    console.warn('expo-location unavailable in this build', e)
    return null
  }
})()

export type Coords = { latitude: number; longitude: number }

/**
 * - `locating`: asking permission / reading the position
 * - `ready`: `coords` holds the user's position
 * - `denied`: permission refused (`enable` asks again or opens the system settings)
 * - `unavailable`: granted, but no position could be read (GPS off, no signal)
 * - `unsupported`: this app build has no location module (needs a new native build)
 */
export type LocationStatus = 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported'

/**
 * ~110 m precision: enough to centre a map on "services near you", without handing the exact
 * address to the map provider — and small GPS jitter no longer changes the value (which would
 * reload the map's WebView).
 */
const round = (value: number) => Math.round(value * 1000) / 1000
const toCoords = (c: { latitude: number; longitude: number }): Coords => ({
  latitude: round(c.latitude),
  longitude: round(c.longitude),
})

type Reading = { status: LocationStatus; coords: Coords | null; canAskAgain: boolean }

/**
 * Ask the foreground permission and read the position. `onLastKnown` receives a recent cached
 * position right away (if any) while the fresh reading is still on its way. Never throws.
 */
async function readLocation(onLastKnown: (coords: Coords) => void): Promise<Reading> {
  if (!Location) return { status: 'unsupported', coords: null, canAskAgain: false }
  let canAskAgain = true
  let coords: Coords | null = null
  try {
    const permission = await Location.requestForegroundPermissionsAsync()
    canAskAgain = permission.canAskAgain
    if (permission.status !== 'granted') return { status: 'denied', coords: null, canAskAgain }

    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })
    if (last) {
      coords = toCoords(last.coords)
      onLastKnown(coords)
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return { status: 'ready', coords: toCoords(current.coords), canAskAgain }
  } catch (e) {
    console.warn('location failed', e)
    // A cached position still centres the map even if the fresh reading failed.
    return { status: coords ? 'ready' : 'unavailable', coords, canAskAgain }
  }
}

/**
 * The user's approximate position for the Explore map (foreground permission only). Shows the
 * last known position at once when there is a recent one, then refines it with a fresh reading.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [status, setStatus] = useState<LocationStatus>(Location ? 'locating' : 'unsupported')
  // Bumped by `enable` to run the reading again.
  const [attempt, setAttempt] = useState(0)
  const canAskAgainRef = useRef(true)

  useEffect(() => {
    let active = true
    readLocation((last) => {
      if (!active) return
      setCoords(last)
      setStatus('ready')
    }).then((reading) => {
      if (!active) return
      canAskAgainRef.current = reading.canAskAgain
      if (reading.coords) setCoords(reading.coords)
      setStatus(reading.status)
    })
    return () => {
      active = false
    }
  }, [attempt])

  /** Ask again; once the user chose "don't ask again", only the system settings can grant it. */
  const enable = useCallback(() => {
    if (!Location) return
    if (!canAskAgainRef.current) {
      void Linking.openSettings()
      return
    }
    setStatus('locating')
    setAttempt((n) => n + 1)
  }, [])

  return { coords, status, enable }
}
