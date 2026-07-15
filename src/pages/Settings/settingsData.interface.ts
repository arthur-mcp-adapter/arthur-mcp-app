export interface SettingsData {
  serverBaseUrl: string
  defaultTimeoutMs: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpFrom: string
  smtpPassSet: boolean
  jwtSecretSet: boolean
  globalRequestHeaders?: { name: string; value: string }[]
}
