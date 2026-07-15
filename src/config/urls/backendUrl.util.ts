import { configuredApiUrl } from './configuredApiUrl.constant'

export function backendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const backendOrigin = configuredApiUrl?.replace(/\/api$/, '') || window.location.origin
  if (!path) return backendOrigin
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${backendOrigin}${normalizedPath}`
}
