const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

export const API_BASE_URL = configuredApiUrl || '/api'

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`
  }
  return `${API_BASE_URL}${normalizedPath}`
}

export function backendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const backendOrigin = configuredApiUrl?.replace(/\/api$/, '') || window.location.origin
  if (!path) return backendOrigin
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${backendOrigin}${normalizedPath}`
}
