const SECRET_REF_PATTERN = /\{\{secret:([^}]+)\}\}/g;

export function resolveSecretValue(value: string, secrets: Map<string, string>): string {
  return value.replace(SECRET_REF_PATTERN, (reference, name: string) => {
    return secrets.get(name.trim()) ?? reference;
  });
}

export function resolveSecretRefsInValue<T>(value: T, secrets: Map<string, string>): T {
  if (typeof value === 'string') {
    return resolveSecretValue(value, secrets) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveSecretRefsInValue(item, secrets)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        resolveSecretRefsInValue(item, secrets),
      ]),
    ) as T;
  }

  return value;
}
