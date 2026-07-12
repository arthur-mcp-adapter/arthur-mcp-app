import { useEffect, useState } from 'react'
import { Button, Divider, Stack, Typography } from '@mui/material'
import { IconBrandGoogle, IconBrandGithub } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { apiUrl } from '../../../config/urls'

interface OAuthProviders {
  google: boolean
  github: boolean
}

/** Redirect buttons for Google/GitHub sign-in; hidden unless the backend has that provider configured. */
export default function SocialAuthButtons() {
  const { t } = useTranslation('auth')
  const [providers, setProviders] = useState<OAuthProviders | null>(null)

  useEffect(() => {
    api
      .get<OAuthProviders>('/auth/providers')
      .then((res) => setProviders(res.data))
      .catch(() => setProviders({ google: false, github: false }))
  }, [])

  if (!providers || (!providers.google && !providers.github)) return null

  return (
    <Stack spacing={2}>
      <Divider>
        <Typography variant="body2" color="text.secondary">
          {t('label.orContinueWith')}
        </Typography>
      </Divider>
      <Stack direction="row" spacing={2}>
        {providers.google && (
          <Button variant="outlined" fullWidth href={apiUrl('/auth/google')} startIcon={<IconBrandGoogle size={18} />}>
            Google
          </Button>
        )}
        {providers.github && (
          <Button variant="outlined" fullWidth href={apiUrl('/auth/github')} startIcon={<IconBrandGithub size={18} />}>
            GitHub
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
