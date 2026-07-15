import type { TemplateParam } from './templateParam.interface'

export interface TemplateTool {
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params: TemplateParam[]
}
