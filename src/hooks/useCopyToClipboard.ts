import { useState } from 'react'

export interface CopyFeedback {
  open: boolean
  message: string
  severity: 'success' | 'error'
}

export interface UseCopyToClipboardConfig {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  successMessage?: string
  errorMessage?: string
  timeout?: number // ms to keep copied state, default 1500
}

export interface UseCopyToClipboardReturn {
  copiedId: string | null
  feedback: CopyFeedback
  copy: (text: string, id?: string) => Promise<void>
  copyAsync: <T>(
    fetch: () => Promise<T>,
    extract: (data: T) => string,
    id?: string
  ) => Promise<void>
  clearCopied: () => void
  clearFeedback: () => void
}

/**
 * Hook for copying text to clipboard with feedback.
 * Handles both simple and async copy operations.
 * Manages copied state and optional snackbar feedback.
 */
export function useCopyToClipboard(config: UseCopyToClipboardConfig = {}): UseCopyToClipboardReturn {
  const {
    onSuccess,
    onError,
    successMessage = 'Copied to clipboard',
    errorMessage = 'Could not copy',
    timeout = 1500,
  } = config

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<CopyFeedback>({ open: false, message: '', severity: 'success' })

  const showCopied = (id?: string) => {
    setCopiedId(id ?? null)
    if (timeout > 0) {
      setTimeout(() => setCopiedId(null), timeout)
    }
  }

  const showFeedback = (message: string, severity: 'success' | 'error' = 'success') => {
    setFeedback({ open: true, message, severity })
    if (timeout > 0) {
      setTimeout(() => setFeedback({ ...feedback, open: false }), timeout)
    }
  }

  const copy = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showCopied(id)
      onSuccess?.(successMessage)
    } catch {
      showFeedback(errorMessage, 'error')
      onError?.(errorMessage)
    }
  }

  const copyAsync = async <T,>(
    fetch: () => Promise<T>,
    extract: (data: T) => string,
    id?: string
  ) => {
    try {
      const data = await fetch()
      const text = extract(data)
      await navigator.clipboard.writeText(text)
      showCopied(id)
      onSuccess?.(successMessage)
    } catch {
      showFeedback(errorMessage, 'error')
      onError?.(errorMessage)
    }
  }

  const clearCopied = () => setCopiedId(null)
  const clearFeedback = () => setFeedback({ ...feedback, open: false })

  return {
    copiedId,
    feedback,
    copy,
    copyAsync,
    clearCopied,
    clearFeedback,
  }
}
