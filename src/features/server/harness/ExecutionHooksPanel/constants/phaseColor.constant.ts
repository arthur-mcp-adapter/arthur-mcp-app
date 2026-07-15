import type { HookPhase } from '../hookPhase.type'

export const PHASE_COLOR: Record<HookPhase, 'primary' | 'secondary'> = {
  before: 'primary',
  after: 'secondary',
}
