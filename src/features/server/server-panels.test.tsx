import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Permission } from '../../context/AuthContext'
import { RateLimitPanel } from './settings/RateLimitPanel'
import { BaseUrlPanel } from './settings/BaseUrlPanel'
import { InlineEdit } from './settings/InlineEdit'
import { AlertConfigPanel } from './settings/AlertConfigPanel'
import { InputConstraintsPanel } from './guardRails/InputConstraintsPanel'
import { TimeoutPanel } from './harness/TimeoutPanel'
import type { GeneratedTool } from './types'

const apiGet = vi.hoisted(() => vi.fn())
const apiPatch = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({ allowed: new Set<string>() }))

vi.mock('../../api', () => ({
  default: { get: apiGet, patch: apiPatch },
}))

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>()
  return {
    ...actual,
    useAuth: () => ({ can: (permission: string) => authState.allowed.has(permission) }),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => ({
      'action.addConstraint': 'Add constraint',
      'action.addToolOverride': 'Add tool override',
      'action.remove': 'Remove',
      'error.rateLimitRange': 'Rate limit out of range',
      'error.saveFailed': 'Save failed',
      'empty.noInputConstraints': 'No input constraints',
      'guardRails.section.inputConstraints': 'Input constraints',
      'guardRails.section.inputConstraintsDesc': 'Validate incoming parameters',
      'harness.section.timeouts': 'Timeouts',
      'harness.section.timeoutsDesc': 'Control execution timeouts',
      'heading.errorAlerts': 'Error alerts',
      'heading.requestLimit': 'Request limit',
      'hint.alertHint': 'Alerts are sent when the threshold is crossed',
      'hint.errorAlertsDesc': 'Notify when error rates rise',
      'hint.rateLimitActive': `${vars?.rpm} requests per minute`,
      'hint.rateLimitInactive': 'Rate limiting is disabled',
      'label.alertEmail': 'Alert e-mail',
      'label.alertThreshold': 'Alert threshold',
      'label.allTools': 'All tools',
      'label.constraint': 'Constraint',
      'label.globalTimeoutMs': 'Global timeout',
      'label.parameter': 'Parameter',
      'label.perToolOverrides': 'Per-tool overrides',
      'label.reqPerMin': 'Requests per minute',
      'label.required': 'Required',
      'label.timeoutAppliesAll': `${vars?.seconds}s for all tools`,
      'label.timeoutMs': 'Timeout',
      'label.value': 'Value',
      'logs.tool': 'Tool',
      'status.active': 'Active',
      'status.inactive': 'Inactive',
      'status.off': 'Off',
      'status.on': 'On',
      'tooltip.removeOverride': 'Remove override',
    }[key] ?? key),
  }),
}))

const tools: GeneratedTool[] = [
  {
    name: 'list_users',
    description: 'List users',
    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
    endpointRef: { method: 'GET', baseUrl: 'https://api.example.com', path: '/users', parameterMap: [] },
  },
  {
    name: 'get_user',
    inputSchema: { type: 'object' },
    endpointRef: { method: 'GET', baseUrl: 'https://api.example.com', path: '/users/{id}', parameterMap: [] },
  },
]

describe('server feature panels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.allowed = new Set([Permission.ServersEditSettings])
    apiPatch.mockResolvedValue({ data: {} })
    apiGet.mockResolvedValue({ data: [] })
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: vi.fn(() => 'uuid-1') },
    })
  })

  it('saves rate limit toggles and validates invalid request counts', async () => {
    const onChange = vi.fn()
    render(<RateLimitPanel projectId="p1" initialRateLimit={{ enabled: false, requestsPerMinute: 60 }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/swagger/servers/p1/rate-limit', { enabled: true, requestsPerMinute: 60 }))
    expect(onChange).toHaveBeenCalledWith({ enabled: true, requestsPerMinute: 60 })

    fireEvent.change(screen.getByLabelText('Requests per minute'), { target: { value: '0' } })
    await waitFor(() => expect(screen.getByText('Rate limit out of range')).toBeInTheDocument(), { timeout: 1200 })
  })

  it('edits, validates, saves, and cancels the base URL', async () => {
    const onChange = vi.fn()
    render(<BaseUrlPanel projectId="p1" initialValue="https://old.example.com" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Edit Base URL'))
    fireEvent.change(screen.getByLabelText('ExternalAPI Base URL'), { target: { value: 'not-a-url' } })
    fireEvent.keyDown(screen.getByLabelText('ExternalAPI Base URL'), { key: 'Enter' })
    expect(screen.getByText(/Invalid URL/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('ExternalAPI Base URL'), { target: { value: 'https://new.example.com' } })
    fireEvent.keyDown(screen.getByLabelText('ExternalAPI Base URL'), { key: 'Enter' })

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/swagger/servers/p1/base-url', { baseUrl: 'https://new.example.com' }))
    expect(onChange).toHaveBeenCalledWith('https://new.example.com')
  })

  it('hides base URL edit action without settings permission', () => {
    authState.allowed = new Set()
    render(<BaseUrlPanel projectId="p1" initialValue="" onChange={vi.fn()} />)

    expect(screen.getByText('No base URL set')).toBeInTheDocument()
    expect(screen.queryByLabelText('Edit Base URL')).not.toBeInTheDocument()
  })

  it('supports inline edit commit, cancel, multiline, and read-only states', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<InlineEdit value="Name" onSave={onSave} />)

    fireEvent.click(screen.getByText('Name'))
    fireEvent.change(screen.getByDisplayValue('Name'), { target: { value: 'New name' } })
    fireEvent.keyDown(screen.getByDisplayValue('New name'), { key: 'Enter' })
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('New name'))

    rerender(<InlineEdit value="Description" onSave={onSave} multiline />)
    fireEvent.click(screen.getByText('Description'))
    fireEvent.change(screen.getByDisplayValue('Description'), { target: { value: 'Long text' } })
    fireEvent.keyDown(screen.getByDisplayValue('Long text'), { key: 'Escape' })
    expect(screen.getByText('Description')).toBeInTheDocument()

    rerender(<InlineEdit value="" onSave={onSave} readOnly emptyLabel="Empty" />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('saves alert config after enabling and editing fields', async () => {
    render(<AlertConfigPanel projectId="p1" initialConfig={{ enabled: false, errorThresholdPct: 20, notifyEmail: '' }} />)

    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/swagger/servers/p1/alert-config', {
      enabled: true,
      errorThresholdPct: 20,
      notifyEmail: '',
    }), { timeout: 1200 })

    fireEvent.change(screen.getByLabelText('Alert threshold'), { target: { value: '150' } })
    fireEvent.change(screen.getByLabelText('Alert e-mail'), { target: { value: 'ops@example.com' } })
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/alert-config', {
      enabled: true,
      errorThresholdPct: 100,
      notifyEmail: 'ops@example.com',
    }), { timeout: 1200 })
  })

  it('loads, adds, updates, and removes input constraints', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    render(<InputConstraintsPanel projectId="p1" tools={tools} />)

    expect(await screen.findByText('No input constraints')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add constraint' }))

    expect(screen.getByDisplayValue('')).toBeInTheDocument()
    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/swagger/servers/p1/guard-rails/input-constraints', {
      constraints: [expect.objectContaining({ id: 'uuid-1', toolName: '*', type: 'required', enabled: true })],
    }), { timeout: 1200 })

    fireEvent.change(screen.getByLabelText('Parameter'), { target: { value: 'query' } })
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/guard-rails/input-constraints', {
      constraints: [expect.objectContaining({ paramName: 'query' })],
    }), { timeout: 1200 })

    fireEvent.click(screen.getByLabelText('Remove'))
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/guard-rails/input-constraints', { constraints: [] }), { timeout: 1200 })
  })

  it('loads timeout config and manages overrides', async () => {
    apiGet.mockResolvedValueOnce({ data: { globalTimeoutMs: 5000, overrides: [] } })
    render(<TimeoutPanel projectId="p1" tools={tools} />)

    expect(await screen.findByDisplayValue('5000')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Global timeout'), { target: { value: '500' } })
    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/swagger/servers/p1/harness/timeout', { globalTimeoutMs: 1000, overrides: [] }), { timeout: 1200 })

    fireEvent.click(screen.getByRole('button', { name: 'Add tool override' }))
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/harness/timeout', {
      globalTimeoutMs: 1000,
      overrides: [{ toolName: 'list_users', timeoutMs: 1000 }],
    }), { timeout: 1200 })

    fireEvent.change(screen.getByLabelText('Timeout'), { target: { value: '9000' } })
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/harness/timeout', {
      globalTimeoutMs: 1000,
      overrides: [{ toolName: 'list_users', timeoutMs: 9000 }],
    }), { timeout: 1200 })

    fireEvent.click(screen.getByLabelText('Remove override'))
    await waitFor(() => expect(apiPatch).toHaveBeenLastCalledWith('/swagger/servers/p1/harness/timeout', { globalTimeoutMs: 1000, overrides: [] }), { timeout: 1200 })
  })
})
