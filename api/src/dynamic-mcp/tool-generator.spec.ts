import { generateTools } from './tool-generator';
import { NormalizedSpec } from './types';

describe('generateTools', () => {
  it('generates tools with endpoint references, schemas, and overridden base URL', () => {
    const spec: NormalizedSpec = {
      info: { title: 'Payments API', version: '1.0.0' },
      servers: [{ url: 'https://ignored.example.com/' }],
      securitySchemes: {},
      endpoints: [
        {
          method: 'get',
          path: '/payments/{id}',
          operationId: 'getPayment',
          summary: 'Get a payment',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {},
        },
      ],
    };

    expect(generateTools(spec, 'https://api.example.com/')).toEqual([
      {
        name: 'getPayment',
        description: 'Get a payment [GET /payments/{id}]',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: undefined },
          },
          required: ['id'],
        },
        endpointRef: {
          method: 'GET',
          path: '/payments/{id}',
          baseUrl: 'https://api.example.com',
          contentType: 'application/json',
          parameterMap: [
            { toolParamName: 'id', source: 'path', originalName: 'id', required: true },
          ],
        },
      },
    ]);
  });

  it('sanitizes names, resolves collisions, truncates descriptions, and marks deprecated endpoints', () => {
    const longDescription = `${'x'.repeat(220)}. More text.`;
    const spec: NormalizedSpec = {
      info: { title: 'Collision API', version: '1.0.0' },
      servers: [],
      securitySchemes: {},
      endpoints: [
        { method: 'get', path: '/a value', operationId: undefined as any, parameters: [], responses: {} },
        { method: 'get', path: '/a/value', operationId: undefined as any, parameters: [], responses: {}, description: longDescription, deprecated: true },
        { method: 'post', path: '!!!', operationId: undefined as any, parameters: [], responses: {} },
      ],
    };

    const tools = generateTools(spec);

    expect(tools.map((tool) => tool.name)).toEqual(['get_a_value_1', 'get_a_value_2', 'post']);
    expect(tools[0].endpointRef.baseUrl).toBe('http://localhost');
    expect(tools[1].description).toContain('[GET /a/value]');
    expect(tools[1].description).toContain('(DEPRECATED)');
    expect(tools[1].description.length).toBeLessThan(240);
  });

  it('falls back to tool when the generated name is empty', () => {
    const spec: NormalizedSpec = {
      info: { title: 'Fallback API', version: '1.0.0' },
      servers: [],
      securitySchemes: {},
      endpoints: [
        { method: 'post', path: '', operationId: '!!!', parameters: [], responses: {} },
      ],
    };

    expect(generateTools(spec)[0].name).toBe('tool');
  });
});
