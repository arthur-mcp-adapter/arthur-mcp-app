import { resolveSecretRefsInValue, resolveSecretValue } from './secret-resolver';

describe('secret resolver', () => {
  const secrets = new Map([
    ['DB_PASSWORD', 'correct horse battery staple'],
    ['DATABASE_URI', 'postgresql://arthur:secret@db/arthur'],
  ]);

  it('resolves multiple references inside a string and preserves missing references', () => {
    expect(resolveSecretValue(
      'password={{secret:DB_PASSWORD}} missing={{secret:UNKNOWN}}',
      secrets,
    )).toBe('password=correct horse battery staple missing={{secret:UNKNOWN}}');
  });

  it('recursively resolves connection configuration without mutating the input', () => {
    const config = {
      host: 'db.internal',
      password: '{{secret:DB_PASSWORD}}',
      uri: '{{secret:DATABASE_URI}}',
      ssl: true,
      nested: { values: ['{{secret:DB_PASSWORD}}'] },
    };

    const resolved = resolveSecretRefsInValue(config, secrets);

    expect(resolved).toEqual({
      host: 'db.internal',
      password: 'correct horse battery staple',
      uri: 'postgresql://arthur:secret@db/arthur',
      ssl: true,
      nested: { values: ['correct horse battery staple'] },
    });
    expect(config.password).toBe('{{secret:DB_PASSWORD}}');
  });
});
