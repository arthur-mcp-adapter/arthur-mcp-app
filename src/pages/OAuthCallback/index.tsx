import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../context/auth'

/** Landing page for Supabase's OAuth redirect — the session is auto-consumed by the Supabase
 * client from the redirect URL; AuthProvider's onAuthStateChange subscription picks it up, we
 * just wait for it to resolve. */
export default function OAuthCallback() {
  const navigate = useNavigate()
  const { me, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    navigate(me ? '/' : '/login', { replace: true })
  }, [loading, me, navigate])

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  )
}
