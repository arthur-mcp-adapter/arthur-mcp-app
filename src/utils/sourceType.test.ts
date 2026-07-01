import { describe, it, expect } from 'vitest'
import {
  API_SOURCES,
  NOSQL_SOURCES,
  SOURCE_DISPLAY,
  SQL_SOURCES,
  type SourceType,
  getProjectIcon,
  getSourceType,
  isBlankSource,
  isDbSource,
  isNoSqlSource,
  isSqlSource,
} from './sourceType'

describe('source type helpers', () => {
  it('extracts source tags and defaults to rest', () => {
    expect(getSourceType({ tags: ['team:core', 'source:mongodb'] })).toBe('mongodb')
    expect(getSourceType({ tags: [] })).toBe('rest')
    expect(getSourceType({})).toBe('rest')
  })

  it('classifies source families', () => {
    for (const source of SQL_SOURCES) {
      expect(isSqlSource(source)).toBe(true)
      expect(isDbSource(source)).toBe(true)
      expect(isNoSqlSource(source)).toBe(false)
    }

    for (const source of NOSQL_SOURCES) {
      expect(isNoSqlSource(source)).toBe(true)
      expect(isDbSource(source)).toBe(true)
      expect(isSqlSource(source)).toBe(false)
    }

    for (const source of API_SOURCES) {
      expect(isDbSource(source)).toBe(false)
    }

    expect(isBlankSource('blank')).toBe(true)
    expect(isBlankSource('rest')).toBe(false)
  })

  it('defines display metadata for every source', () => {
    for (const source of ['blank', ...SQL_SOURCES, ...NOSQL_SOURCES, ...API_SOURCES] as SourceType[]) {
      expect(SOURCE_DISPLAY[source]).toEqual(expect.objectContaining({
        label: expect.any(String),
        emoji: expect.any(String),
        color: expect.stringMatching(/^#/),
      }))
    }
  })

  it('uses the matching template icon when the project has a template tag', () => {
    expect(getProjectIcon({ tags: ['source:rest', 'template:The Movie Database'] })).toEqual({
      label: 'The Movie Database',
      emoji: '🎬',
      color: '#01B4E4',
    })
  })

  it('falls back to the generic source icon when there is no matching template', () => {
    expect(getProjectIcon({ tags: ['source:graphql'] })).toEqual(SOURCE_DISPLAY.graphql)
    expect(getProjectIcon({ tags: ['template:Unknown Template'] })).toEqual(SOURCE_DISPLAY.rest)
    expect(getProjectIcon({})).toEqual(SOURCE_DISPLAY.rest)
  })
})
