import { useState } from 'react'
import {
  Box, Button, CircularProgress, Divider, TextField, Typography,
} from '@mui/material'
import { IconPlayerPlay } from '@tabler/icons-react'
import api from '../../../api'
import type { GlobalPrompt } from '../types'

function parseMcpResponse(data: unknown): any {
  if (typeof data === 'object' && data !== null) return data
  if (typeof data === 'string') {
    const match = data.match(/^data:\s*(.+)$/m)
    if (match) { try { return JSON.parse(match[1]) } catch { /* fall through */ } }
    try { return JSON.parse(data) } catch { /* fall through */ }
  }
  return {}
}

export function PromptTestPanel({ prompt, projectId, anyApiKey }: {
  prompt: GlobalPrompt
  projectId: string
  anyApiKey?: string
}) {
  const argNames = [...new Set([...prompt.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
  const [open, setOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleExecute = async () => {
    setExecuting(true)
    setResponse(null)
    setIsError(false)
    try {
      const res = await api.post(
        `/mcp/server/${projectId}`,
        { jsonrpc: '2.0', method: 'prompts/get', id: Date.now(), params: { name: prompt.name, arguments: formValues } },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(anyApiKey ? { auth: anyApiKey } : {}) } },
      )
      const rpc = parseMcpResponse(res.data)
      const result = rpc?.result
      const text = result?.messages?.[0]?.content?.text ?? JSON.stringify(result ?? rpc, null, 2)
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
          onClick={() => { setOpen((v) => !v); setResponse(null); setIsError(false); setFormValues({}) }}
        >
          {open ? 'Cancel' : 'Try'}
        </Button>
      </Box>
      {open && (
        <Box mt={1}>
          {argNames.length > 0 ? (
            <Box display="flex" flexDirection="column" gap={1} mb={1.5}>
              {argNames.map((arg) => (
                <TextField
                  key={arg}
                  size="small"
                  fullWidth
                  label={arg}
                  placeholder="<string>"
                  value={formValues[arg] ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [arg]: e.target.value }))}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              This prompt has no variables.
            </Typography>
          )}
          <Button
            variant="contained"
            size="small"
            disabled={executing}
            startIcon={executing ? <CircularProgress size={12} color="inherit" /> : <IconPlayerPlay size={14} />}
            onClick={handleExecute}
            sx={{ fontWeight: 600 }}
          >
            {executing ? 'Executing…' : 'Execute'}
          </Button>
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
