export function extractVars(content: string): string[] {
  const matches = [...content.matchAll(/\{\{(\w+)\}\}/g)]
  return [...new Set(matches.map((m) => m[1]))]
}
