import type { OperationTone } from '../operationTone.type'

export const operationStyles: Record<OperationTone, { label: string; color: string; bg: string }> = {
  tool: { label: 'TOOL', color: '#61affe', bg: 'rgba(97, 175, 254, 0.1)' },
  resource: { label: 'RESOURCE', color: '#9012fe', bg: 'rgba(144, 18, 254, 0.09)' },
  prompt: { label: 'PROMPT', color: '#fca130', bg: 'rgba(252, 161, 48, 0.12)' },
  setupClaude: { label: 'CLAUDE', color: '#9012fe', bg: 'rgba(144, 18, 254, 0.09)' },
  setupCursor: { label: 'CURSOR', color: '#61affe', bg: 'rgba(97, 175, 254, 0.1)' },
  setupGeneral: { label: 'GENERAL', color: '#49cc90', bg: 'rgba(73, 204, 144, 0.1)' },
  general: { label: 'GENERAL', color: '#49cc90', bg: 'rgba(73, 204, 144, 0.1)' },
}
