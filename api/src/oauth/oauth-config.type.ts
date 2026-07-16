export type OAuthConfig =
  | { mode: 'none' }
  | { mode: 'managed' }
  | {
      mode: 'external';
      issuer: string;
      authorizationUrl: string;
      tokenUrl: string;
      jwksUrl?: string;
      introspectionUrl?: string;
      introspectionClientId?: string;
      introspectionClientSecret?: string;
      audience: string;
      scopes: string[];
    };
