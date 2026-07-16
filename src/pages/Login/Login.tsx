import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useColorMode, ColorMode } from '../../theme'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { supabase } from '../../supabaseClient'
import SocialAuthButtons from '../../components/organisms/SocialAuthButtons'
import { HcaptchaChallenge, hcaptchaConfigured } from '../../features/auth'

export default function Login() {
  const navigate = useNavigate()
  const { mode } = useColorMode()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      })
      if (signInError) throw signInError
      navigate('/')
    } catch {
      setError(t('error.invalidCredentials'))
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
        overflow: 'hidden',
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
      <Grid
        container
        spacing={0}
        justifyContent="center"
        sx={{ height: '100vh', position: 'relative', zIndex: 1 }}
      >
        <Grid
          item
          xs={12}
          sm={8}
          lg={4}
          xl={3}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            px: 2,
          }}
        >
          <Card
            variant="outlined"
            sx={{
              p: 4,
              width: '100%',
              maxWidth: '420px',
              borderRadius: '14px',
              bgcolor: 'background.paper',
              boxShadow: 'rgb(145 158 171 / 16%) 0px 4px 32px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Logo */}
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
              <Typography
                variant="h4"
                fontWeight={700}
                color="primary.main"
                sx={{ display: 'none', letterSpacing: '-0.3px' }}
              >
                Arthur MCP
              </Typography>
            </Box>

            <Typography
              variant="subtitle1"
              textAlign="center"
              color="text.secondary"
              mb={3}
            >
              {t('heading.signIn')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    component="label"
                    htmlFor="email"
                    display="block"
                    mb="5px"
                  >
                    {t('label.email')}
                  </Typography>
                  <TextField
                    id="email"
                    type="email"
                    variant="outlined"
                    fullWidth
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    component="label"
                    htmlFor="password"
                    display="block"
                    mb="5px"
                  >
                    {t('label.password')}
                  </Typography>
                  <TextField
                    id="password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Box>

                <Stack justifyContent="space-between" direction="row" alignItems="center">
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox size="small" />}
                      label={<Typography variant="body2">{t('label.rememberMe')}</Typography>}
                    />
                  </FormGroup>
                  <Link component={RouterLink} to="/forgot-password" variant="body2">
                    {t('link.forgotPassword')}
                  </Link>
                </Stack>

                <HcaptchaChallenge
                  onTokenChange={setCaptchaToken}
                  resetKey={captchaResetKey}
                />

                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || (hcaptchaConfigured && !captchaToken)}
                  disableElevation
                  sx={{ py: 1.2 }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    t('action.signIn')
                  )}
                </Button>

                <SocialAuthButtons />

                <Typography variant="body2" textAlign="center" color="text.secondary">
                  {t('link.noAccount')}{' '}
                  <Link component={RouterLink} to="/signup">
                    {t('action.signUp')}
                  </Link>
                </Typography>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
