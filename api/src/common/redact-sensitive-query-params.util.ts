export function redactSensitiveQueryParams(value: string): string {
  return value.replace(/([?&]auth=)[^&#]*/gi, '$1[REDACTED]');
}
