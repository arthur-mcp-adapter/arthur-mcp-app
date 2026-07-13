import type { PromptTemplateSummary } from '../../features/templates'

export interface PromptTemplateCardProps {
  template: PromptTemplateSummary
  loading: boolean
  onUse: (id: string) => void
}
