import type { AuthChipColor } from '../authChipColor.type'

export const AUTH_CHIP_COLORS: Record<string, AuthChipColor> = {
  none: 'default',
  bearer: 'primary',
  'api-key': 'warning',
  basic: 'error',
}
