import { useCallback, useEffect, useState } from 'react'
import api from '../../api'
import { supabase } from '../../supabaseClient'
import type { AuthProviderProps } from '../authProviderProps.interface'
import { AuthContext } from './authContext.context'
import type { Me } from './me.interface'
import type { UserPermissions } from './userPermissions.interface'
import { canUserPermission } from './utils/canUserPermission.permission'

export function AuthProvider({ children }: AuthProviderProps) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [selfHosted, setSelfHosted] = useState(false)

  /** Mirrors the Supabase access token into localStorage (which `api.ts` reads) and loads `/users/me`. */
  const loadMe = useCallback((token: string | null) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')

    if (!token) { setMe(null); setLoading(false); return }
    setLoading(true)
    api.get<Me>('/users/me')
      .then((response) => setMe(response.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  const reload = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadMe(session?.access_token ?? null))
  }, [loadMe])

  useEffect(() => {
    api.get<{ selfHosted: boolean }>('/auth/providers')
      .then((response) => setSelfHosted(response.data.selfHosted))
      .catch(() => setSelfHosted(false))

    // Fires immediately with the persisted session (or null) on subscribe, then again on every
    // sign-in/sign-out/token-refresh/profile-update — the single source of truth for `me`.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      loadMe(session?.access_token ?? null)
    })

    return () => data.subscription.unsubscribe()
  }, [loadMe])

  const can = useCallback(
    (key: keyof UserPermissions) => canUserPermission(me, key),
    [me],
  )

  const logout = useCallback(() => {
    supabase.auth.signOut()
    localStorage.removeItem('token')
    setMe(null)
    setLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ me, loading, can, isAdmin: me?.role === 'admin', selfHosted, reload, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
