export function resolveMcpServerIdentifier(shareSlug: string | null | undefined, projectId: string): string {
  return shareSlug?.trim() || projectId
}
