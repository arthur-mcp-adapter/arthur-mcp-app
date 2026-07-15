export interface LastTestResult {
  ok: boolean
  latencyMs: number
  error?: string
  testedAt: Date
}
