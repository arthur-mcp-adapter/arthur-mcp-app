import type { ApiTemplate } from '../../data/apiTemplate.interface'

export interface UseTemplateDialogProps {
  template: ApiTemplate
  onClose: () => void
}
