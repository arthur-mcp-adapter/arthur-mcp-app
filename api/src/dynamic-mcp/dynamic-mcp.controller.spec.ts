import { normalizeJsonRpcBody } from './dynamic-mcp.controller';

describe('normalizeJsonRpcBody', () => {
  it('backfills jsonrpc and id on a request-shaped message', () => {
    const result = normalizeJsonRpcBody({ method: 'tools/list', params: {} }) as any;
    expect(result.jsonrpc).toBe('2.0');
    expect(result.id).toBeDefined();
  });

  it('leaves existing jsonrpc and id untouched', () => {
    const result = normalizeJsonRpcBody({ jsonrpc: '2.0', method: 'tools/list', id: 42 }) as any;
    expect(result.jsonrpc).toBe('2.0');
    expect(result.id).toBe(42);
  });

  it('does not add fields to real notifications', () => {
    const result = normalizeJsonRpcBody({ jsonrpc: '2.0', method: 'notifications/initialized' }) as any;
    expect(result.id).toBeUndefined();
  });

  it('handles batched messages', () => {
    const result = normalizeJsonRpcBody([
      { method: 'initialize' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
    ]) as any[];
    expect(result[0].id).toBeDefined();
    expect(result[1].id).toBeUndefined();
  });

  it('backfills a complete params object for a bare initialize call', () => {
    const result = normalizeJsonRpcBody({ method: 'initialize' }) as any;
    expect(result.jsonrpc).toBe('2.0');
    expect(result.id).toBeDefined();
    expect(typeof result.params.protocolVersion).toBe('string');
    expect(result.params.capabilities).toEqual({});
    expect(result.params.clientInfo).toEqual({ name: 'unknown-client', version: '0.0.0' });
  });

  it('preserves provided initialize params and only fills gaps', () => {
    const result = normalizeJsonRpcBody({
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: { protocolVersion: '2024-11-05', capabilities: { sampling: {} } },
    }) as any;
    expect(result.params.protocolVersion).toBe('2024-11-05');
    expect(result.params.capabilities).toEqual({ sampling: {} });
    expect(result.params.clientInfo).toEqual({ name: 'unknown-client', version: '0.0.0' });
  });
});
