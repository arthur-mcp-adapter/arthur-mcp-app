import type { ApiTemplateSummary } from '../../features/templates'

export interface TemplateCardProps {
  template: ApiTemplateSummary
  loading: boolean
  onUse: (id: string) => void
}
