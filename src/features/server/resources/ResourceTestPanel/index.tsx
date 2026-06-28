import { useState } from 'react'
import {
  Box, Button, CircularProgress, Divider, Typography,
} from '@mui/material'
import { IconPlayerPlay } from '@tabler/icons-react'
import api from '../../../../api'
import type { McpResource } from '../../types'

function parseMcpResponse(data: unknown): any {
  if (typeof data === 'object' && data !== null) return data
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) { try { return JSON.parse(match[1]) } catch { /* fall through */ } }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}

export function ResourceTestPanel({ resource, projectId, anyApiKey }: {
  resource: McpResource
  projectId: string
  anyApiKey?: string
}) {
  const [open, setOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleExecute = async () => {
    setExecuting(true)
    setResponse(null)
    setIsError(false)
    try {
      const res = await api.post(
        `/mcp/server/${projectId}`,
        { jsonrpc: '2.0', method: 'resources/read', id: Date.now(), params: { uri: resource.uri } },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(anyApiKey ? { auth: anyApiKey } : {}) } },
      )
      const rpc = parseMcpResponse(res.data)
      const result = rpc?.result
      const text = result?.contents?.[0]?.text ?? JSON.stringify(result ?? rpc, null, 2)
      setResponse(text)
      setIsError(!!rpc?.error)
    } catch (err: any) {
      setResponse(err?.response?.data ? JSON.stringify(err.response.data, null, 2) : String(err))
      setIsError(true)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700} fontSize="0.8rem">Test</Typography>
        <Button
          size="small"
          variant="outlined"
          color={open ? 'error' : 'primary'}
          onClick={() => { setOpen((v) => !v); setResponse(null); setIsError(false) }}
        >
          {open ? 'Cancel' : 'Try'}
        </Button>
      </Box>
      {open && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            No inputs required — the URI is fixed.
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
              {executing ? 'Executing…' : 'Execute'}
            </Button>
          </Box>
          {response !== null && (
            <Box component="pre" sx={{
              bgcolor: isError ? 'error.light' : '#1e1e1e',
              color: isError ? 'error.dark' : '#d4d4d4',
              p: 2, borderRadius: 1, fontSize: '0.75rem',
              overflowX: 'auto', maxHeight: 300,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              m: 0, mt: 1.5,
            }}>
              {response}
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
