import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resetPasswordForEmail = vi.hoisted(() => vi.fn())

vi.mock('../../supabaseClient', () => ({ supabase: { auth: { resetPasswordForEmail } } }))
vi.mock('../../features/auth', () => ({
  hcaptchaConfigured: true,
  HcaptchaChallenge: ({ onTokenChange }: { onTokenChange: (token: string) => void }) => (
    <button type="button" onClick={() => onTokenChange('recovery-captcha')}>Complete CAPTCHA</button>
  ),
}))
vi.mock('../../theme', () => ({ useColorMode: () => ({ mode: 'light' }), ColorMode: { Dark: 'dark' } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

import ForgotPassword from '.'

describe('Forgot password CAPTCHA', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the hCaptcha token to Supabase password recovery', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotPassword />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('label.email'), { target: { value: 'arthur@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete CAPTCHA' }))
    fireEvent.click(screen.getByRole('button', { name: 'action.sendInstructions' }))

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'arthur@example.com',
      {
        redirectTo: 'http://localhost:3000/reset-password',
        captchaToken: 'recovery-captcha',
      },
    ))
  })
})
