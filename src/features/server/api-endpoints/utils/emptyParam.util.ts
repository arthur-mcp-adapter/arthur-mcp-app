import type { ParamEntry } from '../../types'

export function emptyParam(): ParamEntry {
  return { id: Math.random().toString(36).slice(2), toolParamName: '', source: 'query', originalName: '', required: false, type: 'string', description: '' }
}
