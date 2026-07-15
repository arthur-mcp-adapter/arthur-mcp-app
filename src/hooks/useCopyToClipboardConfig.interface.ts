export interface UseCopyToClipboardConfig {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  successMessage?: string
  errorMessage?: string
  timeout?: number // ms to keep copied state, default 1500
}
