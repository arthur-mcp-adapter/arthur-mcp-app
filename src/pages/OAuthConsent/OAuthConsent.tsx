import { useCallback, useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/auth'

/**
 * Consent screen for Supabase's OAuth 2.1 server (Authentication -> OAuth Server, "Authorization
 * Path"). Supabase redirects the browser here as `/oauth/consent?authorization_id=<id>` when a
 * third-party OAuth client asks to access the signed-in user's account. We fetch the request
 * details, let the user approve or deny, and the Supabase SDK redirects back to the client.
 *
 * Auth decision: requires a Supabase session (redirects to /login otherwise) but no app-specific
 * permission — it authorizes access to the user's own identity at the Supabase level, like
 * OAuthCallback and profile self-actions, not any Arthur MCP resource.
 */
export default function OAuthConsent() {
  const { t } = useTranslation('auth')
  const { me, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const authorizationId = params.get('authorization_id')

  const [details, setDetails] = useState<{ clientName: string; scopes: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !me || !authorizationId) return
    supabase.auth.oauth
      .getAuthorizationDetails(authorizationId)
      .then(({ data, error: err }) => {
        if (err || !data) return setError(t('consent.error'))
        if ('redirect_url' in data) return window.location.assign(data.redirect_url)
        setDetails({
          clientName: data.client?.name || data.client?.uri || t('consent.unknownClient'),
          scopes: (data.scope || '').split(' ').filter(Boolean),
        })
      })
      .catch(() => setError(t('consent.error')))
      .finally(() => setLoading(false))
  }, [authLoading, me, authorizationId, t])

  const decide = useCallback(
    async (approve: boolean) => {
      if (!authorizationId) return
      setSubmitting(true)
      setError('')
      const run = approve
        ? supabase.auth.oauth.approveAuthorization
        : supabase.auth.oauth.denyAuthorization
      const { data, error: err } = await run(authorizationId)
      if (err) {
        setError(t('consent.error'))
        setSubmitting(false)
        return
      }
      // The SDK auto-redirects when a redirect_url comes back; this is a defensive fallback.
      if (data?.redirect_url) window.location.assign(data.redirect_url)
    },
    [authorizationId, t],
  )

  if (authLoading || (loading && me && authorizationId && !error)) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }
  if (!me) return <Navigate to="/login" replace />

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" p={2}>
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 440, width: '100%' }}>
        {!authorizationId || (error && !details) ? (
          <Alert severity="error">{authorizationId ? error : t('consent.missingRequest')}</Alert>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {t('consent.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('consent.subtitle', { client: details?.clientName })}
              </Typography>
            </Box>
            {details?.scopes.length ? (
              <Box>
                <Typography variant="body2" mb={1}>
                  {t('consent.scopesTitle')}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {details.scopes.map((scope) => (
                    <Chip key={scope} label={scope} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            ) : null}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button onClick={() => decide(false)} disabled={submitting}>
                {t('consent.deny')}
              </Button>
              <Button variant="contained" onClick={() => decide(true)} disabled={submitting}>
                {t('consent.allow')}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
