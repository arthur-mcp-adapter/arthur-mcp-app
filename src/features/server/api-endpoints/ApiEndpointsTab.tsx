import { useState } from 'react'
import {
  Alert, Box, Button, Chip, Grid,
  InputAdornment, TextField, Typography,
} from '@mui/material'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useAuth, Permission } from '../../../context/AuthContext'
import type { GeneratedTool } from '../types'
import { METHOD_COLOR } from '../constants'
import { StatCard } from '../activity/ProjectLogs'
import { EndpointAccordion } from './EndpointAccordion'
import { ToolDialog } from './ToolDialog'

export function ApiEndpointsTab({ tools, projectId, projectBaseUrl, anyApiKey, onToolAdded, onToolChanged, onToolDeleted }: {
  tools: GeneratedTool[]
  projectId: string
  projectBaseUrl: string
  anyApiKey?: string
  onToolAdded: (tool: GeneratedTool) => void
  onToolChanged: (oldName: string, newTool: GeneratedTool) => void
  onToolDeleted: (toolName: string) => void
}) {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editEndpoint, setEditEndpoint] = useState<GeneratedTool | null>(null)

  const endpoints = tools.map((t) => ({ tool: t, ...t.endpointRef }))

  const methods = [...new Set(endpoints.map((e) => e.method.toUpperCase()))].sort()

  const visible = endpoints.filter((e) => {
    const m = e.method.toUpperCase()
    if (methodFilter && m !== methodFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.path.toLowerCase().includes(q) ||
        (e.tool.description ?? '').toLowerCase().includes(q) ||
        e.tool.name.toLowerCase().includes(q)
      )
    }
    return true
  })

  const methodCounts = Object.fromEntries(
    methods.map((m) => [m, endpoints.filter((e) => e.method.toUpperCase() === m).length])
  )

  return (
    <Box>
      {/* Stats row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total endpoints" value={endpoints.length} color="#5D87FF" />
        </Grid>
        {methods.map((m) => (
          <Grid item xs={6} sm={3} key={m}>
            <StatCard label={m} value={methodCounts[m]} color={METHOD_COLOR[m]} />
          </Grid>
        ))}
      </Grid>

      {/* Search + filter + add button */}
      <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search by path, name or description…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        />
        {methods.length > 1 && (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            <Chip label="All" size="small" clickable onClick={() => setMethodFilter(null)}
              color={methodFilter === null ? 'primary' : 'default'}
              variant={methodFilter === null ? 'filled' : 'outlined'} />
            {methods.map((m) => (
              <Chip key={m} label={m} size="small" clickable
                onClick={() => setMethodFilter(methodFilter === m ? null : m)}
                sx={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem',
                  bgcolor: methodFilter === m ? METHOD_COLOR[m] : 'transparent',
                  color: methodFilter === m ? '#fff' : METHOD_COLOR[m],
                  borderColor: METHOD_COLOR[m],
                }}
                variant="outlined" />
            ))}
          </Box>
        )}
        {(search || methodFilter) && (
          <Typography variant="body2" color="text.secondary">
            {visible.length} of {endpoints.length}
          </Typography>
        )}
        <Box flexGrow={1} />
        {can(Permission.EndpointsCreate) && (
          <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
            onClick={() => setCreateOpen(true)}>
            Add endpoint
          </Button>
        )}
      </Box>

      {/* Endpoint list */}
      {endpoints.length === 0 ? (
        <Alert severity="info">No endpoints — upload an OpenAPI spec or click "Add endpoint" to create one manually.</Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info">No endpoints match your search.</Alert>
      ) : (
        <Box display="flex" flexDirection="column" gap={'6px'}>
          {visible.map((e, i) => (
            <EndpointAccordion key={i} endpoint={e} projectId={projectId} anyApiKey={anyApiKey} canTest={can(Permission.ToolsTest)}
              onEdit={can(Permission.ToolsEdit) ? () => setEditEndpoint(e.tool) : undefined}
              onToolChanged={onToolChanged} />
          ))}
        </Box>
      )}

      <ToolDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(tool) => { onToolAdded(tool); setCreateOpen(false) }}
        projectId={projectId}
        projectBaseUrl={projectBaseUrl}
        mode="endpoint"
      />

      <ToolDialog
        open={editEndpoint !== null}
        editTool={editEndpoint ?? undefined}
        onClose={() => setEditEndpoint(null)}
        onSaved={(newTool, oldName) => { onToolChanged(oldName ?? newTool.name, newTool); setEditEndpoint(null) }}
        onDeleted={(name) => { onToolDeleted(name); setEditEndpoint(null) }}
        projectId={projectId}
        projectBaseUrl={projectBaseUrl}
        mode="endpoint"
      />
    </Box>
  )
}
