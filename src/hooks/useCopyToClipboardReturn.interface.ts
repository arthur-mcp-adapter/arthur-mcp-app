import type { CopyFeedback } from './copyFeedback.interface'

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
