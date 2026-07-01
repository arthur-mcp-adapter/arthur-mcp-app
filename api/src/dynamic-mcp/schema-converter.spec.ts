import { convertToJsonSchema } from './schema-converter';

describe('convertToJsonSchema', () => {
  it('falls back to string for invalid schemas', () => {
    expect(convertToJsonSchema(null as any)).toEqual({ type: 'string' });
    expect(convertToJsonSchema('bad' as any)).toEqual({ type: 'string' });
  });

  it('copies primitive schema metadata', () => {
    expect(convertToJsonSchema({
      type: 'string',
      description: 'User id',
      format: 'uuid',
      default: 'abc',
      enum: ['abc', 'def'],
    })).toEqual({
      type: 'string',
      description: 'User id',
      format: 'uuid',
      default: 'abc',
      enum: ['abc', 'def'],
    });
  });

  it('converts object properties and filters required values', () => {
    expect(convertToJsonSchema({
      type: 'object',
      properties: {
        id: { type: 'string' },
        count: { type: 'number' },
        ignored: null,
      },
      required: ['id', 42],
    })).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['id'],
    });
  });

  it('converts array items', () => {
    expect(convertToJsonSchema({
      type: 'array',
      items: { type: 'integer', description: 'Item id' },
    })).toEqual({
      type: 'array',
      items: { type: 'integer', description: 'Item id' },
    });
  });

  it('merges allOf schemas', () => {
    expect(convertToJsonSchema({
      allOf: [
        { description: 'Combined', properties: { id: { type: 'string' } }, required: ['id'] },
        { properties: { name: { type: 'string' } }, required: ['name'] },
      ],
    })).toEqual({
      type: 'object',
      description: 'Combined',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    });
  });

  it('uses the first oneOf or anyOf schema', () => {
    expect(convertToJsonSchema({ oneOf: [{ type: 'boolean' }, { type: 'string' }] })).toEqual({ type: 'boolean' });
    expect(convertToJsonSchema({ anyOf: [{ type: 'number' }, { type: 'string' }] })).toEqual({ type: 'number' });
  });

  it('defaults schemas without known shape to string', () => {
    expect(convertToJsonSchema({ title: 'Unknown' })).toEqual({ type: 'string' });
  });
});
