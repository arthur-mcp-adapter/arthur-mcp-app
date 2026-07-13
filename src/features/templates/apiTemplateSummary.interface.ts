import type { ApiTemplate } from '../../data/apiTemplate.interface'

export interface ApiTemplateSummary {
  id: string
  name: string
  tagline: string
  description: string
  category: string
  color: string
  emoji: string
  authType: ApiTemplate['auth']['type']
  toolCount: number
  docsUrl?: string
  searchTerms: string[]
}
