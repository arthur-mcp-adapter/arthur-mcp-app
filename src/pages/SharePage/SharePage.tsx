import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, CssBaseline,
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { baselightTheme } from '../../theme'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BuildIcon from '@mui/icons-material/Build'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import { apiUrl, backendUrl } from '../../config/urls'
import { parseMcpResponse, formatMcpResult } from '../../utils/mcpResponse'
import { normalizeMcpUrl, oauthTokenUrl, absoluteUrl } from '../../utils/mcpUrl'
import { shellSingleQuote, buildCurlCommand } from '../../utils/curl'
import { formatJson, isEmptyObject } from '../../utils/format'
import { coerceParameterValue } from '../../utils/mcpParameters'
import type { ShareTool } from './shareTool.interface'
import type { ShareToolParameter } from './shareToolParameter.interface'
import type { ShareResource } from './shareResource.interface'
import type { SharePrompt } from './sharePrompt.interface'
import type { ShareInfo } from './shareInfo.interface'
import type { AuthMode } from './authMode.type'
import type { OperationTone } from './operationTone.type'
import type { CopyBoxProps } from './copyBoxProps.interface'
import type { EndpointBoxProps } from './endpointBoxProps.interface'
import type { CodeBlockProps } from './codeBlockProps.interface'
import type { CopyableCodeBlockProps } from './copyableCodeBlockProps.interface'
import type { FieldRowProps } from './fieldRowProps.interface'
import type { EmptyLineProps } from './emptyLineProps.interface'
import type { SchemaBlockProps } from './schemaBlockProps.interface'
import type { SimulatorPanelProps } from './simulatorPanelProps.interface'
import type { ParameterListProps } from './parameterListProps.interface'
import type { DocAccordionProps } from './docAccordionProps.interface'
import type { SwaggerTagSectionProps } from './swaggerTagSectionProps.interface'
import type { AuthorizeDialogProps } from './authorizeDialogProps.interface'
import { operationStyles } from './constants/operationStyles.constant'





function CopyBox({ value, label }: CopyBoxProps) {
  const { t } = useTranslation('servers')
  const [copied, setCopied] = useState(false)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#1e1e1e', borderRadius: 1, px: 1.5, py: 1 }}>
      <Typography fontFamily="monospace" fontSize="0.82rem" color="#e5e7eb" flexGrow={1} sx={{ wordBreak: 'break-all' }}>{value}</Typography>
      <Tooltip title={copied ? t('docs.copied') : t('share.copyLabel', { label })}>
        <IconButton size="small" sx={{ color: '#9ca3af' }} onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
          {copied ? <CheckCircleIcon fontSize="small" sx={{ color: '#4ade80' }} /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function EndpointBox({ value, label }: EndpointBoxProps) {
  const { t } = useTranslation('servers')
  const [copied, setCopied] = useState(false)

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'stretch',
      border: '1px solid',
      borderColor: '#49cc90',
      borderRadius: 1,
      overflow: 'hidden',
      bgcolor: '#ecfaf4',
    }}>
      <Box sx={{
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#49cc90',
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: 800,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}>
        MCP
      </Box>
      <Typography fontFamily="monospace" fontSize="0.86rem" flexGrow={1} sx={{ px: 1.5, py: 1.1, wordBreak: 'break-all' }}>
        {value}
      </Typography>
      <Tooltip title={copied ? t('docs.copied') : t('share.copyLabel', { label })}>
        <IconButton
          size="small"
          sx={{ borderRadius: 0, px: 1.5 }}
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        >
          {copied ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function CodeBlock({ value }: CodeBlockProps) {
  return (
    <Box sx={{ bgcolor: '#111827', borderRadius: 1, px: 1.5, py: 1.25, overflowX: 'auto' }}>
      <Typography component="pre" fontFamily="monospace" fontSize="0.76rem" color="#e5e7eb" m={0} sx={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  )
}

function CopyableCodeBlock({ value, label }: CopyableCodeBlockProps) {
  const { t } = useTranslation('servers')
  const [copied, setCopied] = useState(false)

  return (
    <Box sx={{ position: 'relative' }}>
      <CodeBlock value={value} />
      <Tooltip title={copied ? t('docs.copied') : t('share.copyLabel', { label })}>
        <IconButton
          size="small"
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          sx={{ position: 'absolute', top: 8, right: 8, color: copied ? '#4ade80' : '#9ca3af', '&:hover': { color: '#fff' } }}
        >
          {copied ? <CheckCircleIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function FieldRow({ label, value }: FieldRowProps) {
  if (value === undefined || value === null || value === '') return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  )
}

function EmptyLine({ text }: EmptyLineProps) {
  return <Typography variant="body2" color="text.secondary">{text}</Typography>
}

function SchemaBlock({ title, schema, emptyText }: SchemaBlockProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{title}</Typography>
      {isEmptyObject(schema) ? <EmptyLine text={emptyText} /> : <CodeBlock value={formatJson(schema)} />}
    </Box>
  )
}

function SimulatorPanel({
  authKey,
  authMode,
  authRequired,
  buildPayload,
  fields = [],
  mcpUrl,
}: SimulatorPanelProps) {
  const { t } = useTranslation('servers')
  const [tryMode, setTryMode] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState('')
  const [responseIsError, setResponseIsError] = useState(false)

  const payload = buildPayload(values)
  const curlCommand = buildCurlCommand({ authKey, authMode, mcpUrl, payload })

  const handleExecute = async () => {
    if (authRequired && !authKey.trim()) {
      setResponse(t('share.authRequiredToTest'))
      setResponseIsError(true)
      return
    }

    setExecuting(true)
    setResponse('')
    setResponseIsError(false)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (authKey.trim()) {
        if (authMode === 'oauthClientCredentials') headers.Authorization = `Bearer ${authKey.trim().replace(/^Bearer\s+/i, '')}`
        else headers.auth = authKey.trim()
      }
      const { data } = await axios.post(backendUrl(normalizeMcpUrl(mcpUrl)), payload, { headers })
      const result = formatMcpResult(data)
      setResponse(result.text)
      setResponseIsError(result.isError)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setResponse(err.response?.data?.message ?? err.message)
      } else {
        setResponse(err instanceof Error ? err.message : t('error.unknownError'))
      }
      setResponseIsError(true)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5} mb={tryMode ? 2 : 0}>
        <Typography variant="subtitle2" fontWeight={700}>{t('share.simulatorTitle')}</Typography>
        <Button
          size="small"
          variant={tryMode ? 'outlined' : 'contained'}
          color={tryMode ? 'error' : 'primary'}
          onClick={() => { setTryMode((value) => !value); setResponse('') }}
          sx={{ fontWeight: 700, fontSize: '0.72rem', minWidth: 96 }}
        >
          {tryMode ? t('docs.cancel') : t('docs.tryItOut')}
        </Button>
      </Box>

      {tryMode && (
        <Stack spacing={2}>
          {fields.length > 0 ? (
            <Stack spacing={1.25}>
              {fields.map((field) => (
                <TextField
                  key={field.name}
                  size="small"
                  fullWidth
                  label={field.required ? `${field.name} *` : field.name}
                  helperText={field.description || (field.enum?.length ? t('share.acceptedValues', { values: field.enum.join(', ') }) : undefined)}
                  placeholder={field.type === 'object' ? '{"key":"value"}' : field.type === 'array' ? '["value"]' : field.type ? `<${field.type}>` : '<string>'}
                  value={values[field.name] ?? ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  multiline={field.type === 'object' || field.type === 'array'}
                  minRows={field.type === 'object' || field.type === 'array' ? 3 : undefined}
                  InputProps={field.type === 'object' || field.type === 'array' ? { sx: { fontFamily: 'monospace', fontSize: '0.82rem' } } : undefined}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">{t('share.noSimulatorInputs')}</Typography>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{t('share.requestPayload')}</Typography>
            <CodeBlock value={formatJson(payload)} />
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{t('share.curlCommand')}</Typography>
            <CopyableCodeBlock value={curlCommand} label="curl" />
          </Box>

          <Button
            variant="contained"
            size="small"
            disabled={executing}
            startIcon={executing ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={handleExecute}
            sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
          >
            {executing ? t('docs.executing') : t('docs.execute')}
          </Button>

          {response && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{t('share.responsePayload')}</Typography>
              <Box component="pre" sx={{
                bgcolor: responseIsError ? 'error.light' : '#1e1e1e',
                color: responseIsError ? 'error.dark' : '#d4d4d4',
                border: '1px solid',
                borderColor: responseIsError ? 'error.light' : 'transparent',
                p: 2,
                borderRadius: 1,
                fontSize: '0.78rem',
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 420,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                m: 0,
              }}>
                {response}
              </Box>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  )
}

function ParameterList({ parameters }: ParameterListProps) {
  const { t } = useTranslation('servers')

  if (parameters.length === 0) return <EmptyLine text={t('share.noParameters')} />

  return (
    <Stack spacing={1}>
      {parameters.map((parameter) => (
        <Box key={parameter.name} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography fontFamily="monospace" fontSize="0.84rem" fontWeight={700}>{parameter.name}</Typography>
            {parameter.type && <Chip size="small" label={parameter.type} variant="outlined" />}
            <Chip size="small" label={parameter.required ? t('share.required') : t('share.optional')} color={parameter.required ? 'warning' : 'default'} variant="outlined" />
          </Stack>
          {parameter.description && (
            <Typography variant="body2" color="text.secondary" mt={0.75}>{parameter.description}</Typography>
          )}
          {parameter.enum && parameter.enum.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
              {t('share.acceptedValues', { values: parameter.enum.join(', ') })}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  )
}

function DocAccordion({ title, subtitle, chips, tone = 'tool', children }: DocAccordionProps) {
  const styles = operationStyles[tone]

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{
        borderRadius: 1,
        borderColor: styles.color,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '& + &': { mt: 1 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: styles.bg, minHeight: 54 }}>
        <Box display="flex" alignItems="center" gap={1.5} width="100%" pr={1} minWidth={0}>
          <Box sx={{
            width: 92,
            height: 28,
            borderRadius: 0.75,
            bgcolor: styles.color,
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.68rem',
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {styles.label}
          </Box>
          <Box minWidth={0} flexGrow={1}>
            <Typography fontFamily="monospace" fontWeight={700} fontSize="0.9rem" sx={{ wordBreak: 'break-word' }}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{subtitle}</Typography>}
          </Box>
          {chips && <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end" useFlexGap>{chips}</Stack>}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2, borderTop: '1px solid', borderColor: styles.color }}>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

function SwaggerTagSection({ title, children }: SwaggerTagSectionProps) {
  return (
    <Box>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 1.25, pb: 0.75 }}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.15rem' }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  )
}

function AuthorizeDialog({
  authKey,
  authMode,
  hasApiKey,
  hasOAuthClient,
  mcpUrl,
  onAuthorize,
  onClear,
  onClose,
  onModeChange,
  open,
}: AuthorizeDialogProps) {
  const { t } = useTranslation('servers')
  const [draft, setDraft] = useState(authKey)
  const [draftMode, setDraftMode] = useState<AuthMode>(authMode)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authorizing, setAuthorizing] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(authKey)
      setDraftMode(hasApiKey ? authMode : 'oauthClientCredentials')
      setAuthError('')
    }
  }, [authKey, authMode, hasApiKey, open])

  const handleAuthorize = async () => {
    setAuthError('')
    if (draftMode === 'apiKey') {
      onModeChange(draftMode)
      onAuthorize(draft, draftMode)
      onClose()
      return
    }

    setAuthorizing(true)
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId.trim(),
        client_secret: clientSecret,
      })
      const { data } = await axios.post<{ access_token?: string }>(backendUrl(oauthTokenUrl(mcpUrl)), body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!data.access_token) throw new Error(t('share.oauthTokenMissing'))
      onModeChange(draftMode)
      onAuthorize(data.access_token, draftMode)
      onClose()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setAuthError(err.response?.data?.error ?? err.response?.data?.message ?? err.message)
      } else {
        setAuthError(err instanceof Error ? err.message : t('error.unknownError'))
      }
    } finally {
      setAuthorizing(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('share.authorizeTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" icon={<LockIcon fontSize="small" />}>
            {t('share.authorizeDescription')}
          </Alert>
          {hasApiKey && hasOAuthClient && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant={draftMode === 'apiKey' ? 'contained' : 'outlined'}
                onClick={() => setDraftMode('apiKey')}
                sx={{ justifyContent: 'flex-start', fontWeight: 700 }}
              >
                {t('share.apiKeyScheme')}
              </Button>
              <Button
                variant={draftMode === 'oauthClientCredentials' ? 'contained' : 'outlined'}
                onClick={() => setDraftMode('oauthClientCredentials')}
                sx={{ justifyContent: 'flex-start', fontWeight: 700 }}
              >
                {t('share.oauthClientCredentialsScheme')}
              </Button>
            </Stack>
          )}
          {draftMode === 'apiKey' ? (
            <TextField
              autoFocus
              size="small"
              fullWidth
              type="password"
              label={t('share.apiKeyLabel')}
              helperText={t('share.apiKeyHelper')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <Stack spacing={1.5}>
              <TextField
                autoFocus
                size="small"
                fullWidth
                label={t('share.oauthClientIdLabel')}
                //helperText={t('share.oauthClientCredentialsHelper')}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                type="password"
                label={t('share.oauthClientSecretLabel')}
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
              />
            </Stack>
          )}
          {authError && <Alert severity="error">{authError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button color="error" onClick={() => { onClear(); setDraft('') }}>{t('share.logout')}</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>{t('docs.cancel')}</Button>
          <Button
            variant="contained"
            disabled={authorizing || (draftMode === 'apiKey' ? !draft.trim() : !clientId.trim() || !clientSecret.trim())}
            startIcon={authorizing ? <CircularProgress size={14} color="inherit" /> : undefined}
            onClick={handleAuthorize}
          >
            {authorizing ? t('share.authorizing') : t('share.authorize')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}

export default function SharePage() {
  const { slug, token } = useParams<{ slug?: string; token?: string }>()
  const { t } = useTranslation('servers')
  const [info, setInfo] = useState<ShareInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [authKey, setAuthKey] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('apiKey')
  const [authorizeOpen, setAuthorizeOpen] = useState(false)

  useEffect(() => {
    const url = token ? apiUrl(`/share/${token}`) : slug ? apiUrl(`/share/by-slug/${slug}`) : null
    if (!url) return
    axios.get<ShareInfo>(url)
      .then(r => setInfo(r.data))
      .catch(() => setError(t('error.linkExpired')))
      .finally(() => setLoading(false))
  }, [slug, token, t])

  if (loading) return (
    <ThemeProvider theme={baselightTheme}>
      <CssBaseline />
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>
    </ThemeProvider>
  )
  if (error || !info) return (
    <ThemeProvider theme={baselightTheme}>
      <CssBaseline />
      <Box p={4}><Alert severity="error">{error || t('error.unknownError')}</Alert></Box>
    </ThemeProvider>
  )

  const fullUrl = backendUrl(info.mcpUrl)
  const canAuthorize = info.hasKey || !!info.hasOAuthClient
  const isAuthorized = authKey.trim().length > 0

  return (
    <ThemeProvider theme={baselightTheme}>
    <CssBaseline />
    <Box minHeight="100vh" bgcolor="#ffffff">
      <Box sx={{ bgcolor: '#61affe', color: '#fff', px: { xs: 2, md: 3 }, py: 1.25 }}>
        <Box maxWidth={1180} mx="auto" display="flex" alignItems="center" gap={1.25}>
          <BuildIcon fontSize="small" sx={{ color: '#fff' }} />
          <Typography fontWeight={800} letterSpacing={0.2}>Arthur MCP</Typography>
          <Typography color="#fff" fontSize="0.82rem">{t('share.referenceTitle')}</Typography>
        </Box>
      </Box>

      <Box maxWidth={1180} mx="auto" px={{ xs: 2, md: 3 }} py={{ xs: 2.5, md: 4 }}>
        <Box mb={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }}>
            <Box minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={1}>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.7rem', md: '2.25rem' }, wordBreak: 'break-word' }}>
                  {info.name}
                </Typography>
                <Chip size="small" label={info.version || t('share.notSpecified')} variant="outlined" />
                <Chip size="small" label={info.status} color={info.status === 'active' ? 'success' : 'default'} />
              </Stack>
              {info.description && <Typography color="text.secondary" maxWidth={760}>{info.description}</Typography>}
            </Box>
            <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Chip size="small" label={t('label.toolsAvailable', { count: info.toolCount })} sx={{ bgcolor: '#61affe', color: '#fff', fontWeight: 700 }} />
              <Chip size="small" label={t('share.resourcesAvailable', { count: info.resourceCount })} sx={{ bgcolor: '#49cc90', color: '#fff', fontWeight: 700 }} />
              <Chip size="small" label={t('share.promptsAvailable', { count: info.promptCount })} sx={{ bgcolor: '#fca130', color: '#fff', fontWeight: 700 }} />
              {info.hasKey ? <Chip size="small" icon={<LockIcon fontSize="small" />} label={t('label.authRequired')} color="warning" /> : <Chip size="small" label={t('label.noKeyRequired')} variant="outlined" />}
              {info.hasOAuthClient ? <Chip size="small" icon={<LockIcon fontSize="small" />} label={t('share.oauthClientAvailable')} color="warning" /> : <Chip size="small" label={t('share.noOauthClientAvailable')} variant="outlined" />}
            </Stack>
          </Stack>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 2, md: 2.5 }, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box flexGrow={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} mb={0.75}>{t('share.title')}</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.25}>{t('share.urlDescription')}</Typography>
              <EndpointBox value={fullUrl} label="URL" />
            </Box>
            <Box textAlign="center" sx={{ flexShrink: 0 }}>
              <QRCodeSVG value={fullUrl} size={118} />
              <Typography variant="caption" color="text.disabled" display="block" mt={0.75}>
                {t('hint.scanQr')}
              </Typography>
            </Box>
          </Stack>
          {info.hasKey && (
            <Alert severity="info" icon={<LockIcon fontSize="small" />} sx={{ mt: 2 }}>
              {t('share.requiresKey')}
            </Alert>
          )}
        </Paper>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="body2" color="text.secondary" maxWidth={780}>
            {t('share.referenceDescription')}
          </Typography>
          {canAuthorize && (
            <Button
              variant={isAuthorized ? 'contained' : 'outlined'}
              color={isAuthorized ? 'success' : 'inherit'}
              size="small"
              startIcon={isAuthorized ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
              onClick={() => setAuthorizeOpen(true)}
              sx={{
                borderColor: isAuthorized ? undefined : '#49cc90',
                color: isAuthorized ? undefined : '#49cc90',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {isAuthorized ? t('share.authorized') : t('share.authorize')}
            </Button>
          )}
        </Stack>

        <Stack spacing={3}>

          <SwaggerTagSection title={t('share.mcpProtocolTitle')}>
            <Typography variant="body2" color="text.secondary" mb={1.5}>{t('share.mcpProtocolDescription')}</Typography>
            <Stack spacing={1}>
              <DocAccordion title={t('share.mcpInitialize')} subtitle={t('share.mcpInitializeDesc')} tone="general">
                <SimulatorPanel
                  authKey={authKey}
                  authMode={authMode}
                  authRequired={info.hasKey}
                  mcpUrl={info.mcpUrl}
                  buildPayload={() => ({
                    jsonrpc: '2.0',
                    method: 'initialize',
                    id: Date.now(),
                    params: {
                      protocolVersion: '2024-11-05',
                      clientInfo: { name: 'Arthur Share', version: '1.0' },
                      capabilities: {},
                    },
                  })}
                />
              </DocAccordion>

              <DocAccordion title={t('share.mcpToolsList')} subtitle={t('share.mcpToolsListDesc')} tone="general">
                <SimulatorPanel
                  authKey={authKey}
                  authMode={authMode}
                  authRequired={info.hasKey}
                  mcpUrl={info.mcpUrl}
                  buildPayload={() => ({ jsonrpc: '2.0', method: 'tools/list', id: Date.now(), params: {} })}
                />
              </DocAccordion>

              <DocAccordion title={t('share.mcpResourcesList')} subtitle={t('share.mcpResourcesListDesc')} tone="general">
                <SimulatorPanel
                  authKey={authKey}
                  authMode={authMode}
                  authRequired={info.hasKey}
                  mcpUrl={info.mcpUrl}
                  buildPayload={() => ({ jsonrpc: '2.0', method: 'resources/list', id: Date.now(), params: {} })}
                />
              </DocAccordion>

              <DocAccordion title={t('share.mcpPromptsList')} subtitle={t('share.mcpPromptsListDesc')} tone="general">
                <SimulatorPanel
                  authKey={authKey}
                  authMode={authMode}
                  authRequired={info.hasKey}
                  mcpUrl={info.mcpUrl}
                  buildPayload={() => ({ jsonrpc: '2.0', method: 'prompts/list', id: Date.now(), params: {} })}
                />
              </DocAccordion>
            </Stack>
          </SwaggerTagSection>

          <SwaggerTagSection title={t('share.toolsTitle', { count: info.tools.length })}>
            {info.tools.length === 0 ? <EmptyLine text={t('share.noTools')} /> : (
              <Stack spacing={1}>
                {info.tools.map((tool) => (
                  <DocAccordion
                    key={tool.name}
                    title={tool.name}
                    subtitle={tool.description}
                    tone="tool"
                  >
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{t('share.parameters')}</Typography>
                        <ParameterList parameters={tool.parameters ?? []} />
                      </Box>
                      <SchemaBlock title={t('share.outputSchema')} schema={tool.outputSchema} emptyText={t('share.noOutputSchema')} />
                      {tool.comments && tool.comments.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{t('share.comments')}</Typography>
                          <Stack spacing={0.75}>
                            {tool.comments.map((comment, index) => (
                              <Typography key={`${comment.createdAt}-${index}`} variant="body2">{comment.text}</Typography>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      <SimulatorPanel
                        authKey={authKey}
                        authMode={authMode}
                        authRequired={info.hasKey}
                        fields={tool.parameters ?? []}
                        mcpUrl={info.mcpUrl}
                        buildPayload={(values) => {
                          const args: Record<string, unknown> = {}
                          for (const parameter of tool.parameters ?? []) {
                            const value = coerceParameterValue(values[parameter.name] ?? '', parameter)
                            if (value !== undefined) args[parameter.name] = value
                          }
                          return {
                            jsonrpc: '2.0',
                            method: 'tools/call',
                            id: Date.now(),
                            params: { name: tool.name, arguments: args },
                          }
                        }}
                      />
                    </Stack>
                  </DocAccordion>
                ))}
              </Stack>
            )}
          </SwaggerTagSection>

          <SwaggerTagSection title={t('share.resourcesTitle', { count: info.resources.length })}>
            {info.resources.length === 0 ? <EmptyLine text={t('share.noResources')} /> : (
              <Stack spacing={1}>
                {info.resources.map((resource) => (
                  <DocAccordion
                    key={resource.id}
                    title={resource.name}
                    subtitle={resource.description || resource.uri}
                    tone="resource"
                    chips={
                      <>
                        {resource.mimeType && <Chip size="small" label={resource.mimeType} variant="outlined" />}
                      </>
                    }
                  >
                    <Stack spacing={2}>
                      <FieldRow label={t('share.uri')} value={<Typography component="span" fontFamily="monospace" fontSize="0.82rem">{resource.uri}</Typography>} />
                      <SchemaBlock title={t('share.outputSchema')} schema={resource.outputSchema} emptyText={t('share.noOutputSchema')} />
                      <SimulatorPanel
                        authKey={authKey}
                        authMode={authMode}
                        authRequired={info.hasKey}
                        mcpUrl={info.mcpUrl}
                        buildPayload={() => ({
                          jsonrpc: '2.0',
                          method: 'resources/read',
                          id: Date.now(),
                          params: { uri: resource.uri },
                        })}
                      />
                    </Stack>
                  </DocAccordion>
                ))}
              </Stack>
            )}
          </SwaggerTagSection>

          <SwaggerTagSection title={t('share.promptsTitle', { count: info.prompts.length })}>
            {info.prompts.length === 0 ? <EmptyLine text={t('share.noPrompts')} /> : (
              <Stack spacing={1}>
                {info.prompts.map((prompt) => (
                  <DocAccordion
                    key={prompt.promptId}
                    title={prompt.name || prompt.promptId}
                    subtitle={prompt.description}
                    tone="prompt"
                    chips={
                      <>
                        <Chip size="small" label={t('share.argumentsCount', { count: prompt.arguments.length })} variant="outlined" />
                      </>
                    }
                  >
                    <Stack spacing={2}>
                      <FieldRow label={t('share.arguments')} value={prompt.arguments.length ? prompt.arguments.join(', ') : t('share.noArguments')} />
                      {prompt.content && <CodeBlock value={prompt.content} />}
                      <SimulatorPanel
                        authKey={authKey}
                        authMode={authMode}
                        authRequired={info.hasKey}
                        fields={prompt.arguments.map((argument) => ({ name: argument, type: 'string', required: false }))}
                        mcpUrl={info.mcpUrl}
                        buildPayload={(values) => ({
                          jsonrpc: '2.0',
                          method: 'prompts/get',
                          id: Date.now(),
                          params: { name: prompt.name || prompt.promptId, arguments: values },
                        })}
                      />
                    </Stack>
                  </DocAccordion>
                ))}
              </Stack>
            )}
          </SwaggerTagSection>

          
        </Stack>

        <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={3}>
          {t('share.poweredBy')}
        </Typography>
      </Box>
      <AuthorizeDialog
        authKey={authKey}
        authMode={authMode}
        hasApiKey={info.hasKey}
        hasOAuthClient={!!info.hasOAuthClient}
        mcpUrl={info.mcpUrl}
        open={authorizeOpen}
        onAuthorize={(value, mode) => { setAuthKey(value); setAuthMode(mode) }}
        onClear={() => setAuthKey('')}
        onClose={() => setAuthorizeOpen(false)}
        onModeChange={setAuthMode}
      />
    </Box>
    </ThemeProvider>
  )
}
