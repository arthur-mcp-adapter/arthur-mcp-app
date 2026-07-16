import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signUp = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock('../../supabaseClient', () => ({ supabase: { auth: { signUp } } }))
vi.mock('../../features/auth', () => ({
  hcaptchaConfigured: true,
  HcaptchaChallenge: ({ onTokenChange }: { onTokenChange: (token: string) => void }) => (
    <button type="button" onClick={() => onTokenChange('signup-captcha')}>Complete CAPTCHA</button>
  ),
}))
vi.mock('../../components/organisms/SocialAuthButtons', () => ({ default: () => null }))
vi.mock('../../theme', () => ({ useColorMode: () => ({ mode: 'light' }), ColorMode: { Dark: 'dark' } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

import Signup from '.'

describe('Signup CAPTCHA', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the hCaptcha token to Supabase signup', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<Signup />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('label.username'), { target: { value: 'arthur' } })
    fireEvent.change(screen.getByLabelText('label.email'), { target: { value: 'arthur@example.com' } })
    fireEvent.change(screen.getByLabelText('label.password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'action.signUp' }))

    await waitFor(() => expect(signUp).toHaveBeenCalledWith({
      email: 'arthur@example.com',
      password: 'password123',
      options: {
        data: { username: 'arthur' },
        emailRedirectTo: 'http://localhost:3000/oauth-callback',
        captchaToken: 'signup-captcha',
      },
    }))
  })
})
