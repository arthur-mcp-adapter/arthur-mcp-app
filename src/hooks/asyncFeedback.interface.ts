export interface AsyncFeedback {
  open: boolean
  message: string
  severity: 'success' | 'error'
}
