import type { SourceType } from '../sourceType.type'

export function getSourceType(project: { tags?: string[] }): SourceType {
  const tag = (project.tags ?? []).find(t => t.startsWith('source:'))
  return (tag?.slice(7) as SourceType) ?? 'rest'
}
