import type { Project } from '../types'
import type { ApiTemplateSummary } from '../../templates'

export interface ProjectCardProps {
  p: Project
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  templateSummaries?: ApiTemplateSummary[]
}
