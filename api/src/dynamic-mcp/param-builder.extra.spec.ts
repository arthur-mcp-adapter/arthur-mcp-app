import { buildParams } from './param-builder';
import { NormalizedEndpoint } from './types';

const endpoint = (override: Partial<NormalizedEndpoint>): NormalizedEndpoint => ({
  method: 'post',
  path: '/users/{id}',
  operationId: 'createUser',
  parameters: [],
  responses: {},
  ...override,
});

describe('buildParams additional behavior', () => {
  it('builds path, query, header, and flattened body parameters', () => {
    const result = buildParams(endpoint({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'User id' },
        { name: 'include', in: 'query', required: false, schema: { type: 'boolean' } },
        { name: 'x-tenant', in: 'header', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        },
      },
    }));

    expect(result.inputSchema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User id' },
        include: { type: 'boolean', description: undefined },
        'x-tenant': { type: 'string', description: undefined },
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['id', 'x-tenant', 'name'],
    });
    expect(result.parameterMap).toEqual([
      { toolParamName: 'id', source: 'path', originalName: 'id', required: true },
      { toolParamName: 'include', source: 'query', originalName: 'include', required: false },
      { toolParamName: 'x-tenant', source: 'header', originalName: 'x-tenant', required: true },
      { toolParamName: 'name', source: 'body', originalName: 'name', required: false },
      { toolParamName: 'age', source: 'body', originalName: 'age', required: false },
    ]);
  });

  it('skips standard headers and prefixes duplicate names', () => {
    const result = buildParams(endpoint({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'id', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'authorization', in: 'header', required: true, schema: { type: 'string' } },
      ],
    }));

    expect(Object.keys(result.inputSchema.properties ?? {})).toEqual(['id', 'query_id']);
    expect(result.parameterMap).toEqual([
      { toolParamName: 'id', source: 'path', originalName: 'id', required: true },
      { toolParamName: 'query_id', source: 'query', originalName: 'id', required: false },
    ]);
  });

  it('wraps complex request bodies in a body parameter', () => {
    const properties = Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [`field${i}`, { type: 'string' }]),
    );

    const result = buildParams(endpoint({
      requestBody: {
        required: true,
        description: 'Complex payload',
        contentType: 'application/json',
        schema: { type: 'object', properties },
      },
    }));

    expect(result.inputSchema).toEqual({
      type: 'object',
      properties: {
        body: { type: 'object', properties, description: 'Complex payload' },
      },
      required: ['body'],
    });
    expect(result.parameterMap).toEqual([
      { toolParamName: 'body', source: 'body', originalName: 'body', required: true },
    ]);
  });
});
