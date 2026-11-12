import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { dateKey, msUntilMidnight } from '@/services/week'

/**
 * Today's date as "YYYY-MM-DD", kept current: it changes at midnight and when the app comes back to
 * the foreground (a phone that slept overnight), so screens never show yesterday as today.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()))

  useEffect(() => {
    const refresh = () => setToday(dateKey(new Date()))

    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        refresh()
        schedule()
      }, msUntilMidnight(new Date()) + 1000)
    }
    schedule()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh()
        clearTimeout(timer)
        schedule()
      }
    })
    return () => {
      clearTimeout(timer)
      subscription.remove()
    }
  }, [])

  return today
}
