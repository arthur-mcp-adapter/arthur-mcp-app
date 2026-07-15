import type { AiProviderType } from '../../features/aiProviders'

export interface AiProviderForm {
  name: string
  description: string
  provider: AiProviderType
  model: string
  apiKey: string
  baseUrl: string
  isDefault: boolean
}
