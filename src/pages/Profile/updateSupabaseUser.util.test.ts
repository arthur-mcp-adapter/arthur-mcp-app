import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateUser = vi.hoisted(() => vi.fn())
const refreshSession = vi.hoisted(() => vi.fn())

vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { updateUser, refreshSession } },
}))

import { updateSupabaseUser } from './updateSupabaseUser.util'

describe('updateSupabaseUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refreshes the session after changing username metadata so the backend receives updated JWT claims', async () => {
    const updatedUser = { id: 'user-1', user_metadata: { username: 'new-name' } }
    const refreshedUser = { ...updatedUser, aud: 'authenticated' }
    updateUser.mockResolvedValue({ data: { user: updatedUser }, error: null })
    refreshSession.mockResolvedValue({ data: { user: refreshedUser, session: { access_token: 'new-token' } }, error: null })

    await expect(updateSupabaseUser({ data: { username: 'new-name' } })).resolves.toBe(refreshedUser)
    expect(updateUser).toHaveBeenCalledWith({ data: { username: 'new-name' } })
    expect(refreshSession).toHaveBeenCalledOnce()
  })

  it('does not refresh JWT claims when only the password changes', async () => {
    const updatedUser = { id: 'user-1', user_metadata: { username: 'same-name' } }
    updateUser.mockResolvedValue({ data: { user: updatedUser }, error: null })

    await expect(updateSupabaseUser({ password: 'new-password' })).resolves.toBe(updatedUser)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('reports a session refresh failure after metadata was saved', async () => {
    const refreshError = new Error('Could not refresh session')
    updateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    refreshSession.mockResolvedValue({ data: { user: null, session: null }, error: refreshError })

    await expect(updateSupabaseUser({ data: { username: 'new-name' } })).rejects.toBe(refreshError)
  })
})
