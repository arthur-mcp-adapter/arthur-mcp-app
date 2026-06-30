import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, Divider,
  Grid, IconButton, Paper, Stack, Step, StepContent, StepLabel, Stepper, Tooltip, Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BuildIcon from '@mui/icons-material/Build'
import LockIcon from '@mui/icons-material/Lock'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

interface ShareTool {
  name: string
  description?: string
  parameters: ShareToolParameter[]
  outputSchema?: Record<string, unknown>
  comments?: Array<{ text: string; author: string; createdAt: string }>
}

interface ShareToolParameter {
  name: string
  type?: string
  description?: string
  required: boolean
  enum?: unknown[]
}

interface ShareResource {
  id: string
  name: string
  uri: string
  description?: string
  mimeType?: string
  outputSchema?: Record<string, unknown>
}

interface SharePrompt {
  promptId: string
  name?: string
  description?: string
  arguments: string[]
  content?: string
}

interface ShareInfo {
  name: string
  description?: string
  version?: string
  status: string
  mcpUrl: string
  hasKey: boolean
  toolCount: number
  resourceCount: number
  promptCount: number
  tools: ShareTool[]
  resources: ShareResource[]
  prompts: SharePrompt[]
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function isEmptyObject(value?: Record<string, unknown>) {
  return !value || Object.keys(value).length === 0
}

function CopyBox({ value, label }: { value: string; label: string }) {
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

function CodeBlock({ value }: { value: string }) {
  return (
    <Box sx={{ bgcolor: '#111827', borderRadius: 1, px: 1.5, py: 1.25, overflowX: 'auto' }}>
      <Typography component="pre" fontFamily="monospace" fontSize="0.76rem" color="#e5e7eb" m={0} sx={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  )
}

function FieldRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <Typography variant="body2" color="text.secondary">{text}</Typography>
}

function SchemaBlock({ title, schema, emptyText }: { title: string; schema?: Record<string, unknown>; emptyText: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>{title}</Typography>
      {isEmptyObject(schema) ? <EmptyLine text={emptyText} /> : <CodeBlock value={formatJson(schema)} />}
    </Box>
  )
}

function ParameterList({ parameters }: { parameters: ShareToolParameter[] }) {
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

function DocAccordion({ title, subtitle, chips, children }: {
  title: string
  subtitle?: string
  chips?: React.ReactNode
  children: ReactNode
}) {
  return (
    <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} width="100%" pr={1}>
          <Box minWidth={0}>
            <Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{subtitle}</Typography>}
          </Box>
          {chips && <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end" useFlexGap>{chips}</Stack>}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const { t } = useTranslation('servers')
  const [info, setInfo] = useState<ShareInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    axios.get<ShareInfo>(`/api/share/${token}`)
      .then(r => setInfo(r.data))
      .catch(() => setError(t('error.linkExpired')))
      .finally(() => setLoading(false))
  }, [token, t])

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>
  if (error || !info) return <Box p={4}><Alert severity="error">{error || t('error.unknownError')}</Alert></Box>

  const fullUrl = `${window.location.origin}${info.mcpUrl}`

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc" py={6} px={3}>
      <Box maxWidth={1040} mx="auto">
        {/* Header */}
        <Box textAlign="center" mb={5}>
          <BuildIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>{info.name}</Typography>
          {info.description && <Typography color="text.secondary" mb={1.5}>{info.description}</Typography>}
          <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
            <Chip label={t('label.toolsAvailable', { count: info.toolCount })} color="primary" />
            <Chip label={t('share.resourcesAvailable', { count: info.resourceCount })} variant="outlined" />
            <Chip label={t('share.promptsAvailable', { count: info.promptCount })} variant="outlined" />
            {info.hasKey ? <Chip icon={<LockIcon fontSize="small" />} label={t('label.authRequired')} color="warning" /> : <Chip label={t('label.noKeyRequired')} variant="outlined" />}
          </Box>
        </Box>

        {/* MCP Endpoint */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{t('share.title')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            {t('share.urlDescription')}
          </Typography>
          <CopyBox value={fullUrl} label="URL" />
          <Box mt={2} display="flex" justifyContent="center">
            <QRCodeSVG value={fullUrl} size={120} />
          </Box>
          <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
            {t('hint.scanQr')}
          </Typography>
        </Paper>

        {/* MCP Server reference */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{t('share.referenceTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('share.referenceDescription')}
          </Typography>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <FieldRow label={t('share.version')} value={info.version || t('share.notSpecified')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldRow label={t('share.status')} value={<Chip size="small" label={info.status} color={info.status === 'active' ? 'success' : 'default'} />} />
            </Grid>
          </Grid>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('share.toolsTitle', { count: info.tools.length })}</Typography>
              {info.tools.length === 0 ? <EmptyLine text={t('share.noTools')} /> : (
                <Stack spacing={1}>
                  {info.tools.map((tool) => (
                    <DocAccordion
                      key={tool.name}
                      title={tool.name}
                      subtitle={tool.description}
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
                      </Stack>
                    </DocAccordion>
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('share.resourcesTitle', { count: info.resources.length })}</Typography>
              {info.resources.length === 0 ? <EmptyLine text={t('share.noResources')} /> : (
                <Stack spacing={1}>
                  {info.resources.map((resource) => (
                    <DocAccordion
                      key={resource.id}
                      title={resource.name}
                      subtitle={resource.description || resource.uri}
                      chips={
                        <>
                          {resource.mimeType && <Chip size="small" label={resource.mimeType} variant="outlined" />}
                        </>
                      }
                    >
                      <Stack spacing={2}>
                        <FieldRow label={t('share.uri')} value={<Typography component="span" fontFamily="monospace" fontSize="0.82rem">{resource.uri}</Typography>} />
                        <SchemaBlock title={t('share.outputSchema')} schema={resource.outputSchema} emptyText={t('share.noOutputSchema')} />
                      </Stack>
                    </DocAccordion>
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('share.promptsTitle', { count: info.prompts.length })}</Typography>
              {info.prompts.length === 0 ? <EmptyLine text={t('share.noPrompts')} /> : (
                <Stack spacing={1}>
                  {info.prompts.map((prompt) => (
                    <DocAccordion
                      key={prompt.promptId}
                      title={prompt.name || prompt.promptId}
                      subtitle={prompt.description}
                      chips={
                        <>
                          <Chip size="small" label={t('share.argumentsCount', { count: prompt.arguments.length })} variant="outlined" />
                        </>
                      }
                    >
                      <Stack spacing={2}>
                        <FieldRow label={t('share.arguments')} value={prompt.arguments.length ? prompt.arguments.join(', ') : t('share.noArguments')} />
                        {prompt.content && <CodeBlock value={prompt.content} />}
                      </Stack>
                    </DocAccordion>
                  ))}
                </Stack>
              )}
            </Box>

          </Stack>
        </Paper>

        {/* Step-by-step setup */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>{t('share.howToConnect')}</Typography>
          <Stepper orientation="vertical" nonLinear activeStep={-1}>
            {/* Claude Desktop */}
            <Step active>
              <StepLabel><Typography fontWeight={600}>{t('share.claudeDesktop')}</Typography></StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {t('share.claudeDesktopHint')}
                </Typography>
                <CopyBox
                  label="config"
                  value={`"mcpServers": {\n  "${info.name.toLowerCase().replace(/\s+/g, '-')}": {\n    "url": "${fullUrl}"${info.hasKey ? ',\n    "headers": { "auth": "<your-api-key>" }' : ''}\n  }\n}`}
                />
                <Typography variant="caption" color="text.disabled" mt={1} display="block">{t('share.claudeDesktopRestart')}</Typography>
              </StepContent>
            </Step>

            {/* Cursor */}
            <Step active>
              <StepLabel><Typography fontWeight={600}>{t('share.cursor')}</Typography></StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {t('share.cursorHint')}
                </Typography>
                <CopyBox value={fullUrl} label="URL" />
                {info.hasKey && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {t('share.cursorAuthHint')}
                  </Typography>
                )}
              </StepContent>
            </Step>

            {/* Generic */}
            <Step active>
              <StepLabel><Typography fontWeight={600}>{t('share.anyClient')}</Typography></StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {t('share.anyClientHint')}
                  {info.hasKey && t('share.anyClientAuthHint')}
                </Typography>
              </StepContent>
            </Step>
          </Stepper>

          {info.hasKey && (
            <>
              <Divider sx={{ my: 2 }} />
              <Alert severity="info" icon={<LockIcon fontSize="small" />}>
                {t('share.requiresKey')}
              </Alert>
            </>
          )}
        </Paper>

        <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={3}>
          {t('share.poweredBy')}
        </Typography>
      </Box>
    </Box>
  )
}
