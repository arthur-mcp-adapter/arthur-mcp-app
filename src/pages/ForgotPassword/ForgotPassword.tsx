import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import { HcaptchaChallenge, hcaptchaConfigured } from '../../features/auth'

export default function ForgotPassword() {
  const { t } = useTranslation('auth')
  const { mode } = useColorMode()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        ...(captchaToken ? { captchaToken } : {}),
      })
      if (resetError) throw resetError
      setSent(true)
    } catch {
      setError(t('error.sendFailed'))
    } finally {
      setLoading(false)
      setCaptchaToken(null)
      setCaptchaResetKey((current) => current + 1)
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
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height={112}
              overflow="hidden"
              mb={1}
            >
              <Box
                component="img"
                src={mode === ColorMode.Dark ? '/images/logos/arthur_mcp_dark.png' : '/images/logos/arthur_mcp_light.png'}
                alt="Arthur MCP"
                sx={{ width: '100%', height: 'auto', maxWidth: 356, flexShrink: 0 }}
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
              {t('heading.forgotPassword')}
            </Typography>

            {sent ? (
              <Alert severity="success">{t('hint.checkEmail')}</Alert>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} component="label" htmlFor="email" display="block" mb="5px">
                        {t('label.email')}
                      </Typography>
                      <TextField id="email" type="email" variant="outlined" fullWidth required autoFocus
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Box>
                    <HcaptchaChallenge
                      onTokenChange={setCaptchaToken}
                      resetKey={captchaResetKey}
                    />
                    <Button type="submit" color="primary" variant="contained" size="large" fullWidth disabled={loading || (hcaptchaConfigured && !captchaToken)} disableElevation sx={{ py: 1.2 }}>
                      {loading ? <CircularProgress size={22} color="inherit" /> : t('action.sendInstructions')}
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
