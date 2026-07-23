import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Button, CircularProgress, Divider, Typography,
} from '@mui/material'
import { IconPlayerPlay } from '@tabler/icons-react'
import api from '../../../../api'
import type { McpResource } from '../../types'
import { parseMcpResponse } from '../../../../utils/mcpResponse'
import { isHtmlResponse } from './utils/isHtmlResponse.util'
import type { ResourceTestPanelProps } from './resourceTestPanelProps.interface'




export function ResourceTestPanel({ resource, mcpServerIdentifier, anyApiKey }: ResourceTestPanelProps) {
  const { t } = useTranslation(['serverDetail', 'common'])
  const [open, setOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [responseMimeType, setResponseMimeType] = useState<string | undefined>(undefined)
  const [isError, setIsError] = useState(false)
  const showHtmlPreview = response !== null && !isError && isHtmlResponse(response, responseMimeType ?? resource.mimeType)

  const handleExecute = async () => {
    setExecuting(true)
    setResponse(null)
    setResponseMimeType(undefined)
    setIsError(false)
    try {
      const res = await api.post(
        `/mcp/server/${mcpServerIdentifier}`,
        { jsonrpc: '2.0', method: 'resources/read', params: { uri: resource.uri } },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(anyApiKey ? { auth: anyApiKey } : {}) } },
      )
      const rpc = parseMcpResponse(res.data)
      const result = rpc?.result
      const content = result?.contents?.[0]
      const text = content?.text ?? JSON.stringify(result ?? rpc, null, 2)
      setResponse(text)
      setResponseMimeType(content?.mimeType ?? resource.mimeType)
      setIsError(!!rpc?.error)
    } catch (err: any) {
      setResponse(err?.response?.data ? JSON.stringify(err.response.data, null, 2) : String(err))
      setResponseMimeType(undefined)
      setIsError(true)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700} fontSize="0.8rem">{t('serverDetail:heading.tryItOut')}</Typography>
        <Button
          size="small"
          variant="outlined"
          color={open ? 'error' : 'primary'}
          onClick={() => { setOpen((v) => !v); setResponse(null); setResponseMimeType(undefined); setIsError(false) }}
        >
          {open ? t('common:action.cancel') : t('serverDetail:action.try')}
        </Button>
      </Box>
      {open && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            {t('serverDetail:label.noInputsRequired')}
          </Typography>
          <Box>
            <Button
              variant="contained"
              size="small"
              disabled={executing}
              startIcon={executing ? <CircularProgress size={12} color="inherit" /> : <IconPlayerPlay size={14} />}
              onClick={handleExecute}
              sx={{ mt: 1, fontWeight: 600 }}
            >
              {executing ? t('serverDetail:action.executing') : t('serverDetail:action.execute')}
            </Button>
          </Box>
          {showHtmlPreview && (
            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>
                {t('serverDetail:label.htmlPreview')}
              </Typography>
              <Box
                component="iframe"
                title={t('serverDetail:label.htmlPreview')}
                srcDoc={response}
                sandbox=""
                sx={{
                  display: 'block',
                  width: '100%',
                  height: 320,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              />
            </Box>
          )}
          {response !== null && (
            <Box mt={1.5}>
              {showHtmlPreview && (
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>
                  {t('serverDetail:label.rawResponse')}
                </Typography>
              )}
              <Box component="pre" sx={{
                bgcolor: isError ? 'error.light' : '#1e1e1e',
                color: isError ? 'error.dark' : '#d4d4d4',
                p: 2, borderRadius: 1, fontSize: '0.75rem',
                overflowX: 'auto', maxHeight: 300,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                m: 0,
              }}>
                {response}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
