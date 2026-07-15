import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, Permission, can, useAuth, type Me } from './auth'
import { ALL_PERMISSIONS_OFF, READ_ONLY_FALLBACK, ROLE_PERMISSION_FALLBACKS } from './auth'
import { ServerNavProvider, useServerNav } from './'
import { ColorModeProvider, ColorMode, useColorMode } from '../theme'

const apiGet = vi.hoisted(() => vi.fn())
const onAuthStateChange = vi.hoisted(() => vi.fn())
const signOut = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({
  default: { get: apiGet },
}))

vi.mock('../supabaseClient', () => ({
  supabase: { auth: { onAuthStateChange, signOut } },
}))

/** Makes AuthProvider's subscription fire once, synchronously, with the given session. */
function mockSession(session: { access_token: string } | null) {
  onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
    cb('INITIAL_SESSION', session)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
}

describe('auth and navigation contexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('allows every permission for admin users', () => {
    const me = { role: 'admin' } as Me
    expect(can(me, Permission.ServersDelete)).toBe(true)
    expect(can(me, Permission.SettingsManage)).toBe(true)
  })

  it('uses explicit permissions before role fallbacks', () => {
    const me = {
      role: 'viewer',
      permissions: { ...ALL_PERMISSIONS_OFF, servers_delete: true },
    } as Me

    expect(can(me, Permission.ServersDelete)).toBe(true)
    expect(can(me, Permission.ServersCreate)).toBe(false)
  })

  it('uses role fallback permissions and read-only fallback for unknown roles', () => {
    expect(can({ role: 'developer' } as Me, Permission.ServersCreate)).toBe(true)
    expect(can({ role: 'viewer' } as Me, Permission.ServersCreate)).toBe(false)
    expect(can({ role: 'unknown' } as Me, Permission.ServersView)).toBe(true)
    expect(can(null, Permission.ServersView)).toBe(false)
    expect(READ_ONLY_FALLBACK.servers_view).toBe(true)
    expect(ROLE_PERMISSION_FALLBACKS.admin.settings_manage).toBe(true)
  })

  it('loads current user when a Supabase session exists', async () => {
    mockSession({ access_token: 'tok' })
    apiGet.mockResolvedValue({ data: { _id: 'u1', username: 'ada', email: 'a@example.com', role: 'viewer' } })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGet).toHaveBeenCalledWith('/users/me')
    expect(localStorage.getItem('token')).toBe('tok')
    expect(result.current.me?.username).toBe('ada')
    expect(result.current.can(Permission.ServersView)).toBe(true)
    expect(result.current.isAdmin).toBe(false)
  })

  it('clears auth state when loading current user fails or logout is called', async () => {
    mockSession({ access_token: 'tok' })
    apiGet.mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.me).toBeNull()

    act(() => result.current.logout())
    expect(signOut).toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
    expect(result.current.me).toBeNull()
  })

  it('stops loading without calling API when there is no Supabase session', async () => {
    mockSession(null)

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGet).not.toHaveBeenCalledWith('/users/me')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('stores and clears contextual server navigation', () => {
    function Harness() {
      const { serverDetail, setServerDetail } = useServerNav()
      return (
        <>
          <div>{serverDetail?.name ?? 'no-detail'}</div>
          <button onClick={() => setServerDetail({
            name: 'Project API',
            sourceEmoji: 'P',
            sourceColor: '#111',
            navItems: [],
            tab: 0,
            onTabChange: vi.fn(),
          })}
          >
            set
          </button>
          <button onClick={() => setServerDetail(null)}>clear</button>
        </>
      )
    }

    render(<Harness />, { wrapper: ServerNavProvider })
    expect(screen.getByText('no-detail')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'set' }).click())
    expect(screen.getByText('Project API')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'clear' }).click())
    expect(screen.getByText('no-detail')).toBeInTheDocument()
  })
})

describe('color mode context', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to dark mode and toggles to light mode', async () => {
    const user = userEvent.setup()
    function Harness() {
      const { mode, toggle } = useColorMode()
      return <button onClick={toggle}>{mode}</button>
    }

    render(<Harness />, { wrapper: ColorModeProvider })
    expect(screen.getByRole('button', { name: ColorMode.Dark })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: ColorMode.Dark }))
    expect(screen.getByRole('button', { name: ColorMode.Light })).toBeInTheDocument()
    expect(localStorage.getItem('colorMode')).toBe(ColorMode.Light)
  })

  it('uses stored light mode', () => {
    localStorage.setItem('colorMode', ColorMode.Light)
    function Harness() {
      const { mode } = useColorMode()
      return <div>{mode}</div>
    }

    render(<Harness />, { wrapper: ColorModeProvider })
    expect(screen.getByText(ColorMode.Light)).toBeInTheDocument()
  })
})
