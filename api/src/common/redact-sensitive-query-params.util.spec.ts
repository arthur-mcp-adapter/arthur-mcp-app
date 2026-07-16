import { redactSensitiveQueryParams } from './redact-sensitive-query-params.util';

describe('redactSensitiveQueryParams', () => {
  it('redacts auth query parameters without changing other URL parts', () => {
    expect(redactSensitiveQueryParams('/api/mcp/server/demo?auth=secret-key&mode=test'))
      .toBe('/api/mcp/server/demo?auth=[REDACTED]&mode=test');
  });

  it('leaves URLs without an auth query parameter unchanged', () => {
    expect(redactSensitiveQueryParams('/api/mcp/server/demo?mode=test'))
      .toBe('/api/mcp/server/demo?mode=test');
  });
});
