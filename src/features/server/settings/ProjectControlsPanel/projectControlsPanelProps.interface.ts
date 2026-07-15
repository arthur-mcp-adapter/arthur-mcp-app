export interface ProjectControlsPanelProps {
  projectId: string
  initialPaused?: boolean
  initialMaintenance?: { enabled: boolean; message: string }
  initialAvailability?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  onPausedChange: (v: boolean) => void
}
