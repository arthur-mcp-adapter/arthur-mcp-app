import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import HelpButton from './HelpButton'

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'action.learnMore': 'Learn more',
      'action.close': 'Close',
      'label.documentation': 'Documentation',
    })[key] ?? key,
    i18n: { language: language.current },
  }),
}))

const RETRY_POLICY_REF = { en: 'How-to-Configure-Retry-Policy', ptBR: 'Como-Configurar-Retry-Policy' }
const DYNAMIC_TOOLS_REF = { en: 'Dynamic-Tools', ptBR: 'Dynamic-Tools' }

describe('HelpButton', () => {
  it('opens the dialog with the given title and content, with no docs section by default', () => {
    render(<HelpButton title="Retry policy">Explains retries.</HelpButton>)

    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }))

    expect(screen.getByText('Retry policy')).toBeInTheDocument()
    expect(screen.getByText('Explains retries.')).toBeInTheDocument()
    expect(screen.queryByText('Documentation')).not.toBeInTheDocument()
  })

  it('lists one link per docsRef, targeting the English page when the app locale is English', () => {
    language.current = 'en'
    render(
      <HelpButton title="Retry policy" docsRefs={[RETRY_POLICY_REF, DYNAMIC_TOOLS_REF]}>
        Explains retries.
      </HelpButton>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }))

    expect(screen.getByText('Documentation')).toBeInTheDocument()
    const retryLink = screen.getByRole('link', { name: 'how-to-configure-retry-policy' })
    expect(retryLink).toHaveAttribute('href', 'https://arthurmcp.io/documentation/en-how-to-configure-retry-policy/')
    expect(retryLink).toHaveAttribute('target', '_blank')
    expect(retryLink).toHaveAttribute('rel', 'noopener noreferrer')

    const toolsLink = screen.getByRole('link', { name: 'dynamic-tools' })
    expect(toolsLink).toHaveAttribute('href', 'https://arthurmcp.io/documentation/en-dynamic-tools/')
  })

  it('links the pt-BR page when the app locale is pt-BR', () => {
    language.current = 'pt-BR'
    render(
      <HelpButton title="Política de retentativa" docsRefs={[RETRY_POLICY_REF]}>
        Explica as retentativas.
      </HelpButton>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }))

    const link = screen.getByRole('link', { name: 'como-configurar-retry-policy' })
    expect(link).toHaveAttribute('href', 'https://arthurmcp.io/documentation/pt-br-como-configurar-retry-policy/')
  })

  it('renders links in the order given', () => {
    language.current = 'en'
    render(
      <HelpButton title="Retry policy" docsRefs={[RETRY_POLICY_REF, DYNAMIC_TOOLS_REF]}>
        Explains retries.
      </HelpButton>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Learn more' }))

    const links = within(screen.getByRole('dialog')).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['how-to-configure-retry-policy', 'dynamic-tools'])
  })
})
