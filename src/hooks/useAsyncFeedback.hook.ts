import { useState } from 'react'
import type { AsyncFeedback } from './asyncFeedback.interface'

export function useAsyncFeedback() {
  const [feedback, setFeedback] = useState<AsyncFeedback>({ open: false, message: '', severity: 'success' })

  const showFeedback = (message: string, severity: AsyncFeedback['severity'] = 'success') => {
    setFeedback({ open: true, message, severity })
  }

  const clearFeedback = () => {
    setFeedback((current) => ({ ...current, open: false }))
  }

  return { feedback, showFeedback, clearFeedback }
}
