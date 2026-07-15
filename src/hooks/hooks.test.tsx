import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useAsyncFeedback } from './useAsyncFeedback.hook'
import { useCopyToClipboard } from './useCopyToClipboard.hook'
import { useDetailPageNav } from './useDetailPageNav.hook'
import { useListPageLogic } from './useListPageLogic.hook'
import { Permission } from '../context/auth'

const authState = vi.hoisted(() => ({
  can: vi.fn(() => true),
  loading: false,
}))

const serverNavState = vi.hoisted(() => ({
  setServerDetail: vi.fn(),
}))

vi.mock('../api', () => ({
  default: {},
}))

vi.mock('../context/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/auth')>()
  return {
    ...actual,
    useAuth: () => ({ can: authState.can, loading: authState.loading }),
  }
})

vi.mock('../context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context')>()
  return {
    ...actual,
    useServerNav: () => ({ serverDetail: null, setServerDetail: serverNavState.setServerDetail }),
  }
})

describe('shared hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.can.mockReturnValue(true)
    authState.loading = false
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('manages async feedback state', () => {
    const { result } = renderHook(() => useAsyncFeedback())

    expect(result.current.feedback).toEqual({ open: false, message: '', severity: 'success' })
    act(() => result.current.showFeedback('Saved'))
    expect(result.current.feedback).toEqual({ open: true, message: 'Saved', severity: 'success' })

    act(() => result.current.showFeedback('Failed', 'error'))
    expect(result.current.feedback).toEqual({ open: true, message: 'Failed', severity: 'error' })

    act(() => result.current.clearFeedback())
    expect(result.current.feedback).toEqual({ open: false, message: 'Failed', severity: 'error' })
  })

  it('copies text and clears copied state after timeout', async () => {
    vi.useFakeTimers()
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCopyToClipboard({ onSuccess, successMessage: 'Copied', timeout: 100 }))

    await act(async () => {
      await result.current.copy('secret', 'row-1')
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret')
    expect(result.current.copiedId).toBe('row-1')
    expect(onSuccess).toHaveBeenCalledWith('Copied')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current.copiedId).toBeNull()
  })

  it('shows copy feedback on clipboard failure', async () => {
    const onError = vi.fn()
    ;(navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'))
    const { result } = renderHook(() => useCopyToClipboard({ onError, errorMessage: 'No copy', timeout: 0 }))

    await act(async () => {
      await result.current.copy('secret')
    })

    expect(result.current.feedback).toEqual({ open: true, message: 'No copy', severity: 'error' })
    expect(onError).toHaveBeenCalledWith('No copy')

    act(() => result.current.clearFeedback())
    expect(result.current.feedback.open).toBe(false)
  })

  it('copies values loaded asynchronously', async () => {
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 0 }))

    await act(async () => {
      await result.current.copyAsync(
        async () => ({ value: 'loaded' }),
        (data) => data.value,
        'async-row',
      )
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('loaded')
    expect(result.current.copiedId).toBe('async-row')

    act(() => result.current.clearCopied())
    expect(result.current.copiedId).toBeNull()
  })

  it('sets and clears detail page navigation', () => {
    function Harness() {
      useDetailPageNav(
        () => ({
          name: 'Server',
          sourceEmoji: 'S',
          sourceColor: '#000',
          navItems: [{ label: 'Overview', icon: <span>icon</span>, idx: 0 }],
          tab: 0,
          onTabChange: vi.fn(),
        }),
        [],
      )
      return <div>mounted</div>
    }

    const { unmount } = render(<Harness />)
    expect(serverNavState.setServerDetail).toHaveBeenCalledWith(expect.objectContaining({ name: 'Server' }))
    unmount()
    expect(serverNavState.setServerDetail).toHaveBeenLastCalledWith(null)
  })

  it('does not set detail page navigation when builder returns null', () => {
    function Harness() {
      useDetailPageNav(() => null, [])
      return <div>mounted</div>
    }

    render(<Harness />)
    expect(serverNavState.setServerDetail).not.toHaveBeenCalledWith(expect.objectContaining({ name: expect.anything() }))
  })

  it('loads list items when auth is ready and permission is granted', async () => {
    const loadItems = vi.fn().mockResolvedValue([{ id: 'one', name: 'One' }])
    const deleteItem = vi.fn()

    const { result } = renderHook(() => useListPageLogic({ loadItems, deleteItem, permission: Permission.ServersView }))

    await waitFor(() => expect(result.current[0].loading).toBe(false))
    expect(result.current[0].items).toEqual([{ id: 'one', name: 'One' }])
    expect(loadItems).toHaveBeenCalledTimes(1)

    act(() => result.current[1].setSearch('one'))
    expect(result.current[0].search).toBe('one')
  })

  it('skips list loading when permission is denied', async () => {
    authState.can.mockReturnValue(false)
    const loadItems = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() => useListPageLogic({ loadItems, deleteItem: vi.fn(), permission: Permission.ServersView }))

    await waitFor(() => expect(result.current[0].loading).toBe(false))
    expect(loadItems).not.toHaveBeenCalled()
  })

  it('reports list loading failures', async () => {
    const { result } = renderHook(() => useListPageLogic({
      loadItems: vi.fn().mockRejectedValue(new Error('bad')),
      deleteItem: vi.fn(),
      permission: Permission.ServersView,
    }))

    await waitFor(() => expect(result.current[0].snack).toEqual({ message: 'error.loadFailed', severity: 'error' }))
  })

  it('deletes selected list items and reports success', async () => {
    const onItemDeleted = vi.fn()
    const deleteItem = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useListPageLogic({
      loadItems: vi.fn().mockResolvedValue([{ id: 'one' }, { id: 'two' }]),
      deleteItem,
      permission: Permission.ServersView,
      onItemDeleted,
    }))

    await waitFor(() => expect(result.current[0].items).toHaveLength(2))
    act(() => result.current[1].handleDeleteRequest({ id: 'one' }))
    expect(result.current[0].deleteTarget).toEqual({ id: 'one' })

    await act(async () => {
      await result.current[1].handleDeleteConfirm()
    })

    expect(deleteItem).toHaveBeenCalledWith('one')
    expect(result.current[0].items).toEqual([{ id: 'two' }])
    expect(result.current[0].snack).toEqual({ message: 'toast.deleted', severity: 'success' })
    expect(onItemDeleted).toHaveBeenCalledWith({ id: 'one' })
  })

  it('cancels and reports failed list deletes', async () => {
    const { result } = renderHook(() => useListPageLogic({
      loadItems: vi.fn().mockResolvedValue([{ _id: 'one' }]),
      deleteItem: vi.fn().mockRejectedValue(new Error('bad')),
      permission: Permission.ServersView,
      getItemId: (item: { _id: string }) => item._id,
    }))

    await waitFor(() => expect(result.current[0].items).toHaveLength(1))
    act(() => result.current[1].handleDeleteRequest({ _id: 'one' }))
    act(() => result.current[1].handleDeleteCancel())
    expect(result.current[0].deleteTarget).toBeNull()

    await act(async () => {
      await result.current[1].handleDeleteConfirm()
    })
    expect(result.current[0].snack).toBeNull()

    act(() => result.current[1].handleDeleteRequest({ _id: 'one' }))
    await act(async () => {
      await result.current[1].handleDeleteConfirm()
    })
    expect(result.current[0].snack).toEqual({ message: 'error.deleteFailed', severity: 'error' })
  })
})
