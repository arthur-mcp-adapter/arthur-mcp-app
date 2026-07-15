import type { DbQuery } from '../types'

export const EMPTY_OPERATION: Omit<DbQuery, 'id'> = {
  name: '', description: '', sourceType: 'postgresql', query: '', resultMode: 'rows', parameters: [],
}
