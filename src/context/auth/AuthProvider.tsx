import { useCallback, useEffect, useState } from 'react'
import api from '../../api'
import type { AuthProviderProps } from '../authProviderProps.interface'
import { AuthContext } from './authContext.context'
import type { Me } from './me.interface'
import type { UserPermissions } from './userPermissions.interface'
import { canUserPermission } from './utils/canUserPermission.permission'

export function AuthProvider({ children }: AuthProviderProps) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    setLoading(true)
    api.get<Me>('/users/me')
      .then((response) => setMe(response.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const can = useCallback(
    (key: keyof UserPermissions) => canUserPermission(me, key),
    [me],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setMe(null)
    setLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ me, loading, can, isAdmin: me?.role === 'admin', reload: load, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
