export interface AlertConfigPanelProps {
  projectId: string
  initialConfig?: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }
}
