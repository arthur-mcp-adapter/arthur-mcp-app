import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common:action.delete': 'Delete',
      'common:action.reload': 'Reload',
      'servers:action.browseTemplates': 'Browse templates',
      'servers:action.createFirst': 'Create first server',
      'servers:action.newServer': 'New server',
      'servers:empty.noMatch': 'No matching servers',
      'servers:empty.noServers': 'No servers yet',
      'servers:heading.title': 'Servers',
      'servers:label.all': 'All',
      'servers:label.tags': 'Tags',
      'servers:placeholder.search': 'Search',
    }[key] ?? key),
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  Permission: {
    ServersView: 'servers_view',
    ServersCreate: 'servers_create',
    ServersDelete: 'servers_delete',
  },
  useAuth: () => ({ me: { _id: 'u1', username: 'admin', role: 'admin' }, can: () => true, isAdmin: true, loading: false, reload: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from '../../api';
import Servers from '.';

const renderServers = () => render(<Servers />, { wrapper: MemoryRouter });

describe('Servers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Servers heading', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    renderServers();
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });

  it('renders the New server button for users with servers_create permission', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    renderServers();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new server/i })).toBeInTheDocument();
    });
  });

  it('renders server cards when API returns projects', async () => {
    const projects = [
      {
        _id: 'p1', name: 'My API', baseUrl: 'https://api.example.com',
        status: 'active', tools: [], tags: [], isPaused: false,
      },
    ];
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: projects });
    renderServers();
    await waitFor(() => {
      expect(screen.getByText('My API')).toBeInTheDocument();
    });
  });

  it('shows "No servers yet" when project list is empty', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    renderServers();
    await waitFor(() => {
      expect(screen.getByText('No servers yet')).toBeInTheDocument();
    });
  });
});
