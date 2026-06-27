import {
  Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material'
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react'
import type { ChainInputSource, ChainStep, GeneratedTool } from '../types'

export function StepBuilder({
  step,
  index,
  total,
  tools,
  previousSteps,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ChainStep
  index: number
  total: number
  tools: GeneratedTool[]
  previousSteps: ChainStep[]
  onChange: (s: ChainStep) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const tool = tools.find((t) => t.name === step.toolName)
  const params = Object.keys(tool?.inputSchema?.properties ?? {})

  const updateMapping = (paramName: string, input: ChainInputSource) => {
    const existing = step.inputMapping.filter((m) => m.paramName !== paramName)
    onChange({ ...step, inputMapping: [...existing, { paramName, input }] })
  }

  const getMapping = (paramName: string): ChainInputSource =>
    step.inputMapping.find((m) => m.paramName === paramName)?.input ?? { source: 'literal', value: '' }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <Chip label={`Step ${index + 1}`} size="small" color="primary" sx={{ fontSize: '0.72rem', height: 20 }} />
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Tool</InputLabel>
          <Select
            value={step.toolName}
            label="Tool"
            onChange={(e) => {
              const newTool = tools.find((t) => t.name === e.target.value)
              const newParams = Object.keys(newTool?.inputSchema?.properties ?? {})
              onChange({
                ...step,
                toolName: e.target.value,
                inputMapping: newParams.map((p) => ({
                  paramName: p,
                  input: { source: 'literal' as const, value: '' },
                })),
              })
            }}
          >
            {tools.map((t) => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Tooltip title="Move up"><span>
          <IconButton size="small" onClick={onMoveUp} disabled={index === 0}><IconChevronUp size={15} /></IconButton>
        </span></Tooltip>
        <Tooltip title="Move down"><span>
          <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1}><IconChevronDown size={15} /></IconButton>
        </span></Tooltip>
        <Tooltip title="Remove step">
          <IconButton size="small" color="error" onClick={onRemove}><IconX size={15} /></IconButton>
        </Tooltip>
      </Box>

      {params.length > 0 && tool && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem', width: '25%' }}>Param</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem', width: '22%' }}>Source</TableCell>
              <TableCell sx={{ py: 0.5, fontWeight: 600, fontSize: '0.72rem' }}>Value / Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {params.map((param) => {
              const mapping = getMapping(param)
              return (
                <TableRow key={param} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ py: 0.75 }}>
                    <Typography fontFamily="monospace" fontSize="0.78rem" fontWeight={600}>{param}</Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <Select
                      size="small" fullWidth value={mapping.source}
                      onChange={(e) => {
                        const src = e.target.value as ChainInputSource['source']
                        if (src === 'literal') updateMapping(param, { source: 'literal', value: '' })
                        else if (src === 'chain_input') updateMapping(param, { source: 'chain_input', paramName: '' })
                        else updateMapping(param, { source: 'step_output', stepId: previousSteps[0]?.id ?? '', jsonPath: '' })
                      }}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      <MenuItem value="literal" sx={{ fontSize: '0.78rem' }}>Literal</MenuItem>
                      <MenuItem value="chain_input" sx={{ fontSize: '0.78rem' }}>Chain input</MenuItem>
                      <MenuItem value="step_output" disabled={previousSteps.length === 0} sx={{ fontSize: '0.78rem' }}>Step output</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    {mapping.source === 'literal' && (
                      <TextField size="small" fullWidth placeholder="value…"
                        value={mapping.value}
                        onChange={(e) => updateMapping(param, { source: 'literal', value: e.target.value })}
                        InputProps={{ sx: { fontSize: '0.78rem' } }}
                      />
                    )}
                    {mapping.source === 'chain_input' && (
                      <TextField size="small" fullWidth placeholder="chain param name…"
                        value={mapping.paramName}
                        onChange={(e) => updateMapping(param, { source: 'chain_input', paramName: e.target.value })}
                        InputProps={{ sx: { fontSize: '0.78rem' } }}
                        helperText="Creates an input param on this chain"
                      />
                    )}
                    {mapping.source === 'step_output' && (
                      <Box display="flex" gap={0.5}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={mapping.stepId}
                            onChange={(e) => updateMapping(param, { ...mapping, source: 'step_output', stepId: e.target.value })}
                            sx={{ fontSize: '0.78rem' }}
                          >
                            {previousSteps.map((s, i) => (
                              <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.78rem' }}>Step {i + 1}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField size="small" placeholder="JSON path (e.g. data.id)"
                          value={mapping.jsonPath}
                          onChange={(e) => updateMapping(param, { ...mapping, source: 'step_output', jsonPath: e.target.value })}
                          InputProps={{ sx: { fontSize: '0.78rem' } }}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {params.length === 0 && step.toolName && (
        <Typography variant="caption" color="text.secondary">This tool has no parameters.</Typography>
      )}
      {!step.toolName && (
        <Typography variant="caption" color="text.secondary">Select a tool above to configure input mapping.</Typography>
      )}
    </Paper>
  )
}
