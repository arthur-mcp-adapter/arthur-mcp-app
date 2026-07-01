export type AiProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'gemini'
  | 'mistral'
  | 'groq'
  | 'cohere'
  | 'azure-openai'
  | 'azure'
  | 'ollama'
  | 'custom'

export interface AiProvider {
  id: string
  name: string
  description?: string
  provider: AiProviderType
  model: string
  baseUrl?: string
  apiKeySet: boolean
  isActive: boolean
  isDefault: boolean
  lastTestStatus?: 'success' | 'error'
  lastTestedAt?: string
  lastTestError?: string
  createdAt: string
  updatedAt: string
}
