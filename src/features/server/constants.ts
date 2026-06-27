export const METHOD_COLOR: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
}

export const METHOD_BG: Record<string, string> = {
  GET: 'rgba(97,175,254,0.12)',
  POST: 'rgba(73,204,144,0.12)',
  PUT: 'rgba(252,161,48,0.12)',
  PATCH: 'rgba(80,227,194,0.12)',
  DELETE: 'rgba(249,62,62,0.12)',
}

export const SOURCE_CHIP_COLOR: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  path: 'secondary',
  query: 'primary',
  body: 'success',
  header: 'warning',
}

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
export const SOURCES = ['path', 'query', 'body', 'header'] as const
export const PARAM_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array']
