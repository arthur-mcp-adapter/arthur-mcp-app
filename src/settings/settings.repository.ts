export interface SettingsRecord {
  _id: string;
  key: string;
  serverBaseUrl: string;
  defaultTimeoutMs: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export interface ISettingsRepository {
  getGlobal(): Promise<SettingsRecord>;
  updateGlobal(data: Partial<Omit<SettingsRecord, '_id' | 'key'>>): Promise<SettingsRecord>;
}
