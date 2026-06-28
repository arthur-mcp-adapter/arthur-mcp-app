export type AiProviderType = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq' | 'azure' | 'custom'

export interface AiProvider {
  id: string
  name: string
  description?: string
  provider: AiProviderType
  model: string
  baseUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
