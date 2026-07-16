import { describe, expect, it } from 'vitest'
import { resolveMcpServerIdentifier } from './resolveMcpServerIdentifier.util'

describe('resolveMcpServerIdentifier', () => {
  it('uses the public share slug for MCP transport requests', () => {
    expect(resolveMcpServerIdentifier(' payments-api ', 'project-id')).toBe('payments-api')
  })

  it('falls back to the project id for legacy servers without a slug', () => {
    expect(resolveMcpServerIdentifier(null, 'project-id')).toBe('project-id')
    expect(resolveMcpServerIdentifier('  ', 'project-id')).toBe('project-id')
  })
})
