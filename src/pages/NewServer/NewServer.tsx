import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../context/auth'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconArrowLeft,
  IconArrowRight,
  IconPlus,
  IconCloudUpload,
  IconFile,
  IconX,
  IconTrash,
  IconKey,
  IconEye,
  IconEyeOff,
  IconTool,
  IconSparkles,
  IconPackage,
  IconTag,
  IconCircleCheck,
} from '@tabler/icons-react'
import api from '../../api'
import { isValidUrl } from '../../utils/validation'
import { uid } from '../../utils/id'
import type { SourceType } from './sourceType.type'
import type { AuthType } from './authType.type'
import type { LocalTool } from './localTool.interface'
import type { SpecMeta } from './specMeta.interface'
import type { AiProviderOption } from './aiProviderOption.interface'
import { SOURCE_TYPES } from './constants/sourceTypes.constant'
import { DB_PORT_DEFAULTS } from './constants/dbPortDefaults.constant'
import { SQL_HOSTS } from './constants/sqlHosts.constant'
import { AI_TOOL_IMPROVEMENT_AVAILABLE } from './constants/aiToolImprovementAvailable.constant'
import { DB_DATABASE_LABEL } from './constants/dbDatabaseLabel.constant'
import { DB_DATABASE_PLACEHOLDER } from './constants/dbDatabasePlaceholder.constant'
import { STEP_KEYS } from './constants/stepKeys.constant'
import { DEFAULT_STEP_KEYS } from './constants/defaultStepKeys.constant'
import { METHOD_COLOR } from './constants/methodColor.constant'
import { AUTH_TYPE_LABELS } from './constants/authTypeLabels.constant'



// ─── Component ────────────────────────────────────────────────────────────────

export default function NewServer() {
  const navigate = useNavigate()
  const { can, loading: authLoading } = useAuth()
  const { t } = useTranslation(['servers', 'common'])

  // ── Global
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // ── Step: Details (all sources)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // ── REST: Import spec (step 2)
  const [importTab, setImportTab] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [postmanFile, setPostmanFile] = useState<File | null>(null)
  const [fetchedForFile, setFetchedForFile] = useState<File | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const postmanInputRef = useRef<HTMLInputElement>(null)

  // ── REST: Tools overview (step 3)
  const [specMeta, setSpecMeta] = useState<SpecMeta | null>(null)
  const [localTools, setLocalTools] = useState<LocalTool[]>([])
  const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([])
  const [selectedAiProviderId, setSelectedAiProviderId] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // ── GraphQL (step 2)
  const [gqlEndpoint, setGqlEndpoint] = useState('')
  const [gqlFile, setGqlFile] = useState<File | null>(null)
  const [gqlIntrospect, setGqlIntrospect] = useState(true)
  const gqlFileRef = useRef<HTMLInputElement>(null)

  // ── gRPC (step 2)
  const [grpcHost, setGrpcHost] = useState('')
  const [grpcPort, setGrpcPort] = useState('50051')
  const [grpcTls, setGrpcTls] = useState(false)
  const [protoFile, setProtoFile] = useState<File | null>(null)
  const protoFileRef = useRef<HTMLInputElement>(null)

  // ── SQL databases (step 2) — shared for postgresql/mysql/mssql/sqlite
  const [dbHost, setDbHost] = useState('')
  const [dbPort, setDbPort] = useState('')
  const [dbDatabase, setDbDatabase] = useState('')
  const [dbUser, setDbUser] = useState('')
  const [dbPassword, setDbPassword] = useState('')
  const [dbSsl, setDbSsl] = useState(false)

  // ── MongoDB (step 2)
  const [mongoUri, setMongoUri] = useState('')

  // ── Redis (step 2)
  const [redisHost, setRedisHost] = useState('')
  const [redisPort, setRedisPort] = useState('6379')
  const [redisPassword, setRedisPassword] = useState('')
  const [redisTls, setRedisTls] = useState(false)

  // ── DynamoDB (step 2)
  const [dynamoRegion, setDynamoRegion] = useState('us-east-1')
  const [dynamoAccessKey, setDynamoAccessKey] = useState('')
  const [dynamoSecretKey, setDynamoSecretKey] = useState('')
  const [dynamoEndpoint, setDynamoEndpoint] = useState('')

  // ── Elasticsearch (step 2)
  const [esUrl, setEsUrl] = useState('')
  const [esApiKey, setEsApiKey] = useState('')

  // ── Snowflake (step 2)
  const [snowflakeAccount, setSnowflakeAccount] = useState('')
  const [snowflakeWarehouse, setSnowflakeWarehouse] = useState('')
  const [snowflakeSchema, setSnowflakeSchema] = useState('PUBLIC')

  // ── Firestore (step 2)
  const [firestoreProject, setFirestoreProject] = useState('')
  const [firestoreCredentials, setFirestoreCredentials] = useState('')

  // ── Authentication (last step for REST/GraphQL/gRPC)
  const [authType, setAuthType] = useState<AuthType>('none')
  const [showSecrets, setShowSecrets] = useState(false)
  const [token, setToken] = useState('')
  const [keyName, setKeyName] = useState('')
  const [keyValue, setKeyValue] = useState('')
  const [keyIn, setKeyIn] = useState<'header' | 'query'>('header')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [oauthTokenUrl, setOauthTokenUrl] = useState('')
  const [oauthClientId, setOauthClientId] = useState('')
  const [oauthClientSecret, setOauthClientSecret] = useState('')
  const [oauthScope, setOauthScope] = useState('')
  const [customHeaders, setCustomHeaders] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }])

  // ── Computed ───────────────────────────────────────────────────────────────

  const stepKeys = sourceType ? STEP_KEYS[sourceType] : DEFAULT_STEP_KEYS
  const steps = stepKeys.map((k) => t(`servers:label.${k}` as Parameters<typeof t>[0]))
  const isLastStep = activeStep === steps.length - 1
  const activeAiProviders = aiProviders.filter((provider) => provider.isActive)

  const activeFile = importTab === 0 ? file : postmanFile
  const restStep2Valid = importTab === 0
    ? (file ? (baseUrl.trim() === '' || isValidUrl(baseUrl.trim())) : (baseUrl.trim().length > 0 && isValidUrl(baseUrl.trim())))
    : !!postmanFile

  const isSourceAvailable = (nextSourceType: SourceType | null) =>
    nextSourceType !== null && SOURCE_TYPES.some((source) => source.id === nextSourceType && source.available)

  const canNext = (): boolean => {
    if (activeStep === 0) return isSourceAvailable(sourceType)
    if (activeStep === 1) return name.trim().length > 0
    if (sourceType === 'rest') {
      if (activeStep === 2) return restStep2Valid
      return true
    }
    if (sourceType === 'graphql' && activeStep === 2) {
      return gqlIntrospect ? (gqlEndpoint.trim().length > 0 && isValidUrl(gqlEndpoint.trim())) : gqlFile !== null
    }
    if (sourceType === 'grpc' && activeStep === 2) return grpcHost.trim().length > 0
    if (SQL_HOSTS.includes(sourceType!) && activeStep === 2) {
      return dbHost.trim().length > 0 && dbDatabase.trim().length > 0 && dbUser.trim().length > 0
    }
    if (sourceType === 'mongodb' && activeStep === 2) return mongoUri.trim().length > 0
    if (sourceType === 'redis' && activeStep === 2) return redisHost.trim().length > 0
    if (sourceType === 'dynamodb' && activeStep === 2) return dynamoRegion.trim().length > 0 && dynamoAccessKey.trim().length > 0
    if (sourceType === 'elasticsearch' && activeStep === 2) return esUrl.trim().length > 0
    if (sourceType === 'snowflake' && activeStep === 2) return snowflakeAccount.trim().length > 0 && dbDatabase.trim().length > 0 && dbUser.trim().length > 0
    if (sourceType === 'firestore' && activeStep === 2) return firestoreProject.trim().length > 0
    return true
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!can(Permission.AiProvidersView)) return
    api.get<AiProviderOption[]>('/ai-providers')
      .then((r) => {
        setAiProviders(r.data)
        const preferred = r.data.find((provider) => provider.isActive && provider.isDefault) ?? r.data.find((provider) => provider.isActive)
        if (preferred) setSelectedAiProviderId((current) => current || preferred.id)
      })
      .catch(() => setAiProviders([]))
  }, [can])

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags((t) => t.slice(0, -1))
  }

  const selectSource = (nextSourceType: SourceType) => {
    if (!isSourceAvailable(nextSourceType)) return
    setSourceType(nextSourceType)
    if (DB_PORT_DEFAULTS[nextSourceType]) setDbPort(DB_PORT_DEFAULTS[nextSourceType]!)
  }

  const selectSourceAndContinue = (nextSourceType: SourceType) => {
    if (!isSourceAvailable(nextSourceType)) return
    selectSource(nextSourceType)
    setActiveStep(1)
  }

  const clearSpecState = () => { setSpecMeta(null); setLocalTools([]); setFetchedForFile(null) }

  const acceptOpenApiFile = (f: File) => {
    const n = f.name.toLowerCase()
    if (!n.endsWith('.yaml') && !n.endsWith('.yml') && !n.endsWith('.json')) { setError(t('servers:hint.invalidFileOpenApi')); return }
    if (f !== fetchedForFile) clearSpecState()
    setFile(f); setError('')
  }
  const acceptPostmanFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.json')) { setError(t('servers:hint.invalidFilePostman')); return }
    setPostmanFile(f); clearSpecState(); setError('')
  }

  const secretInput = (value: string, onChange: (v: string) => void, label: string) => (
    <TextField size="small" fullWidth label={label} type={showSecrets ? 'text' : 'password'} value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{ endAdornment: (
        <InputAdornment position="end">
          <Tooltip title="Toggle visibility">
            <IconButton size="small" onClick={() => setShowSecrets((s) => !s)} edge="end">
              {showSecrets ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </IconButton>
          </Tooltip>
        </InputAdornment>
      ) }}
    />
  )

  // ── Auto-discover ──────────────────────────────────────────────────────────

  const handleDiscover = async () => {
    if (!isValidUrl(baseUrl.trim())) return
    setDiscovering(true); setError('')
    try {
      const { data } = await api.post<SpecMeta & { tools?: Array<{ name: string; description?: string; method: string; path: string }> }>(
        '/swagger/discover', { baseUrl: baseUrl.trim() }
      )
      if (data.tools?.length) {
        setSpecMeta({ name: data.name, version: data.version, description: data.description, resolvedBaseUrl: data.resolvedBaseUrl ?? baseUrl.trim() })
        setLocalTools(data.tools.map((t) => ({ id: uid(), name: t.name, originalName: t.name, description: t.description, method: t.method, path: t.path, enabled: true, fromSpec: true })))
        setFetchedForFile(null)
      } else {
        setError('No spec found at this URL. Try uploading the file manually.')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('servers:error.noSpecFound'))
    } finally { setDiscovering(false) }
  }

  const handleAiImproveTools = async () => {
    if (!AI_TOOL_IMPROVEMENT_AVAILABLE || !localTools.length || !can(Permission.AiProvidersExecute)) return
    setAiGenerating(true); setError('')
    try {
      const { data } = await api.post<{
        providerId: string
        tools: Array<{ name: string; description?: string; method: string; path: string; outputSchema?: Record<string, unknown> }>
      }>('/ai-providers/generate-tools', {
        providerId: selectedAiProviderId || undefined,
        serverName: specMeta?.name || name,
        baseUrl: specMeta?.resolvedBaseUrl || baseUrl,
        description: specMeta?.description || description,
        tools: localTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          method: tool.method,
          path: tool.path,
        })),
      })
      setSelectedAiProviderId(data.providerId)
      setLocalTools((current) => current.map((tool, index) => {
        const suggestion = data.tools[index]
        if (!suggestion) return tool
        return {
          ...tool,
          name: suggestion.name || tool.name,
          description: suggestion.description ?? tool.description,
          method: suggestion.method || tool.method,
          path: suggestion.path || tool.path,
          outputSchema: suggestion.outputSchema,
        }
      }))
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('servers:error.aiGenerationFailed')
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setAiGenerating(false)
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (sourceType === 'rest' && activeStep === 2) {
      if (importTab === 0 && file && file !== fetchedForFile) {
        setPreviewing(true); setError('')
        try {
          const form = new FormData(); form.append('file', file)
          const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
          const { data } = await api.post<SpecMeta & { tools: Array<{ name: string; description?: string; method: string; path: string }> }>(
            '/swagger/preview', form, { params, headers: { 'Content-Type': 'multipart/form-data' } }
          )
          setSpecMeta({ name: data.name, version: data.version, description: data.description, resolvedBaseUrl: data.resolvedBaseUrl })
          setLocalTools(data.tools.map((t) => ({ id: uid(), name: t.name, originalName: t.name, description: t.description, method: t.method, path: t.path, enabled: true, fromSpec: true })))
          setFetchedForFile(file)
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? t('servers:error.parseError')
          setError(Array.isArray(msg) ? msg.join(', ') : msg); return
        } finally { setPreviewing(false) }
      } else if (importTab === 1 && postmanFile && postmanFile !== fetchedForFile) {
        setPreviewing(true); setError('')
        try {
          const form = new FormData(); form.append('file', postmanFile)
          const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
          const { data } = await api.post<SpecMeta & { tools?: Array<{ name: string; description?: string; method: string; path: string }> }>(
            '/swagger/parse-postman', form, { params, headers: { 'Content-Type': 'multipart/form-data' } }
          )
          setSpecMeta({ name: data.name ?? 'Postman Collection', version: data.version, description: data.description, resolvedBaseUrl: data.resolvedBaseUrl ?? baseUrl.trim() })
          setLocalTools((data.tools ?? []).map((toolItem) => ({ id: uid(), name: toolItem.name, originalName: toolItem.name, description: toolItem.description, method: toolItem.method, path: toolItem.path, enabled: true, fromSpec: true })))
          setFetchedForFile(postmanFile)
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? t('servers:error.postmanParseError')
          setError(Array.isArray(msg) ? msg.join(', ') : msg); return
        } finally { setPreviewing(false) }
      }
    }
    setActiveStep((s) => s + 1)
  }

  // ── Build auth payload ─────────────────────────────────────────────────────

  const buildAuth = () => {
    switch (authType) {
      case 'bearer':        return { type: 'bearer', token }
      case 'api-key':       return { type: 'api-key', name: keyName, value: keyValue, in: keyIn }
      case 'basic':         return { type: 'basic', username: basicUser, password: basicPass }
      case 'oauth2-client': return { type: 'oauth2-client', tokenUrl: oauthTokenUrl, clientId: oauthClientId, clientSecret: oauthClientSecret, scope: oauthScope || undefined }
      case 'custom':        return { type: 'custom', headers: customHeaders.filter((h) => h.name.trim()) }
      default:              return { type: 'none' }
    }
  }

  const applyAiToolImprovements = async (projectId: string) => {
    const improved = localTools.filter((tool) =>
      tool.originalName && (
        tool.name !== tool.originalName ||
        tool.description ||
        tool.outputSchema
      )
    )
    if (!improved.length) return

    await Promise.allSettled(improved.map(async (tool) => {
      const originalName = tool.originalName!
      if (tool.name !== originalName || tool.description) {
        await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(originalName)}`, {
          name: tool.name,
          description: tool.description,
        })
      }
      if (tool.outputSchema) {
        await api.patch(`/swagger/servers/${projectId}/tools/${encodeURIComponent(tool.name)}/output-schema`, {
          outputSchema: tool.outputSchema,
        })
      }
    }))
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setError(''); setCreating(true)
    try {
      let projectId: string

      if (sourceType === 'rest') {
        if (importTab === 1 && postmanFile) {
          const form = new FormData(); form.append('file', postmanFile)
          const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
          const { data } = await api.post<{ _id: string }>('/swagger/import-postman', form, { params, headers: { 'Content-Type': 'multipart/form-data' } })
          projectId = data._id
        } else if (importTab === 0 && file) {
          const form = new FormData(); form.append('file', file)
          const params = baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}
          const { data } = await api.post<{ _id: string }>('/swagger/upload', form, { params, headers: { 'Content-Type': 'multipart/form-data' } })
          projectId = data._id
        } else {
          const { data } = await api.post<{ _id: string }>('/swagger/servers', { name: name.trim(), baseUrl: baseUrl.trim(), description: description.trim() || undefined })
          projectId = data._id
        }
        if (authType !== 'none') await api.patch(`/swagger/servers/${projectId}/auth`, buildAuth())
        await applyAiToolImprovements(projectId)
      } else {
        // Non-REST: create empty server with source-type tag
        const serverBaseUrl =
          sourceType === 'graphql'       ? gqlEndpoint.trim() :
          sourceType === 'grpc'          ? `${grpcHost.trim()}:${grpcPort.trim()}` :
          sourceType === 'mongodb'       ? mongoUri.trim() :
          sourceType === 'redis'         ? `${redisHost.trim()}:${redisPort.trim()}` :
          sourceType === 'dynamodb'      ? `https://dynamodb.${dynamoRegion}.amazonaws.com` :
          sourceType === 'elasticsearch' ? esUrl.trim() :
          sourceType === 'snowflake'     ? `${snowflakeAccount.trim()}.snowflakecomputing.com` :
          sourceType === 'firestore'     ? `https://firestore.googleapis.com/v1/projects/${firestoreProject.trim()}` :
          SQL_HOSTS.includes(sourceType as SourceType) ? `${dbHost.trim()}:${dbPort.trim()}` :
          ''
        const { data } = await api.post<{ _id: string }>('/swagger/servers', {
          name: name.trim(),
          baseUrl: serverBaseUrl,
          description: description.trim() || undefined,
        })
        projectId = data._id
        // Auth (GraphQL / gRPC)
        if ((sourceType === 'graphql' || sourceType === 'grpc') && authType !== 'none') {
          await api.patch(`/swagger/servers/${projectId}/auth`, buildAuth())
        }
      }

      // Tags (always)
      const allTags = [...tags, `source:${sourceType}`]
      await api.patch(`/swagger/servers/${projectId}/tags`, { tags: allTags })

      navigate(`/servers/${projectId}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('servers:error.createError')
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
      setCreating(false)
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!authLoading && !can(Permission.ServersCreate)) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={12}>
        <Typography variant="h6" color="text.secondary">{t('servers:error.accessRestricted')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('servers:error.forbiddenCreate')}</Typography>
      </Box>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box maxWidth={activeStep === 0 ? 860 : 700} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/')} sx={{ mr: 0.5 }}>
          {t('servers:heading.title')}
        </Button>
        <Typography variant="h5" fontWeight={700}>{t('servers:heading.newServer')}</Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, i) => (
          <Step key={label} completed={activeStep > i}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Step 0: Source type ───────────────────────────────────────────── */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:source.chooseSource')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:source.chooseSourceHint')}
          </Typography>
          {(['Other', 'API', 'SQL', 'NoSQL', 'Cloud'] as const).map((group) => {
            const items = SOURCE_TYPES.filter((s) => s.group === group)
            return (
              <Box key={group} mb={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                  {t(`servers:source.group.${group}` as Parameters<typeof t>[0])}
                </Typography>
                <Grid container spacing={1.5}>
                  {items.map((s) => {
                    const selected = sourceType === s.id
                    return (
                      <Grid item xs={12} sm={6} md={4} key={s.id}>
                        <Paper
                          variant="outlined"
                          onClick={() => selectSource(s.id)}
                          onDoubleClick={() => selectSourceAndContinue(s.id)}
                          aria-disabled={!s.available}
                          sx={{
                            p: 2,
                            cursor: s.available ? 'pointer' : 'not-allowed',
                            height: '100%',
                            opacity: s.available ? 1 : 0.58,
                            borderColor: selected ? s.color : undefined,
                            borderWidth: selected ? 2 : 1,
                            bgcolor: selected ? `${s.color}0d` : undefined,
                            transition: 'border-color 0.15s, background-color 0.15s',
                            '&:hover': s.available ? { borderColor: s.color, bgcolor: `${s.color}08` } : undefined,
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{
                              width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
                              bgcolor: `${s.color}18`, border: `1.5px solid ${s.color}35`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.2rem', lineHeight: 1,
                            }}>
                              {s.emoji}
                            </Box>
                            <Box flexGrow={1} minWidth={0}>
                              <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                                <Typography fontWeight={700} fontSize="0.875rem" noWrap>{t(`source.types.${s.id}.name` as Parameters<typeof t>[0])}</Typography>
                                {s.available
                                  ? <Chip label={t('servers:source.available')} size="small" color="success" sx={{ fontSize: '0.6rem', height: 16, fontWeight: 600 }} />
                                  : <Chip label={t('servers:source.soon')} size="small" sx={{ fontSize: '0.6rem', height: 16 }} />
                                }
                              </Box>
                              <Typography variant="caption" color="text.secondary"
                                sx={{ lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {t(`source.types.${s.id}.description` as Parameters<typeof t>[0])}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    )
                  })}
                </Grid>
              </Box>
            )
          })}
        </Box>
      )}

      {/* ── Step 1: Server details (all sources) ─────────────────────────── */}
      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:label.serverDetails')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            A name to identify this server. Everything else can be changed after creation.
          </Typography>
          <Box display="flex" flexDirection="column" gap={2.5}>
            <TextField label={t('servers:label.serverName')} required fullWidth autoFocus
              placeholder="e.g. Stripe Payments, Internal CRM"
              value={name} onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
              helperText={t('servers:hint.serverNameHelper')}
            />
            <TextField label={t('common:label.description')} fullWidth multiline minRows={4} maxRows={10}
              placeholder="What does this server do? What does it connect to?"
              value={description} onChange={(e) => setDescription(e.target.value)}
              helperText={t('servers:hint.descriptionHelper')}
            />
            <TextField size="small" fullWidth label={t('common:label.tags')} placeholder={t('servers:hint.tagsPlaceholder')}
              value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown} onBlur={() => tagInput.trim() && addTag(tagInput)}
              helperText={t('servers:hint.tagsHelper')}
              InputProps={{
                startAdornment: tags.length > 0 ? (
                  <InputAdornment position="start" sx={{ flexWrap: 'wrap', gap: 0.5, py: 0.5, maxWidth: '60%' }}>
                    {tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" icon={<IconTag size={12} />}
                        onDelete={() => setTags((t) => t.filter((x) => x !== tag))}
                        sx={{ height: 20, fontSize: '0.7rem' }} />
                    ))}
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Box>
        </Paper>
      )}

      {/* ── REST Step 2: Import API spec ──────────────────────────────────── */}
      {sourceType === 'rest' && activeStep === 2 && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Tabs value={importTab} onChange={(_, v) => { setImportTab(v); setError('') }}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
              <Tab label={t('servers:newServer.import.openApiSwagger')} icon={<IconCloudUpload size={15} />} iconPosition="start" sx={{ minHeight: 44, fontSize: '0.82rem', gap: 0.5 }} />
              <Tab label={t('servers:newServer.import.postmanCollection')} icon={<IconPackage size={15} />} iconPosition="start" sx={{ minHeight: 44, fontSize: '0.82rem', gap: 0.5 }} />
            </Tabs>

            {importTab === 0 && (
              <Box p={2.5}>
                <Box
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptOpenApiFile(f) }}
                  onClick={() => !file && fileInputRef.current?.click()}
                  sx={{
                    p: 4, textAlign: 'center', cursor: file ? 'default' : 'pointer', borderRadius: 1,
                    border: '2px dashed', borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
                    bgcolor: dragging ? 'primary.light' : file ? 'rgba(73,204,144,0.08)' : 'action.hover',
                    transition: 'all 0.18s', '&:hover': file ? {} : { borderColor: 'primary.light' },
                  }}
                >
                  <input ref={fileInputRef} type="file" accept=".yaml,.yml,.json" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptOpenApiFile(f); e.target.value = '' }} />
                  {file ? (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <IconFile size={36} color="var(--mui-palette-success-main)" />
                      <Typography fontWeight={700} color="success.main">{file.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('servers:hint.toolsAutoGenerated')}</Typography>
                      <Button size="small" startIcon={<IconX size={14} />}
                        onClick={(e) => { e.stopPropagation(); setFile(null); clearSpecState(); setError('') }} sx={{ mt: 0.5 }}>
                        {t('servers:action.removeFile')}
                      </Button>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                      <IconCloudUpload size={40} style={{ opacity: 0.4 }} />
                      <Typography fontWeight={500} mt={0.5}>{t('servers:hint.dragOpenApi')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('servers:hint.clickToBrowse')}</Typography>
                      <Typography variant="caption" color="text.disabled" mt={1} display="block">
                        {t('servers:hint.skipToEmpty')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {importTab === 1 && (
              <Box p={2.5}>
                <Box
                  onClick={() => !postmanFile && postmanInputRef.current?.click()}
                  sx={{
                    p: 4, textAlign: 'center', cursor: postmanFile ? 'default' : 'pointer', borderRadius: 1,
                    border: '2px dashed', borderColor: postmanFile ? 'success.main' : 'divider',
                    bgcolor: postmanFile ? 'rgba(73,204,144,0.08)' : 'action.hover',
                    transition: 'all 0.18s', '&:hover': postmanFile ? {} : { borderColor: 'primary.light' },
                  }}
                >
                  <input ref={postmanInputRef} type="file" accept=".json" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptPostmanFile(f); e.target.value = '' }} />
                  {postmanFile ? (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <IconFile size={36} color="var(--mui-palette-success-main)" />
                      <Typography fontWeight={700} color="success.main">{postmanFile.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('servers:hint.postmanImported')}</Typography>
                      <Button size="small" startIcon={<IconX size={14} />}
                        onClick={(e) => { e.stopPropagation(); setPostmanFile(null); clearSpecState(); setError('') }} sx={{ mt: 0.5 }}>
                        {t('servers:action.removeFile')}
                      </Button>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                      <IconPackage size={40} style={{ opacity: 0.4 }} />
                      <Typography fontWeight={500} mt={0.5}>{t('servers:hint.dragPostman')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('servers:hint.fileTypesPostman')}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
              {importTab === 0 && file ? 'Base URL override' : 'API Base URL'}
              {importTab === 0 && !file && <Typography component="span" color="error.main"> *</Typography>}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              {importTab === 0 && file
                ? t('servers:hint.baseUrlOverrideHint')
                : importTab === 1
                  ? t('servers:hint.baseUrlCollectionHint')
                  : t('servers:hint.baseUrlApiHint')}
            </Typography>
            <Box display="flex" gap={1}>
              <TextField fullWidth size="small" required={importTab === 0 && !file} placeholder="https://api.example.com"
                value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setError('') }}
                error={baseUrl.trim().length > 0 && !isValidUrl(baseUrl.trim())}
                helperText={baseUrl.trim().length > 0 && !isValidUrl(baseUrl.trim()) ? t('servers:hint.invalidUrl') : ''}
              />
              {importTab === 0 && !file && (
                <Tooltip title="Try to auto-discover the OpenAPI spec from this URL">
                  <span>
                    <Button variant="outlined" size="small"
                      startIcon={discovering ? <CircularProgress size={13} color="inherit" /> : <IconSparkles size={15} />}
                      onClick={handleDiscover} disabled={!isValidUrl(baseUrl.trim()) || discovering}
                      sx={{ whiteSpace: 'nowrap', flexShrink: 0, height: 40 }}>
                      {discovering ? t('servers:action.discovering') : t('servers:action.autoDiscover')}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
            {localTools.length > 0 && !activeFile && (
              <Alert severity="success" icon={<IconCircleCheck size={16} />} sx={{ mt: 1.5, py: 0.5, fontSize: '0.82rem' }}
                dangerouslySetInnerHTML={{ __html: t('servers:hint.discovered', { count: localTools.length }) }}
              />
            )}
          </Paper>

          {importTab === 0 && file && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('servers:hint.specNameHint')}
            </Typography>
          )}
        </Box>
      )}

      {/* ── REST Step 3: Tools overview ───────────────────────────────────── */}
      {sourceType === 'rest' && activeStep === 3 && (
        <Box display="flex" flexDirection="column" gap={2}>
          {specMeta ? (
            <>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                  <IconTool size={18} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <Box flexGrow={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle2" fontWeight={700}>{specMeta.name}</Typography>
                      {specMeta.version && <Chip label={`v${specMeta.version}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />}
                      <Chip label={t('servers:label.toolCount', { count: localTools.length })} size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />
                    </Box>
                    {specMeta.description && <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>{specMeta.description}</Typography>}
                  </Box>
                </Box>
              </Paper>
              {can(Permission.AiProvidersExecute) && (
                <Paper variant="outlined" sx={{ p: 2, opacity: AI_TOOL_IMPROVEMENT_AVAILABLE ? 1 : 0.68 }}>
                  <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                    <IconSparkles size={18} style={{ opacity: 0.7 }} />
                    <Box flexGrow={1} minWidth={220}>
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle2" fontWeight={700}>{t('servers:ai.improveTitle')}</Typography>
                        {!AI_TOOL_IMPROVEMENT_AVAILABLE && (
                          <Chip label={t('servers:source.soon')} size="small" sx={{ fontSize: '0.6rem', height: 16 }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">{t('servers:ai.improveHint')}</Typography>
                    </Box>
                    {activeAiProviders.length > 0 ? (
                      <>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                          <InputLabel>{t('servers:ai.provider')}</InputLabel>
                          <Select
                            label={t('servers:ai.provider')}
                            value={selectedAiProviderId}
                            onChange={(e) => setSelectedAiProviderId(e.target.value)}
                            disabled={!AI_TOOL_IMPROVEMENT_AVAILABLE}
                          >
                            {activeAiProviders.map((provider) => (
                              <MenuItem key={provider.id} value={provider.id}>
                                {provider.name} · {provider.model}{provider.isDefault ? ` · ${t('servers:ai.default')}` : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={aiGenerating ? <CircularProgress size={14} color="inherit" /> : <IconSparkles size={15} />}
                          disabled={!AI_TOOL_IMPROVEMENT_AVAILABLE || !selectedAiProviderId || aiGenerating}
                          onClick={handleAiImproveTools}
                        >
                          {aiGenerating ? t('servers:ai.improving') : t('servers:ai.improveAction')}
                        </Button>
                      </>
                    ) : (
                      <Button size="small" variant="outlined" disabled={!AI_TOOL_IMPROVEMENT_AVAILABLE} onClick={() => navigate('/ai-providers/new')}>
                        {t('servers:ai.connectProvider')}
                      </Button>
                    )}
                  </Box>
                </Paper>
              )}
              {localTools.length > 0 && (
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  {localTools.slice(0, 8).map((t, i) => (
                    <Box key={t.id} display="flex" alignItems="center" gap={1.5} px={2} py={1}
                      sx={{ borderBottom: i < Math.min(localTools.length, 8) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Box sx={{ px: 0.75, py: 0.2, borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.65rem', color: METHOD_COLOR[t.method] ?? '#888', bgcolor: 'action.selected', minWidth: 44, textAlign: 'center', flexShrink: 0 }}>
                        {t.method}
                      </Box>
                      <Typography fontSize="0.82rem" fontWeight={600} noWrap flexGrow={1}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace" noWrap flexShrink={0}>{t.path}</Typography>
                    </Box>
                  ))}
                  {localTools.length > 8 && (
                    <Box px={2} py={1} sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('servers:label.moreTools', { count: localTools.length - 8 })}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <IconTool size={40} style={{ opacity: 0.25, marginBottom: 8 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('servers:hint.noSpecImported')}</Typography>
              <Typography variant="body2" color="text.disabled">
                {t('servers:hint.emptyServerHint')}
              </Typography>
            </Paper>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('servers:hint.toolsEditableHint')}
          </Typography>
        </Box>
      )}

      {/* ── GraphQL Step 2: Schema & endpoint ────────────────────────────── */}
      {sourceType === 'graphql' && activeStep === 2 && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.graphql.endpointTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('servers:newServer.graphql.endpointDescription')}
            </Typography>
            <TextField fullWidth size="small" required autoFocus placeholder="https://api.example.com/graphql"
              label={t('servers:newServer.graphql.endpointUrlLabel')} value={gqlEndpoint}
              onChange={(e) => { setGqlEndpoint(e.target.value); setError('') }}
              error={gqlEndpoint.trim().length > 0 && !isValidUrl(gqlEndpoint.trim())}
              helperText={gqlEndpoint.trim().length > 0 && !isValidUrl(gqlEndpoint.trim()) ? t('servers:hint.invalidUrlShort') : ''}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.graphql.schemaSourceTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('servers:newServer.graphql.schemaSourceDescription')}
            </Typography>
            <Box display="flex" gap={1.5} flexWrap="wrap">
              <Paper variant="outlined" onClick={() => setGqlIntrospect(true)}
                sx={{ p: 2, flex: 1, minWidth: 180, cursor: 'pointer', borderColor: gqlIntrospect ? 'primary.main' : undefined, borderWidth: gqlIntrospect ? 2 : 1, bgcolor: gqlIntrospect ? 'primary.50' : undefined, transition: 'all 0.15s' }}>
                <Typography variant="subtitle2" fontWeight={700} fontSize="0.85rem">{t('servers:newServer.graphql.autoIntrospectTitle')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('servers:newServer.graphql.autoIntrospectDescription')}
                </Typography>
              </Paper>
              <Paper variant="outlined" onClick={() => setGqlIntrospect(false)}
                sx={{ p: 2, flex: 1, minWidth: 180, cursor: 'pointer', borderColor: !gqlIntrospect ? 'primary.main' : undefined, borderWidth: !gqlIntrospect ? 2 : 1, bgcolor: !gqlIntrospect ? 'primary.50' : undefined, transition: 'all 0.15s' }}>
                <Typography variant="subtitle2" fontWeight={700} fontSize="0.85rem">{t('servers:newServer.graphql.uploadSdlTitle')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('servers:newServer.graphql.uploadSdlDescription')}
                </Typography>
              </Paper>
            </Box>

            {!gqlIntrospect && (
              <Box mt={2}>
                <input ref={gqlFileRef} type="file" accept=".graphql,.gql,.sdl" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setGqlFile(f); setError('') }; e.target.value = '' }} />
                <Box onClick={() => !gqlFile && gqlFileRef.current?.click()}
                  sx={{ p: 3, textAlign: 'center', cursor: gqlFile ? 'default' : 'pointer', borderRadius: 1, border: '2px dashed', borderColor: gqlFile ? 'success.main' : 'divider', bgcolor: gqlFile ? 'rgba(73,204,144,0.08)' : 'action.hover', '&:hover': gqlFile ? {} : { borderColor: 'primary.light' } }}>
                  {gqlFile ? (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <IconFile size={32} color="var(--mui-palette-success-main)" />
                      <Typography fontWeight={700} color="success.main" fontSize="0.875rem">{gqlFile.name}</Typography>
                      <Button size="small" startIcon={<IconX size={14} />} onClick={(e) => { e.stopPropagation(); setGqlFile(null) }}>{t('common:action.remove')}</Button>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                      <IconCloudUpload size={32} style={{ opacity: 0.4 }} />
                      <Typography fontSize="0.875rem" fontWeight={500}>{t('servers:newServer.graphql.uploadSdlButton')}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('servers:newServer.graphql.sdlFormats')}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('servers:newServer.graphql.operationsHint')}
          </Typography>
        </Box>
      )}

      {/* ── gRPC Step 2: Service config ───────────────────────────────────── */}
      {sourceType === 'grpc' && activeStep === 2 && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.grpc.serviceAddressTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('servers:newServer.grpc.serviceAddressDescription')}
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={9}>
                <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.fields.host')} placeholder="grpc.example.com"
                  value={grpcHost} onChange={(e) => setGrpcHost(e.target.value)} />
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth size="small" label={t('servers:newServer.fields.port')} value={grpcPort} onChange={(e) => setGrpcPort(e.target.value)} />
              </Grid>
            </Grid>
            <FormControlLabel sx={{ mt: 1.5 }}
              control={<Switch size="small" checked={grpcTls} onChange={(e) => setGrpcTls(e.target.checked)} />}
              label={<Typography variant="body2">{t('servers:newServer.fields.useTlsSecure')}</Typography>}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.grpc.protoDefinitionTitle')}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('servers:newServer.grpc.protoDefinitionDescription')}
            </Typography>
            <input ref={protoFileRef} type="file" accept=".proto" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProtoFile(f); setError('') }; e.target.value = '' }} />
            <Box onClick={() => !protoFile && protoFileRef.current?.click()}
              sx={{ p: 3, textAlign: 'center', cursor: protoFile ? 'default' : 'pointer', borderRadius: 1, border: '2px dashed', borderColor: protoFile ? 'success.main' : 'divider', bgcolor: protoFile ? 'rgba(73,204,144,0.08)' : 'action.hover', '&:hover': protoFile ? {} : { borderColor: 'primary.light' } }}>
              {protoFile ? (
                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <IconFile size={32} color="var(--mui-palette-success-main)" />
                  <Typography fontWeight={700} color="success.main" fontSize="0.875rem">{protoFile.name}</Typography>
                  <Button size="small" startIcon={<IconX size={14} />} onClick={(e) => { e.stopPropagation(); setProtoFile(null) }}>{t('common:action.remove')}</Button>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                  <IconCloudUpload size={32} style={{ opacity: 0.4 }} />
                  <Typography fontSize="0.875rem" fontWeight={500}>{t('servers:newServer.grpc.uploadProtoButton')}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('servers:newServer.grpc.uploadProtoOptional')}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── Standard SQL connection (postgresql/mysql/mariadb/mssql/oracle/cockroachdb/clickhouse/cassandra) */}
      {SQL_HOSTS.includes(sourceType as SourceType) && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.database.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Connection details for your {t(`source.types.${sourceType}.name` as Parameters<typeof t>[0])} database.
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Grid container spacing={1.5}>
              <Grid item xs={9}>
                <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.fields.host')} placeholder="db.example.com"
                  value={dbHost} onChange={(e) => setDbHost(e.target.value)} />
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth size="small" label={t('servers:newServer.fields.port')} value={dbPort} onChange={(e) => setDbPort(e.target.value)} />
              </Grid>
            </Grid>
            <TextField fullWidth size="small" required
              label={DB_DATABASE_LABEL[sourceType as SourceType] ?? t('servers:newServer.fields.databaseName')}
              placeholder={DB_DATABASE_PLACEHOLDER[sourceType as SourceType] ?? 'myapp_production'}
              value={dbDatabase} onChange={(e) => setDbDatabase(e.target.value)} />
            <TextField fullWidth size="small" required label={t('servers:newServer.fields.username')}
              value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            {secretInput(dbPassword, setDbPassword, t('servers:newServer.fields.password'))}
            <FormControlLabel
              control={<Switch size="small" checked={dbSsl} onChange={(e) => setDbSsl(e.target.checked)} />}
              label={<Typography variant="body2">{t('servers:newServer.fields.enableSslTls')}</Typography>}
            />
          </Box>
          <Alert severity="warning" sx={{ mt: 2.5, fontSize: '0.78rem' }}>
            {t('servers:hint.readOnlyWarning')}
          </Alert>
        </Paper>
      )}

      {/* ── MongoDB ───────────────────────────────────────────────────────── */}
      {sourceType === 'mongodb' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.mongodb.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.mongodb.connectionDescription')}
          </Typography>
          <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.mongodb.connectionUriLabel')}
            placeholder="mongodb+srv://user:password@cluster.mongodb.net/mydb"
            value={mongoUri} onChange={(e) => setMongoUri(e.target.value)}
            helperText={t('servers:newServer.mongodb.connectionUriFormat')}
          />
          <Alert severity="warning" sx={{ mt: 2.5, fontSize: '0.78rem' }}>
            {t('servers:hint.mongoReadOnlyWarning')}
          </Alert>
        </Paper>
      )}

      {/* ── Redis ─────────────────────────────────────────────────────────── */}
      {sourceType === 'redis' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.redis.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.redis.connectionDescription')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Grid container spacing={1.5}>
              <Grid item xs={9}>
                <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.fields.host')} placeholder="redis.example.com"
                  value={redisHost} onChange={(e) => setRedisHost(e.target.value)} />
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth size="small" label={t('servers:newServer.fields.port')} value={redisPort} onChange={(e) => setRedisPort(e.target.value)} />
              </Grid>
            </Grid>
            {secretInput(redisPassword, setRedisPassword, t('servers:newServer.fields.passwordOptional'))}
            <FormControlLabel
              control={<Switch size="small" checked={redisTls} onChange={(e) => setRedisTls(e.target.checked)} />}
              label={<Typography variant="body2">{t('servers:newServer.fields.enableTls')}</Typography>}
            />
          </Box>
        </Paper>
      )}

      {/* ── DynamoDB ──────────────────────────────────────────────────────── */}
      {sourceType === 'dynamodb' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.dynamodb.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.dynamodb.connectionDescription')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('servers:newServer.dynamodb.awsRegion')}</InputLabel>
              <Select value={dynamoRegion} label={t('servers:newServer.dynamodb.awsRegion')} onChange={(e) => setDynamoRegion(e.target.value)}>
                {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','ap-southeast-1','ap-southeast-2','ap-northeast-1','sa-east-1'].map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {secretInput(dynamoAccessKey, setDynamoAccessKey, t('servers:newServer.dynamodb.accessKeyId'))}
            {secretInput(dynamoSecretKey, setDynamoSecretKey, t('servers:newServer.dynamodb.secretAccessKey'))}
            <TextField fullWidth size="small" label={t('servers:newServer.dynamodb.customEndpointOptional')} placeholder="http://localhost:8000"
              value={dynamoEndpoint} onChange={(e) => setDynamoEndpoint(e.target.value)}
              helperText={t('servers:newServer.dynamodb.customEndpointHint')}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
            {t('servers:hint.dynamoIamHint')}
          </Typography>
        </Paper>
      )}

      {/* ── Elasticsearch ─────────────────────────────────────────────────── */}
      {sourceType === 'elasticsearch' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.elasticsearch.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.elasticsearch.connectionDescription')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.elasticsearch.clusterUrlLabel')}
              placeholder="https://my-cluster.es.io:9200"
              value={esUrl} onChange={(e) => setEsUrl(e.target.value)}
              helperText={t('servers:newServer.elasticsearch.clusterUrlHint')}
            />
            {secretInput(esApiKey, setEsApiKey, t('servers:newServer.elasticsearch.apiKeyRecommended'))}
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              {t('servers:newServer.elasticsearch.orBasicAuth')}
            </Typography>
            <TextField fullWidth size="small" label={t('servers:newServer.fields.usernameOptional')} value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            {secretInput(dbPassword, setDbPassword, t('servers:newServer.fields.passwordOptional'))}
          </Box>
        </Paper>
      )}

      {/* ── Snowflake ─────────────────────────────────────────────────────── */}
      {sourceType === 'snowflake' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.snowflake.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.snowflake.connectionDescription')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.snowflake.accountIdentifier')}
              placeholder="myorg-myaccount"
              value={snowflakeAccount} onChange={(e) => setSnowflakeAccount(e.target.value)}
              helperText={t('servers:newServer.snowflake.accountIdentifierHint')}
            />
            <TextField fullWidth size="small" label={t('servers:newServer.snowflake.warehouse')} placeholder="COMPUTE_WH"
              value={snowflakeWarehouse} onChange={(e) => setSnowflakeWarehouse(e.target.value)} />
            <TextField fullWidth size="small" required label={t('servers:newServer.snowflake.database')} placeholder="MY_DATABASE"
              value={dbDatabase} onChange={(e) => setDbDatabase(e.target.value)} />
            <TextField fullWidth size="small" label={t('servers:newServer.snowflake.schema')} placeholder="PUBLIC"
              value={snowflakeSchema} onChange={(e) => setSnowflakeSchema(e.target.value)} />
            <TextField fullWidth size="small" required label={t('servers:newServer.fields.username')}
              value={dbUser} onChange={(e) => setDbUser(e.target.value)} />
            {secretInput(dbPassword, setDbPassword, t('servers:newServer.fields.password'))}
          </Box>
        </Paper>
      )}

      {/* ── Firestore ─────────────────────────────────────────────────────── */}
      {sourceType === 'firestore' && activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('servers:newServer.firestore.connectionTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('servers:newServer.firestore.connectionDescription')}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField fullWidth size="small" required autoFocus label={t('servers:newServer.firestore.projectId')}
              placeholder="my-firebase-project"
              value={firestoreProject} onChange={(e) => setFirestoreProject(e.target.value)}
            />
            <TextField fullWidth size="small" multiline minRows={4} maxRows={8}
              label={t('servers:newServer.firestore.serviceAccountJson')}
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={firestoreCredentials} onChange={(e) => setFirestoreCredentials(e.target.value)}
              helperText={t('servers:newServer.firestore.serviceAccountHint')}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
            {t('servers:hint.firestoreRoleHint')}
          </Typography>
        </Paper>
      )}

      {/* ── Authentication step (REST step 4, GraphQL/gRPC step 3) ───────── */}
      {((sourceType === 'rest' && activeStep === 4) ||
        (sourceType === 'graphql' && activeStep === 3) ||
        (sourceType === 'grpc' && activeStep === 3)) && (
        <Box display="flex" flexDirection="column" gap={2.5}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <IconKey size={16} style={{ opacity: authType !== 'none' ? 1 : 0.4 }} />
              <Typography variant="subtitle2" fontWeight={700}>
                {sourceType === 'grpc' ? t('servers:auth.grpcAuthentication') : t('servers:auth.apiAuthentication')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {sourceType === 'grpc'
                ? t('servers:auth.grpcCredentialsHint')
                : t('servers:auth.credentialsHint')}
            </Typography>

            <FormControl size="small" fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t('servers:newServer.auth.authenticationType')}</InputLabel>
              <Select value={authType} label={t('servers:newServer.auth.authenticationType')} onChange={(e) => setAuthType(e.target.value as AuthType)}>
                {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
                  <MenuItem key={t} value={t}>{AUTH_TYPE_LABELS[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {authType === 'none' && <Typography variant="body2" color="text.secondary">{t('servers:auth.noCredentials')}</Typography>}

            {authType === 'bearer' && (
              <Box display="flex" flexDirection="column" gap={1.5}>
                {secretInput(token, setToken, t('servers:newServer.auth.bearerToken'))}
                <Typography variant="caption" color="text.secondary">{t('servers:auth.bearerSent')}</Typography>
              </Box>
            )}

            {authType === 'api-key' && (
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={5}><TextField size="small" fullWidth label={t('servers:newServer.auth.headerName')} placeholder="X-Api-Key" value={keyName} onChange={(e) => setKeyName(e.target.value)} /></Grid>
                  <Grid item xs={12} sm={7}>{secretInput(keyValue, setKeyValue, t('servers:newServer.auth.value'))}</Grid>
                </Grid>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('servers:newServer.auth.sendAs')}</InputLabel>
                  <Select value={keyIn} label={t('servers:newServer.auth.sendAs')} onChange={(e) => setKeyIn(e.target.value as 'header' | 'query')}>
                    <MenuItem value="header">{t('servers:newServer.auth.headerHttp')}</MenuItem>
                    <MenuItem value="query">{t('servers:newServer.auth.queryParam', { keyName: keyName || 'key' })}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {authType === 'basic' && (
              <Box display="flex" flexDirection="column" gap={1.5}>
                <TextField size="small" fullWidth label={t('servers:newServer.fields.username')} value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
                {secretInput(basicPass, setBasicPass, t('servers:newServer.fields.password'))}
                <Typography variant="caption" color="text.secondary">{t('servers:auth.basicSent')}</Typography>
              </Box>
            )}

            {authType === 'oauth2-client' && (
              <Box display="flex" flexDirection="column" gap={1.5}>
                <TextField size="small" fullWidth label={t('servers:newServer.auth.tokenUrl')} placeholder="https://auth.example.com/oauth/token" value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}><TextField size="small" fullWidth label={t('servers:newServer.auth.clientId')} value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} /></Grid>
                  <Grid item xs={12} sm={6}>{secretInput(oauthClientSecret, setOauthClientSecret, t('servers:newServer.auth.clientSecret'))}</Grid>
                </Grid>
                <TextField size="small" fullWidth label={t('servers:newServer.auth.scopeOptional')} placeholder="read write" value={oauthScope} onChange={(e) => setOauthScope(e.target.value)} />
                <Typography variant="caption" color="text.secondary">{t('servers:auth.oauthFlow')}</Typography>
              </Box>
            )}

            {authType === 'custom' && (
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="caption" color="text.secondary" mb={0.5}>
                  {t('servers:auth.customHeadersHint')}
                </Typography>
                {customHeaders.map((h, i) => (
                  <Box key={i} display="flex" gap={1} alignItems="center">
                    <TextField size="small" label={t('servers:newServer.auth.header')} placeholder="X-Custom-Header" sx={{ flex: 1 }}
                      value={h.name} onChange={(e) => setCustomHeaders(customHeaders.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                    <TextField size="small" label={t('servers:newServer.auth.value')} sx={{ flex: 2 }} type={showSecrets ? 'text' : 'password'}
                      value={h.value} onChange={(e) => setCustomHeaders(customHeaders.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                      InputProps={{ endAdornment: i === 0 ? (
                        <InputAdornment position="end">
                          <Tooltip title={t('servers:newServer.auth.toggleVisibility')}>
                            <IconButton size="small" onClick={() => setShowSecrets((s) => !s)} edge="end">
                              {showSecrets ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : undefined }}
                    />
                    <Tooltip title={t('common:action.remove')}>
                      <span>
                        <IconButton size="small" color="error" onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== i))} disabled={customHeaders.length === 1}>
                          <IconTrash size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}
                <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />}
                  onClick={() => setCustomHeaders((prev) => [...prev, { name: '', value: '' }])} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                  {t('servers:action.addHeader')}
                </Button>
              </Box>
            )}

            {authType !== 'none' && (
              <Alert severity="warning" sx={{ mt: 2.5, py: 0.5, fontSize: '0.78rem' }}>
                {t('servers:hint.credentialsHint')}
              </Alert>
            )}
          </Paper>

          {(sourceType === 'graphql' || sourceType === 'grpc') && (
            <Alert severity="warning" sx={{ fontSize: '0.82rem' }}>
              {t('servers:auth.comingSoon', { type: sourceType === 'graphql' ? 'GraphQL' : 'gRPC' })}
            </Alert>
          )}

          {sourceType === 'rest' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('servers:hint.mcpKeysHint')}
            </Typography>
          )}
        </Box>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button size="small" startIcon={<IconArrowLeft size={16} />}
          onClick={() => {
            if (activeStep === 0) navigate('/')
            else if (activeStep === 1 && sourceType) { setActiveStep(0) }
            else setActiveStep((s) => s - 1)
          }}
          disabled={creating || previewing}
        >
          {activeStep === 0 ? t('common:action.cancel') : t('common:action.back')}
        </Button>

        {!isLastStep && (
          <Button variant="contained" size="small"
            endIcon={previewing ? undefined : <IconArrowRight size={16} />}
            startIcon={previewing ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={handleNext} disabled={!canNext() || previewing}
          >
            {previewing ? t('servers:action.analyzing') : t('common:action.next')}
          </Button>
        )}

        {isLastStep && (
          <Button variant="contained" size="small"
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <IconPlus size={16} />}
            onClick={handleCreate} disabled={creating}
          >
            {creating ? t('servers:action.creating') : t('servers:action.createServer')}
          </Button>
        )}
      </Box>
    </Box>
  )
}
