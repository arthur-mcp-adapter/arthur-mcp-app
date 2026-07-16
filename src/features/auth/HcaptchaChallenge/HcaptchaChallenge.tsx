import { useEffect, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Box, useMediaQuery } from '@mui/material'
import type { HcaptchaChallengeProps } from '../hcaptchaChallengeProps.interface'

export function HcaptchaChallenge({ onTokenChange, resetKey }: HcaptchaChallengeProps) {
  const captchaRef = useRef<HCaptcha>(null)
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY?.trim()
  const compact = useMediaQuery('(max-width:380px)')

  useEffect(() => {
    if (resetKey > 0) captchaRef.current?.resetCaptcha()
  }, [resetKey])

  if (!siteKey) return null

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 78 }}>
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        size={compact ? 'compact' : 'normal'}
        onVerify={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </Box>
  )
}
