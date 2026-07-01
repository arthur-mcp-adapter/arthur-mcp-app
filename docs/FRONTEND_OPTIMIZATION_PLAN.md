# Frontend Code Optimization Plan

**Status:** Draft  
**Date:** 2026-06-27  
**Scope:** Eliminate duplicated patterns across React pages, cards, dialogs, and hooks.

## Executive Summary

The frontend contains significant code duplication across:
- **Cards** (Prompt, Secret, Server) — 80% identical UI and interaction patterns
- **List pages** (Prompts, Secrets, Servers) — repeated search, filter, delete, CRUD workflows
- **Detail pages** (PromptDetail, SecretDetail, ServerDetail) — duplicated contextual nav setup, tab sync
- **Dialogs/Drawers** — common header, close button, action patterns
- **Common operations** — copy-to-clipboard, delete confirmation, snackbar feedback

**Target outcome:** Reduce frontend code duplication by ~35-40% while maintaining semantic clarity and type safety.

---

## Phase 1: Generic Card Component

### Problem
`PromptCard`, `SecretCard`, `ProjectCard` are 90% identical:
- Paper-based layout with hover actions
- Icon + title + description pattern
- Action buttons (copy, delete, etc.) on hover
- Similar spacing, colors, transitions

### Solution: `BaseListCard` Component

**File:** `src/components/BaseListCard.tsx`

```typescript
interface BaseListCardProps<T> {
  item: T
  title: string
  icon: ReactNode
  description?: string
  details?: ReactNode // e.g., tags, status chips
  metadata?: ReactNode // e.g., date, URL, stats
  actions: Array<{
    icon: ReactNode
    tooltip: string
    onClick: (e: React.MouseEvent) => void
    color?: 'default' | 'success' | 'error'
  }>
  onClick?: () => void
  disabled?: boolean
  opacity?: number
}

export function BaseListCard<T>({ item, title, icon, description, details, metadata, actions, onClick, disabled, opacity }: BaseListCardProps<T>)
```

### Migration Path
1. Extract `BaseListCard` component
2. Refactor `PromptCard` → uses `BaseListCard`
3. Refactor `SecretCard` → uses `BaseListCard`
4. Refactor `ProjectCard` → uses `BaseListCard`

### Effort: 4–6 hours
### Benefit: Reduce card code by ~60%, unify styling and behavior

---

## Phase 2: Generic List Page Pattern

### Problem
`Prompts.tsx`, `Secrets.tsx`, `Servers.tsx` repeat:
- Loading states and auth checks
- Search/filter state management
- Delete confirmation dialog
- Snackbar feedback
- CRUD handlers (create, edit, delete)

### Solution: `useListPageLogic` Hook

**File:** `src/hooks/useListPageLogic.ts`

```typescript
interface UseListPageLogicProps<T> {
  loadItems: () => Promise<T[]>
  deleteItem: (id: string) => Promise<void>
  permission: Permission
  onError?: (msg: string) => void
}

interface ListPageState<T> {
  items: T[]
  loading: boolean
  search: string
  deleteTarget: T | null
  deleting: boolean
  snack: { message: string; severity: 'success' | 'error' } | null
}

interface ListPageHandlers {
  setSearch: (s: string) => void
  handleDeleteRequest: (item: T) => void
  handleDeleteConfirm: () => Promise<void>
  setSnack: (s: any) => void
  openCreate: () => void
  openEdit: (item: T) => void
}

export function useListPageLogic<T>(props: UseListPageLogicProps<T>): [ListPageState<T>, ListPageHandlers]
```

### Extracted Logic
- Loading + auth checks
- Lifecycle effects
- Delete confirmation workflow
- Snackbar management
- Navigate shortcuts

### Migration Path
1. Extract `useListPageLogic` hook
2. Refactor `Prompts.tsx` → use hook (remove ~40 lines)
3. Refactor `Secrets.tsx` → use hook (remove ~40 lines)
4. Refactor `Servers.tsx` → use hook (remove ~50 lines)

### Effort: 5–7 hours
### Benefit: Remove ~130 lines of repeated boilerplate, standardize error handling

---

## Phase 3: Copy-to-Clipboard Hook

### Problem
Copy logic repeated in `Prompts.tsx`, `Secrets.tsx`, `PromptCard.tsx`, `SecretCard.tsx`:
- Manual clipboard API + try/catch
- Copied state + timeout
- Snackbar feedback integration

### Solution: `useCopyToClipboard` Hook

**File:** `src/hooks/useCopyToClipboard.ts`

```typescript
export interface UseCopyToClipboardOptions {
  feedbackDuration?: number // ms
  onError?: (err: Error) => void
}

export function useCopyToClipboard(opts?: UseCopyToClipboardOptions) {
  return {
    copied: boolean
    copy: (text: string, id?: string) => Promise<void>
    reset: () => void
  }
}
```

### Usage
```typescript
const { copy, copied } = useCopyToClipboard()
// Later:
await copy(promptContent, prompt.id)
```

### Migration Path
1. Extract `useCopyToClipboard` hook
2. Replace in `Prompts.tsx`, `PromptCard.tsx`
3. Replace in `Secrets.tsx`, `SecretCard.tsx`
4. Replace in `Prompts.tsx` (search uses this too)

### Effort: 2–3 hours
### Benefit: Remove ~50 lines, unify feedback behavior

---

## Phase 4: Consolidate Dialog/Drawer Patterns

### Problem
`UserDialog`, `RoleDrawer`, `ToolDialog`, `ChainDialog`, `DynamicResourceDialog` share:
- Drawer/Dialog wrapper with header + footer
- Close button pattern
- Save/Cancel buttons
- Error display
- Loading states

### Solution: `BaseDialogLayout` Component

**File:** `src/components/BaseDialogLayout.tsx`

```typescript
interface BaseDialogLayoutProps {
  open: boolean
  onClose: () => void
  title: string
  loading?: boolean
  error?: string
  actions?: React.ReactNode // Custom action buttons
  children: React.ReactNode
  anchor?: 'right' | 'bottom'
  width?: string | number
}

export function BaseDialogLayout({ open, onClose, title, loading, error, actions, children }: BaseDialogLayoutProps)
```

### Migration Path
1. Extract `BaseDialogLayout`
2. Refactor `UserDialog` → wrap content in `BaseDialogLayout`
3. Refactor `RoleDrawer` → wrap content in `BaseDialogLayout`
4. Refactor `ToolDialog` → wrap content in `BaseDialogLayout`

### Effort: 3–4 hours
### Benefit: Remove ~80 lines of wrapper boilerplate, unify close/save patterns

---

## Phase 5: Contextual Navigation Consolidation

### Problem
`ServerDetail.tsx`, `PromptDetail.tsx`, `SecretDetail.tsx`, `Profile.tsx` repeat:
- Manual `setServerDetail` setup with identical structure
- Manual cleanup in unmount effect
- Icon/emoji selection boilerplate

### Solution: `useDetailPageNav` Hook

**File:** `src/hooks/useDetailPageNav.ts`

```typescript
interface UseDetailPageNavProps {
  name: string
  emoji: string
  color: string
  backLabel: string
  backPath: string
  tabs: Array<{ label: string; icon: ReactNode; idx: number | string }>
  currentTab: number | string
}

export function useDetailPageNav(props: UseDetailPageNavProps) {
  // Returns: [tab state, setTab] and handles context setup + cleanup
}
```

### Usage
```typescript
const [tab, setTab] = useDetailPageNav({
  name: server.name,
  emoji: '🖧',
  color: '#5D87FF',
  backLabel: 'Servers',
  backPath: '/',
  tabs: [...],
  currentTab: tab,
})
```

### Migration Path
1. Extract `useDetailPageNav` hook
2. Refactor `ServerDetail.tsx` (remove ~30 lines)
3. Refactor `PromptDetail.tsx` (remove ~15 lines)
4. Refactor `SecretDetail.tsx` (remove ~15 lines)
5. Refactor `Profile.tsx` (remove ~25 lines)

### Effort: 2–3 hours
### Benefit: Remove ~85 lines, standardize detail page setup

---

## Phase 6: Type Consolidation

### Problem
Duplicated types across feature modules:
- `Prompt`, `Secret`, `Project` each define: id, name, description, created/updatedAt
- Multiple `*Dialog` prop interfaces with identical patterns
- Repeated handler signatures

### Solution: Shared Type Library

**File:** `src/types/common.ts`

```typescript
export interface BaseEntity {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
}

export interface ListCardProps<T> {
  item: T
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  // ...
}

export interface DialogProps<T> {
  open: boolean
  onClose: () => void
  onSaved: (item: T) => void
  // ...
}
```

### Migration Path
1. Create `src/types/common.ts`
2. Update `src/features/*/types.ts` to extend `BaseEntity` where applicable
3. Replace specific prop types with generic versions

### Effort: 2–3 hours
### Benefit: Reduce type definitions by ~40%, improve consistency

---

## Phase 7: Validation and Feedback Hook

### Problem
Repeated snackbar/alert patterns for success/error feedback:
- Manual `snackOpen`, `snackMsg`, `snackSeverity` state
- Manual handlers for each operation
- Inconsistent naming across pages

### Solution: `useAsyncFeedback` Hook

**File:** `src/hooks/useAsyncFeedback.ts`

```typescript
export function useAsyncFeedback() {
  return {
    snack: { open: boolean; message: string; severity: 'success' | 'error' }
    success: (msg: string) => void
    error: (msg: string) => void
    clear: () => void
    // Async wrapper:
    executeAsync: async (fn: () => Promise<void>, successMsg: string) => Promise<void>
  }
}
```

### Migration Path
1. Extract `useAsyncFeedback` hook
2. Replace feedback state in `Prompts.tsx`, `Secrets.tsx`, `Servers.tsx`
3. Replace in detail pages

### Effort: 2–3 hours
### Benefit: Remove ~60 lines, standardize error UX

---

## Implementation Timeline

| Phase | Component | Hours | Priority |
|-------|-----------|-------|----------|
| 1 | `BaseListCard` | 4–6 | High |
| 2 | `useListPageLogic` | 5–7 | High |
| 3 | `useCopyToClipboard` | 2–3 | Medium |
| 4 | `BaseDialogLayout` | 3–4 | Medium |
| 5 | `useDetailPageNav` | 2–3 | Medium |
| 6 | Type consolidation | 2–3 | Low |
| 7 | `useAsyncFeedback` | 2–3 | Low |
| **Total** | | **22–29 hours** | — |

---

## Execution Strategy

### High-Priority (Phases 1–2): ~10–13 hours
- Start with `BaseListCard` (most visible reuse)
- Move to `useListPageLogic` (biggest boilerplate saving)
- Migrate 3 list pages + 3 cards simultaneously
- Validate with `npm run type-check` + `npm test` after each page

### Medium-Priority (Phases 3–5): ~7–10 hours
- Extract utility hooks incrementally
- Refactor detail pages one-by-one
- Test navigation context changes in browser

### Low-Priority (Phases 6–7): ~5–6 hours
- Type consolidation can be done gradually
- Feedback hook can be added as optional refactor

---

## Risk Mitigation

- **Risk:** Breaking existing functionality during card refactor.
  - **Mitigation:** Keep original cards during transition, route through new component, validate with visual regression.

- **Risk:** Hook interface mismatch across pages.
  - **Mitigation:** Start with one page, finalize hook API, then apply to others.

- **Risk:** Type changes causing TypeScript errors.
  - **Mitigation:** Extend existing types instead of replacing; test with `npm run type-check`.

---

## Success Criteria

✅ Reduce frontend code by 800–1200 lines (~35–40%)  
✅ All pages compile cleanly with `npm run type-check`  
✅ Visual/functional behavior identical before/after refactor  
✅ New patterns documented and used consistently  
✅ Test coverage maintained or improved  

---

## Next Steps

1. **Approval:** Review this plan with the team.
2. **Spike:** Create `BaseListCard` as proof-of-concept.
3. **Execution:** Tackle High-Priority phases first.
4. **Documentation:** Update developer guide with new component/hook patterns.
