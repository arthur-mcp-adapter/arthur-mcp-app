import type { ToolComment } from '../../types'

export interface ToolCommentsSectionProps {
  projectId: string
  toolName: string
  initialComments: ToolComment[]
}
