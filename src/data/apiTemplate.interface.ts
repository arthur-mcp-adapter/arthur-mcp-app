import type { TemplateTool } from './templateTool.interface'

export interface ApiTemplate {
  id: string
  name: string
  tagline: string
  description: string
  category: string
  color: string
  emoji: string
  baseUrl: string
  auth: {
    type: 'none' | 'bearer' | 'api-key' | 'basic'
    hint: string
    keyName?: string
    keyIn?: 'header' | 'query'
  }
  signupUrl?: string
  docsUrl?: string
  tools: TemplateTool[]
}
