import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    t: (key: string, vars?: Record<string, unknown>) => ({
      'common:action.delete': 'Delete',
      'common:action.duplicate': 'Duplicate',
      'common:action.reload': 'Reload',
      'common:status.error': 'Error',
      'servers:action.browseTemplates': 'Browse templates',
      'servers:action.createFirst': 'Create first server',
      'servers:action.newServer': 'New server',
      'servers:confirm.deleteMessage': `Delete ${vars?.name ?? 'server'}?`,
      'servers:confirm.deleteTitle': 'Delete server',
      'servers:empty.noMatch': 'No matching servers',
      'servers:empty.noServers': 'No servers yet',
      'servers:error.loadFailed': 'Could not load servers',
      'servers:heading.title': 'Servers',
      'servers:label.all': 'All',
      'servers:label.tags': 'Tags',
      'servers:label.toolCount': `${vars?.count ?? 0} tools`,
      'servers:placeholder.search': 'Search',
      'servers:status.active': 'Active',
      'servers:status.noActivity': 'No activity',
      'servers:status.paused': 'Paused',
      'servers:status.pausedByManager': 'Paused by manager',
      'servers:toast.duplicated': `Duplicated ${vars?.name ?? ''}`,
      'servers:toast.duplicateFailed': 'Could not duplicate server',
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

  it('filters projects by search and tags', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: [
          {
            _id: 'p1', name: 'Billing API', description: 'Money flows',
            baseUrl: 'https://billing.example.com', status: 'active', tools: [], tags: ['finance'], isPaused: false,
          },
          {
            _id: 'p2', name: 'Support API', description: 'Tickets',
            baseUrl: 'https://support.example.com', status: 'error', tools: [], tags: ['support'], isPaused: true,
          },
        ],
      });

    renderServers();
    expect(await screen.findByText('Billing API')).toBeInTheDocument();
    expect(screen.getByText('Support API')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'billing' } });
    expect(screen.getByText('Billing API')).toBeInTheDocument();
    expect(screen.queryByText('Support API')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: '' } });
    fireEvent.click(screen.getAllByText('support')[0]);
    expect(screen.queryByText('Billing API')).not.toBeInTheDocument();
    expect(screen.getByText('Support API')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('support')[0]);
    expect(screen.getByText('Billing API')).toBeInTheDocument();
  });

  it('duplicates a server and shows snackbar feedback', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: [{
          _id: 'p1', name: 'Billing API', baseUrl: 'https://billing.example.com',
          status: 'active', tools: [], tags: [], isPaused: false,
        }],
      });
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        _id: 'p2', name: 'Billing API Copy', baseUrl: 'https://billing.example.com',
        status: 'active', tools: [], tags: [], isPaused: false,
      },
    });

    renderServers();
    expect(await screen.findByText('Billing API')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Duplicate'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/swagger/servers/p1/duplicate');
      expect(screen.getByText('Billing API Copy')).toBeInTheDocument();
      expect(screen.getByText('Duplicated Billing API Copy')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation and deletes the selected server', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: [{
          _id: 'p1', name: 'Billing API', baseUrl: 'https://billing.example.com',
          status: 'active', tools: [], tags: [], isPaused: false,
        }],
      });
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    renderServers();
    expect(await screen.findByText('Billing API')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Delete'));
    expect(screen.getByText('Delete server')).toBeInTheDocument();
    expect(screen.getByText('Delete Billing API?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/swagger/servers/p1'));
    await waitFor(() => expect(screen.queryByText('Billing API')).not.toBeInTheDocument());
  });

  it('shows load errors and reload action', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    renderServers();
    expect(await screen.findByText('Could not load servers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalled();
  });
});
