import { describe, expect, it } from 'vitest'
import { matchesTemplateSearch } from './matchesTemplateSearch.util'
import { normalizeTemplateSearch } from './normalizeTemplateSearch.util'

describe('template catalog search', () => {
  it('normalizes case, accents, separators, and whitespace', () => {
    expect(normalizeTemplateSearch('  Criação_de-APIs  ')).toBe('criacao de apis')
  })

  it('matches every query token across summary and capability fields', () => {
    expect(matchesTemplateSearch('github pull request', [
      'GitHub',
      'Code repositories',
      'list_pull_requests',
    ])).toBe(true)
    expect(matchesTemplateSearch('github invoices', [
      'GitHub',
      'Code repositories',
      'list_pull_requests',
    ])).toBe(false)
  })

  it('treats a blank query as a match', () => {
    expect(matchesTemplateSearch('   ', ['anything'])).toBe(true)
  })
})
