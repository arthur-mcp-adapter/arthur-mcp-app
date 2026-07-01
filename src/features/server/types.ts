// ─── Shared types for the server feature modules ──────────────────────────────

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

export interface GeneratedTool {
  id?: string
  name: string
  description?: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  outputTemplate?: string
  errorConfig?: { message: string }
  endpointRef: EndpointRef
  endpointSource?: string
  enabled?: boolean
  comments?: ToolComment[]
}

export interface McpApiKeyEntry {
  id: string
  name: string
  key: string
  createdAt: string
}

export interface McpResource {
  id: string
  name: string
  uri: string
  description?: string
  mimeType?: string
  content: string
  editorData?: string
  type?: 'static' | 'dynamic'
  endpointRef?: EndpointRef
  endpointSource?: string
  inputDefaults?: Record<string, unknown>
  iteratorPath?: string
  errorConfig?: { message: string }
  enabled?: boolean
}

export interface McpPrompt {
  promptId: string
  enabled?: boolean
}

export type ChainInputSource =
  | { source: 'literal'; value: string }
  | { source: 'chain_input'; paramName: string }
  | { source: 'step_output'; stepId: string; jsonPath: string }

export interface ChainInputMapping {
  paramName: string
  input: ChainInputSource
}

export interface ChainStep {
  id: string
  toolName: string
  inputMapping: ChainInputMapping[]
}

export interface ToolChain {
  id: string
  name: string
  description?: string
  inputSchema: JsonSchema
  steps: ChainStep[]
  enabled?: boolean
}

export interface GlobalPrompt {
  id: string
  name: string
  description?: string
  content: string
  tags: string[]
}

export interface Project {
  _id: string
  name: string
  baseUrl: string
  description?: string
  tags?: string[]
  version?: string
  shareSlug?: string | null
  status: string
  isPaused?: boolean
  maintenanceMode?: { enabled: boolean; message: string }
  availabilityWindow?: { enabled: boolean; timezone: string; schedule?: Array<{ day: number; startHour: number; endHour: number }> }
  alertConfig?: { enabled: boolean; errorThresholdPct: number; notifyEmail: string }
  tools: GeneratedTool[]
  resources?: McpResource[]
  prompts?: McpPrompt[]
  chains?: ToolChain[]
  mcpApiKey?: string
  mcpApiKeys?: McpApiKeyEntry[]
  oauthClientId?: string
  oauthClientSecret?: string
  rateLimit?: { enabled: boolean; requestsPerMinute: number }
  responseConfig?: {
    enabled: boolean
    maxResponseLen?: number
    maxDepth?: number
    arraySlice?: number
    errorTruncateLen?: number
  }
  auth?: AuthConfig
  createdAt: string
  updatedAt: string
}

export type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2-client' | 'custom'

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] }

export interface InlineEditProps {
  value: string
  onSave: (v: string) => Promise<void>
  readOnly?: boolean
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  fontSize?: string | number
  fontWeight?: number
  color?: string
  fontFamily?: string
  maxWidth?: number | string
}

export interface ParamEntry {
  id: string
  toolParamName: string
  source: 'path' | 'query' | 'header' | 'body'
  originalName: string
  required: boolean
  type: string
  description: string
}

export interface HeaderEntry {
  id: string
  name: string
  value: string
}

export interface ToolDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (tool: GeneratedTool, oldName?: string) => void
  onDeleted?: (toolName: string) => void
  projectId: string
  projectBaseUrl: string
  editTool?: GeneratedTool
  prefillFrom?: GeneratedTool
  mode?: 'tool' | 'endpoint'
  allTools?: GeneratedTool[]
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface RateLimitPanelProps {
  projectId: string
  initialRateLimit?: { enabled: boolean; requestsPerMinute: number }
  onChange: (rl: { enabled: boolean; requestsPerMinute: number }) => void
}

export interface ResponseConfig {
  enabled: boolean
  maxResponseLen?: number
  maxDepth?: number
  arraySlice?: number
  errorTruncateLen?: number
}

export interface ResponseLimitPanelProps {
  projectId: string
  initialConfig?: ResponseConfig
  onChange: (cfg: ResponseConfig) => void
}

export interface ScheduleEntry {
  id: string
  day: number
  startHour: number
  endHour: number
}

export type TenantParamType = 'string' | 'integer' | 'number' | 'boolean' | 'uuid' | 'hash'

export interface TenantParam {
  name: string
  type: TenantParamType
  description?: string
  required?: boolean
}

export interface HbScalar {
  path: string
  sample: string
}

export interface HbArray {
  path: string
  length: number
  itemScalars: string[]
}

export interface ExecLog {
  _id: string
  toolName: string
  source: 'mcp' | 'direct'
  statusCode: number
  responseTimeMs: number
  isError: boolean
  errorMessage?: string
  requestPayload?: unknown
  responsePayload?: unknown
  createdAt: string
}

export interface HealthEntry {
  projectId: string
  errorRatePct: number
  totalCalls: number
  isPaused: boolean
}

export interface HealthSummaryEntry {
  projectId: string
  isPaused: boolean
  errorRatePct: number
  totalCalls: number
}
