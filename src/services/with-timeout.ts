/** Rejection of {@link withTimeout}: carries `code: 'app/timeout'` for the PT message mapper. */
export class TimeoutError extends Error {
  code = 'app/timeout'
  constructor() {
    super('timeout')
  }
}

/**
 * Settles with `promise`, or rejects with a TimeoutError once `ms` have passed. The underlying
 * operation is not cancelled (Firebase/Google offer no way to), only abandoned: its late result
 * is ignored here.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
