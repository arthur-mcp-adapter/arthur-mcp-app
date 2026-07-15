import { backendUrl } from '../../config/urls'

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return backendUrl(path)
}
