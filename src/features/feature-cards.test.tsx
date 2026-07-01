import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiProviderCard } from './aiProviders'
import { ErrorTrackingProviderCard } from './errorTracking'
import { ObservabilityProviderCard } from './observability/ObservabilityProviderCard'
import { PromptCard, TagInput } from './prompts'
import SecretAutocomplete, { useSecrets } from './secrets/SecretAutocomplete'
import { SecretCard } from './secrets'
import { ProjectCard } from './server/ProjectCard'
import { Permission } from '../context/AuthContext'
import type { Project } from './server/types'

const authState = vi.hoisted(() => ({
  allowed: new Set<string>(),
}))

const apiGet = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({
  default: { get: apiGet },
}))

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/AuthContext')>()
  return {
    ...actual,
    useAuth: () => ({ can: (permission: string) => authState.allowed.has(permission) }),
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => ({
      'action.copyValue': 'Copy value',
      'action.hide': 'Hide',
      'action.openDashboard': 'Open dashboard',
      'action.reveal': 'Reveal',
      'common:action.copied': 'Copied',
      'common:action.delete': 'Delete',
      'common:action.duplicate': 'Duplicate',
      'common:label.inactive': 'Inactive',
      'common:status.error': 'Error',
      'filter.copyContent': 'Copy content',
      'filter.delete': 'Delete',
      'label.toolCount': `${vars?.count ?? 0} tools`,
      'label.updated': `Updated ${vars?.date ?? ''}`,
      'label.updatedDate': `Updated ${vars?.date ?? ''}`,
      'placeholder.addTag': 'Add tag',
      'provider.openai': 'OpenAI',
      'provider.unknown': 'Unknown',
      'status.active': 'Active',
      'status.errorRate': `${vars?.rate}% errors over ${vars?.count} calls`,
      'status.noActivity': 'No activity',
      'status.paused': 'Paused',
      'status.pausedByManager': 'Paused by manager',
      'status.requestsSucceeded': `${vars?.count} requests succeeded`,
      'toast.copied': 'Copied',
      'type.grafana': 'Grafana',
    }[key] ?? key),
  }),
}))

function allow(...permissions: Permission[]) {
  authState.allowed = new Set(permissions)
}

describe('feature cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    allow()
  })

  it('renders AI provider actions according to permissions', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    allow(Permission.AiProvidersEdit, Permission.AiProvidersDelete)

    render(
      <AiProviderCard
        provider={{
          id: 'ai-1',
          name: 'Main LLM',
          description: 'OpenAI provider',
          provider: 'openai',
          model: 'gpt-4.1',
          apiKeySet: true,
          isActive: false,
          isDefault: false,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByText('Main LLM')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('gpt-4.1')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()

    await user.click(screen.getByText('Main LLM'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-1' }))

    await user.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-1' }))
  })

  it('renders error tracking provider metadata and inactive state', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    allow(Permission.ErrorTrackingEdit)

    render(
      <ErrorTrackingProviderCard
        provider={{
          id: 'err-1',
          name: 'Sentry Prod',
          description: 'Production issues',
          tool: 'sentry',
          dsn: 'https://dsn.example.com',
          projectName: 'arthur',
          environment: 'prod',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Sentry Prod')).toBeInTheDocument()
    expect(screen.getByText('prod')).toBeInTheDocument()
    expect(screen.getByText('arthur')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()

    await user.click(screen.getByText('Sentry Prod'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'err-1' }))
  })

  it('renders observability provider dashboard links without triggering card edit', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    allow(Permission.ObservabilityEdit, Permission.ObservabilityDelete)

    render(
      <ObservabilityProviderCard
        provider={{
          id: 'obs-1',
          name: 'Grafana',
          description: 'Dashboards',
          type: 'grafana',
          url: 'https://grafana.example.com',
          isActive: false,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Grafana')).toHaveLength(2)
    expect(screen.getByText('https://grafana.example.com')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()

    await user.click(screen.getByRole('link'))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('renders prompt cards and tag input interactions', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onCopy = vi.fn()
    const onDelete = vi.fn()

    render(
      <PromptCard
        prompt={{
          id: 'prompt-1',
          name: 'Summarize',
          description: 'Summary prompt',
          content: 'Summarize {{document}}',
          tags: ['docs'],
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={onEdit}
        onCopy={onCopy}
        onDelete={onDelete}
        canEdit
        canDelete
        copied={false}
      />,
    )

    await user.click(screen.getByLabelText('Copy content'))
    expect(onCopy).toHaveBeenCalledWith(expect.objectContaining({ id: 'prompt-1' }))
    await user.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'prompt-1' }))
    await user.click(screen.getByText('Summarize'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'prompt-1' }))
  })

  it('adds, normalizes, deduplicates, blurs, and removes tags', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container, rerender } = render(<TagInput tags={['docs']} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Add tag')

    await user.type(input, 'New Tag{enter}')
    expect(onChange).toHaveBeenCalledWith(['docs', 'new-tag'])

    rerender(<TagInput tags={['docs', 'new-tag']} onChange={onChange} />)
    fireEvent.click(container.querySelector('.MuiChip-deleteIcon') as Element)
    expect(onChange).toHaveBeenCalledWith(['new-tag'])

    await user.clear(screen.getByPlaceholderText('Add tag'))
    await user.type(screen.getByPlaceholderText('Add tag'), 'new tag,')
    expect(onChange).not.toHaveBeenLastCalledWith(['docs', 'new-tag', 'new-tag'])
  })

  it('loads and reveals secret card values only with reveal permission', async () => {
    const user = userEvent.setup()
    allow(Permission.SecretsEdit, Permission.SecretsRevealValues, Permission.SecretsDelete)
    apiGet.mockResolvedValue({ data: { value: 'real-secret' } })

    render(
      <SecretCard
        secret={{
          id: 'sec-1',
          name: 'API_KEY',
          description: 'API key',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
        copied={false}
      />,
    )

    expect(screen.getByText('{{secret:API_KEY}}')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Reveal'))

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/secrets/sec-1/value'))
    expect(await screen.findByText('real-secret')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Hide'))
    expect(screen.queryByText('real-secret')).not.toBeInTheDocument()
  })

  it('renders project cards with navigation, tags, and actions', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const onDuplicate = vi.fn()
    allow(Permission.ServersCreate, Permission.ServersDelete)

    render(
      <ProjectCard
        p={{
          ...projectFixture(),
          _id: 'project-1',
          name: 'Project API',
          baseUrl: 'https://api.example.com',
          version: '1',
          tags: ['source:rest'],
          tools: [{ name: 'list', description: '', inputSchema: {}, endpointRef: {} as never }],
        }}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />,
    )

    expect(screen.getByText('Project API')).toBeInTheDocument()
    expect(screen.getByText('https://api.example.com')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('1 tools')).toBeInTheDocument()
    expect(screen.getByText('source:rest')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Duplicate'))
    expect(onDuplicate).toHaveBeenCalledWith('project-1')

    await user.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('project-1')

    await user.click(screen.getByText('Project API'))
    expect(navigate).toHaveBeenCalledWith('/servers/project-1')
  })

  it('renders restricted and alternate project card states', () => {
    allow()
    const { rerender } = render(
      <ProjectCard
        p={projectFixture({
          _id: 'paused',
          name: 'Paused API',
          baseUrl: 'https://paused.example.com',
          tags: [],
          tools: [],
          isPaused: true,
        })}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
    )

    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.queryByLabelText('Duplicate')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument()

    rerender(
      <ProjectCard
        p={projectFixture({
          _id: 'error',
          name: 'Error API',
          baseUrl: 'https://error.example.com',
          status: 'error',
          tools: undefined as never,
          isPaused: false,
        })}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('0 tools')).toBeInTheDocument()
  })

  it('renders prompt cards without edit/delete branches', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()

    render(
      <PromptCard
        prompt={{
          id: 'prompt-2',
          name: 'Readonly prompt',
          content: 'content',
          tags: [],
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={onEdit}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
        canEdit={false}
        canDelete={false}
        copied
      />,
    )

    expect(screen.getByText('Readonly prompt')).toBeInTheDocument()
    expect(screen.getByLabelText('Copied')).toBeInTheDocument()
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument()

    await user.click(screen.getByText('Readonly prompt'))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('renders secret cards without reveal or delete permissions', () => {
    allow()

    render(
      <SecretCard
        secret={{
          id: 'sec-2',
          name: 'HIDDEN_KEY',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-02',
        }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
        copied
      />,
    )

    expect(screen.getByText('{{secret:HIDDEN_KEY}}')).toBeInTheDocument()
    expect(screen.queryByLabelText('Reveal')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Copied')).not.toBeInTheDocument()
  })
})

describe('secret autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads secrets through useSecrets', async () => {
    apiGet.mockResolvedValue({ data: [{ id: 'sec-1', name: 'API_KEY' }] })

    function Harness() {
      const { secrets, loading } = useSecrets()
      return <div>{loading ? 'loading' : secrets.map((secret) => secret.name).join(',')}</div>
    }

    render(<Harness />)
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('API_KEY')).toBeInTheDocument()
  })

  it('selects secret references and shows selected helper text', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SecretAutocomplete
        value=""
        onChange={onChange}
        label="Secret"
        loadingSecrets={false}
        secrets={[{ id: 'sec-1', name: 'API_KEY', description: 'Main API key' }]}
      />,
    )

    await user.click(screen.getByLabelText('Secret'))
    await user.click(screen.getByText('API_KEY'))
    expect(onChange).toHaveBeenCalledWith('{{secret:API_KEY}}')
  })

  it('renders selected, loading, and empty secret autocomplete states', async () => {
    const { rerender } = render(
      <SecretAutocomplete
        value="{{secret:API_KEY}}"
        onChange={vi.fn()}
        label="Secret"
        loadingSecrets={false}
        secrets={[{ id: 'sec-1', name: 'API_KEY', description: 'Main API key' }]}
      />,
    )

    expect(screen.getByText('{{secret:API_KEY}}')).toBeInTheDocument()

    rerender(
      <SecretAutocomplete
        value=""
        onChange={vi.fn()}
        label="Secret"
        loadingSecrets
        secrets={[]}
      />,
    )

    fireEvent.mouseDown(screen.getByLabelText('Secret'))
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
  })
})
const projectFixture = (overrides: Partial<Project> = {}): Project => ({
  _id: 'project-1',
  name: 'Project API',
  description: 'REST project',
  baseUrl: 'https://api.example.com',
  status: 'active',
  tags: [],
  tools: [],
  isPaused: false,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-02',
  ...overrides,
})
