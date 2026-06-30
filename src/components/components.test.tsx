import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconCheck, IconTrash } from '@tabler/icons-react'
import AppSnackbar from './atoms/AppSnackbar'
import { CodePreviewTabs } from './atoms/CodePreviewTabs'
import HelpButton from './atoms/HelpButton'
import { SaveIndicator } from './atoms/SaveIndicator'
import { BaseListCard } from './organisms/BaseListCard'
import ConfirmDialog from './organisms/ConfirmDialog'
import { BaseDialogLayout } from './templates/BaseDialogLayout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'action.cancel': 'Cancel',
      'action.close': 'Close',
      'action.code': 'Code',
      'action.confirm': 'Confirm',
      'action.learnMore': 'Learn more',
      'action.loading': 'Loading',
      'action.preview': 'Preview',
      'action.saved': 'Saved',
      'action.saving': 'Saving',
      'error.saveFailed': 'Save failed',
    }[key] ?? key),
  }),
}))

describe('shared components', () => {
  it('renders snackbar messages and forwards close events', () => {
    const onClose = vi.fn()
    render(<AppSnackbar open message="Saved" severity="success" onClose={onClose} />)

    expect(screen.getByText('Saved')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('switches between code and preview tabs', async () => {
    const user = userEvent.setup()
    render(<CodePreviewTabs codeContent={<div>curl command</div>} previewContent={<div>rendered preview</div>} />)

    expect(screen.getByText('curl command')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByText('rendered preview')).toBeInTheDocument()
    expect(screen.queryByText('curl command')).not.toBeInTheDocument()
  })

  it('opens and closes help content', async () => {
    const user = userEvent.setup()
    render(<HelpButton title="Server help"><p>Detailed help text</p></HelpButton>)

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Server help')).toBeInTheDocument()
    expect(screen.getByText('Detailed help text')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('renders save indicator states', () => {
    const { rerender } = render(<SaveIndicator status="idle" />)
    expect(screen.queryByText('Saving')).not.toBeInTheDocument()

    rerender(<SaveIndicator status="saving" />)
    expect(screen.getByText('Saving')).toBeInTheDocument()

    rerender(<SaveIndicator status="saved" />)
    expect(screen.getByText('Saved')).toBeInTheDocument()

    rerender(<SaveIndicator status="error" error="Custom save error" />)
    expect(screen.getByText('Custom save error')).toBeInTheDocument()

    rerender(<SaveIndicator status="error" />)
    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })

  it('renders list card content and stops action clicks from triggering card click', async () => {
    const user = userEvent.setup()
    const onCardClick = vi.fn()
    const onActionClick = vi.fn()

    render(
      <BaseListCard
        icon={<IconCheck data-testid="card-icon" />}
        title="Project API"
        description="Project description"
        content={<span>Custom content</span>}
        footer={<span>Updated today</span>}
        onClick={onCardClick}
        actions={[{ icon: <IconTrash />, tooltip: 'Delete project', onClick: onActionClick, color: 'error' }]}
      />,
    )

    expect(screen.getByText('Project API')).toBeInTheDocument()
    expect(screen.getByText('Project description')).toBeInTheDocument()
    expect(screen.getByText('Custom content')).toBeInTheDocument()
    expect(screen.getByText('Updated today')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Delete project'))
    expect(onActionClick).toHaveBeenCalledTimes(1)
    expect(onCardClick).not.toHaveBeenCalled()

    await user.click(screen.getByText('Project API'))
    expect(onCardClick).toHaveBeenCalledTimes(1)
  })

  it('does not call disabled list card click handlers', async () => {
    const user = userEvent.setup()
    const onCardClick = vi.fn()
    render(<BaseListCard icon={<IconCheck />} title="Disabled" actions={[]} onClick={onCardClick} disabled />)

    await user.click(screen.getByText('Disabled'))
    expect(onCardClick).not.toHaveBeenCalled()
  })

  it('confirms and cancels dialog actions', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    const { rerender } = render(
      <ConfirmDialog open title="Delete item" message="This cannot be undone" onClose={onClose} onConfirm={onConfirm} confirmColor="error" />,
    )

    expect(screen.getByText('Delete item')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<ConfirmDialog open title="Wait" message="Loading now" onClose={onClose} onConfirm={onConfirm} loading />)
    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('renders drawer layout with optional regions and closes from the icon button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <BaseDialogLayout
        open
        onClose={onClose}
        title="Drawer title"
        titleIcon={<IconCheck />}
        description="Drawer description"
        footer={<button>Footer action</button>}
      >
        Drawer body
      </BaseDialogLayout>,
    )

    expect(screen.getByText('Drawer title')).toBeInTheDocument()
    expect(screen.getByText('Drawer description')).toBeInTheDocument()
    expect(screen.getByText('Drawer body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Footer action' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
