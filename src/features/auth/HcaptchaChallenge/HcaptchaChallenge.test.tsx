import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const resetCaptcha = vi.hoisted(() => vi.fn())

vi.mock('@hcaptcha/react-hcaptcha', async () => {
  const React = await import('react')

  return {
    default: React.forwardRef(function MockHCaptcha(
      props: { onVerify: (token: string) => void; onExpire: () => void; onError: () => void },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ resetCaptcha }))
      return (
        <div>
          <button type="button" onClick={() => props.onVerify('verified-token')}>Verify</button>
          <button type="button" onClick={props.onExpire}>Expire</button>
          <button type="button" onClick={props.onError}>Error</button>
        </div>
      )
    }),
  }
})

describe('HcaptchaChallenge', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_HCAPTCHA_SITE_KEY', 'site-key')
    resetCaptcha.mockClear()
  })

  it('reports verified and invalidated tokens and resets on request', async () => {
    const { HcaptchaChallenge } = await import('./HcaptchaChallenge')
    const onTokenChange = vi.fn()
    const { rerender } = render(<HcaptchaChallenge onTokenChange={onTokenChange} resetKey={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expire' }))
    fireEvent.click(screen.getByRole('button', { name: 'Error' }))

    expect(onTokenChange.mock.calls).toEqual([['verified-token'], [null], [null]])

    rerender(<HcaptchaChallenge onTokenChange={onTokenChange} resetKey={1} />)
    expect(resetCaptcha).toHaveBeenCalledOnce()
  })
})
