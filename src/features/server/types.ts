export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2-client' | 'custom'

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] }

export interface RateLimitPanelProps {
  projectId: string
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}

export interface ScheduleEntry {
  id: string
  day: number
  startHour: number
  endHour: number
}

export interface McpApiKeyEntry {
  id: string
  name: string
  key: string
  createdAt: string
}

export interface ExecLog {
  _id: string
  toolName: string
  source: 'mcp' | 'direct'
  statusCode: number
  responseTimeMs: number
  isError: boolean
  errorMessage?: string
  createdAt: string
}

export interface ParameterMapping {
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
}

export interface EndpointRef {
  method: string
  path: string
  baseUrl: string
  contentType?: string
  parameterMap: ParameterMapping[]
}

export interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  description?: string
  enum?: unknown[]
}

export interface ToolComment {
  id: string
  text: string
  author: string
  createdAt: string
}

export interface ExecutionRef {
  type: 'sql' | 'mongodb' | 'redis' | 'elasticsearch' | 'dynamodb' | 'firestore' | 'db' | 'static'
  dialect?: string
  query?: string
  paramStyle?: string
  resultMode?: string
  collection?: string
  operation?: string
  filterTemplate?: string
  projectionTemplate?: string
  pipeline?: unknown[]
  documentTemplate?: string
  command?: string
  keyPattern?: string
  valueTemplate?: string
  dbQueryId?: string
  responseTemplate?: string
  mimeType?: string
}

export interface GeneratedTool {
  name: string
  description?: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  outputTemplate?: string
  errorConfig?: { message: string }
  endpointRef?: EndpointRef
  executionRef?: ExecutionRef
  endpointSource?: string
  enabled?: boolean
  comments?: ToolComment[]
}
