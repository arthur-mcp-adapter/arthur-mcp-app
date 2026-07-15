import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { supabase } from '../../supabaseClient'
import { useColorMode, ColorMode } from '../../theme'

export default function ResetPassword() {
  const { t } = useTranslation('auth')
  const { mode } = useColorMode()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError(t('error.passwordMismatch')); return }
    if (newPassword.length < 6) { setError(t('error.passwordTooShort')); return }

    setLoading(true)
    try {
      // Supabase's password-reset email link already lands the browser in an authenticated
      // recovery session (tokens auto-consumed from the redirect URL by the client) — no token
      // needs to be passed here.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch {
      setError(t('error.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:before': {
          content: '""',
          background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
        },
      }}
    >
      <Grid container justifyContent="center" sx={{ position: 'relative', zIndex: 1, px: 2 }}>
        <Grid item xs={12} sm={8} lg={4} xl={3}>
          <Card elevation={9} sx={{ p: 4, borderRadius: '12px' }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Box
                component="img"
                src={mode === ColorMode.Dark ? '/images/logos/arthur_mcp_dark.png' : '/images/logos/arthur_mcp_light.png'}
                alt="Arthur MCP"
                sx={{ height: '100%', maxWidth: '100%' }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  img.style.display = 'none'
                  img.nextElementSibling?.removeAttribute('style')
                }}
              />
              <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ display: 'none' }}>
                Arthur MCP
              </Typography>
            </Box>

            <Typography variant="subtitle1" textAlign="center" color="text.secondary" mb={3}>
              {t('heading.resetPassword')}
            </Typography>

            {success ? (
              <Alert severity="success">{t('hint.resetSuccess')}</Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" display="block" mb="5px">
                        {t('label.newPassword')}
                      </Typography>
                      <TextField type="password" variant="outlined" fullWidth required autoFocus
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" display="block" mb="5px">
                        {t('label.confirmPassword')}
                      </Typography>
                      <TextField type="password" variant="outlined" fullWidth required
                        value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        error={!!confirm && newPassword !== confirm}
                        helperText={confirm && newPassword !== confirm ? t('error.passwordMismatchInline') : ''} />
                    </Box>
                    <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={loading} disableElevation sx={{ py: 1.2 }}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : t('action.resetPassword')}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}

            <Box textAlign="center" mt={2}>
              <Link component={RouterLink} to="/login" variant="body2">
                {t('link.backToLogin')}
              </Link>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
