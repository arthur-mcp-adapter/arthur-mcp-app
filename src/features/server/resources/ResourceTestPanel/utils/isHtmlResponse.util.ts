export function isHtmlResponse(text: string, mimeType?: string) {
  if (mimeType?.toLowerCase().includes('html')) return true
  return /<!doctype\s+html|<html[\s>]|<body[\s>]|<[a-z][\s\S]*>/i.test(text.trim())
}
