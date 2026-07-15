export interface SettingsSnapshot {
  appUrl: string
  jwtSecretConfigured: boolean
  globalRequestHeaders: { name: string; value: string }[]
  smtp: {
    configured: boolean
    host?: string
    port?: number
    user?: string
    from?: string
  }
}
