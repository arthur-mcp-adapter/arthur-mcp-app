import { Button, Divider, Stack, Typography } from '@mui/material'
import { IconBrandGoogle, IconBrandGithub } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../supabaseClient'
import { supabaseConfigured } from '../../../supabaseConfigured.constant'

/** Google/GitHub sign-in via Supabase's native OAuth; hidden unless Supabase is configured
 * (the providers themselves are enabled/disabled in the Supabase dashboard, not this app). */
export default function SocialAuthButtons() {
  const { t } = useTranslation('auth')

  if (!supabaseConfigured) return null

  const signInWith = (provider: 'google' | 'github') =>
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/oauth-callback` },
    })

  return (
    <Stack spacing={2}>
      <Divider>
        <Typography variant="body2" color="text.secondary">
          {t('label.orContinueWith')}
        </Typography>
      </Divider>
      <Stack direction="row" spacing={2}>
        <Button variant="outlined" fullWidth onClick={() => signInWith('google')} startIcon={<IconBrandGoogle size={18} />}>
          Google
        </Button>
        <Button variant="outlined" fullWidth onClick={() => signInWith('github')} startIcon={<IconBrandGithub size={18} />}>
          GitHub
        </Button>
      </Stack>
    </Stack>
  )
}
