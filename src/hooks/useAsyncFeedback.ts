import { useState } from 'react'

export interface AsyncFeedback {
  open: boolean
  message: string
  severity: 'success' | 'error'
}

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