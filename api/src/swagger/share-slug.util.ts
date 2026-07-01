import type { SwaggerProjectRecord } from './swagger-project.repository';

export function normalizeShareSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function baseShareSlug(name: string): string {
  return normalizeShareSlug(name).slice(0, 80).replace(/-+$/g, '') || 'mcp-server';
}

export function uniqueShareSlug(
  nameOrSlug: string,
  servers: Pick<SwaggerProjectRecord, '_id' | 'shareSlug'>[],
  currentServerId?: string,
): string {
  const base = baseShareSlug(nameOrSlug);
  const used = new Set(
    servers
      .filter((server) => server._id !== currentServerId)
      .map((server) => server.shareSlug)
      .filter((value): value is string => !!value),
  );

  if (!used.has(base)) return base;

  const suffixLimit = 80 - base.length - 1;
  const prefix = suffixLimit >= 1 ? base : base.slice(0, 78);
  let counter = 2;
  let candidate = `${prefix}-${counter}`;

  while (used.has(candidate)) {
    counter += 1;
    const suffix = `-${counter}`;
    candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
  }

  return candidate;
}
