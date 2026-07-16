import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), '')
const siteKey = env.VITE_HCAPTCHA_SITE_KEY?.trim() ?? ''
const siteKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (siteKey && !siteKeyPattern.test(siteKey)) {
  console.error('VITE_HCAPTCHA_SITE_KEY must be the UUID site key copied from the hCaptcha site settings.')
  process.exit(1)
}

console.log(siteKey ? 'Frontend environment valid: hCaptcha enabled.' : 'Frontend environment valid: hCaptcha disabled.')
