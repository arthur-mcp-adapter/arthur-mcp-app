import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconUser,
  IconUsers,
  IconShield,
  IconLock,
  IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth, Permission } from '../../context/auth'
import { useDetailPageNav } from '../../hooks'
import { useAsyncFeedback } from '../../hooks'
import { ConfirmDialog } from '../../components'
import { AppSnackbar } from '../../components'
import { avatarLetter, avatarColor } from '../../utils/avatar'
import type { UserProfile } from './userProfile.interface'
import type { RolePermissions } from './rolePermissions.interface'
import type { Role } from './role.interface'
import type { UserDialogProps } from './userDialogProps.interface'
import type { MyProfileTabProps } from './myProfileTabProps.interface'
import type { UsersTabProps } from './usersTabProps.interface'
import type { RoleDrawerProps } from './roleDrawerProps.interface'
import { PERMISSION_GROUPS } from './constants/permissionGroups.constant'
import { ALL_OFF } from './constants/allOff.constant'
import { BUILTIN_ROLES } from './constants/builtinRoles.constant'
import { emptyPermissions } from './utils/emptyPermissions.util'
import { permissionCount } from './utils/permissionCount.util'



function UserDialog({ open, onClose, onSaved, editUser, onDeleted, canDelete, currentUserId }: UserDialogProps) {
  const { t } = useTranslation('profile')
  const isEdit = !!editUser
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    api.get<Role[]>('/roles')
      .then((r) => {
        const dynamic = r.data.map((role) => ({
          value: role.name.toLowerCase().replace(/\s+/g, '_'),
          label: role.name,
        }))
        setAvailableRoles([
          { value: 'admin', label: t('userDialog.roleAdmin') },
          { value: 'developer', label: t('userDialog.roleDeveloper') },
          { value: 'editor', label: t('userDialog.roleEditor') },
          { value: 'viewer', label: t('userDialog.roleViewer') },
          ...dynamic,
        ])
      })
      .catch(() => {
        setAvailableRoles([
          { value: 'admin', label: t('userDialog.roleAdmin') },
          { value: 'developer', label: t('userDialog.roleDeveloper') },
          { value: 'editor', label: t('userDialog.roleEditor') },
          { value: 'viewer', label: t('userDialog.roleViewer') },
        ])
      })
  }, [])

  useEffect(() => {
    if (open) {
      setUsername(editUser?.username ?? '')
      setEmail(editUser?.email ?? '')
      setPassword('')
      setRole(editUser?.role ?? 'viewer')
      setError('')
    }
  }, [open, editUser])

  const handleSave = async () => {
    if (!username.trim()) { setError(t('userDialog.usernameRequired')); return }
    if (!email.trim()) { setError(t('userDialog.emailRequired')); return }
    if (!isEdit && !password.trim()) { setError(t('userDialog.passwordRequired')); return }

    setSaving(true); setError('')
    try {
      let res: { data: UserProfile }
      if (isEdit) {
        const dto: Record<string, unknown> = { username, email, role }
        if (password.trim()) dto.password = password
        res = await api.patch(`/users/${editUser!._id}`, dto)
      } else {
        res = await api.post('/users', { username, email, password, role })
      }
      onSaved(res.data)
      onClose()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('userDialog.saveError')
        : t('userDialog.saveError')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!editUser) return
    setDeleting(true)
    try {
      await api.delete(`/users/${editUser._id}`)
      onDeleted?.(editUser._id)
      setDeleteConfirmOpen(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const isSelf = editUser?._id === currentUserId

  return (
    <>
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 560 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>
          {isEdit ? t('userDialog.editTitle') : t('userDialog.newTitle')}
        </Typography>
        <Tooltip title={t('userDialog.closeTooltip')}>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
          <TextField size="small" fullWidth required autoFocus label={t('userDialog.usernameLabel')}
            value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} />
          <TextField size="small" fullWidth required label={t('userDialog.emailLabel')} type="email"
            value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />
          <TextField size="small" fullWidth
            label={isEdit ? t('userDialog.passwordChangeLabel') : t('userDialog.passwordLabel')}
            type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
          <FormControl size="small" fullWidth>
            <InputLabel>{t('userDialog.roleLabel')}</InputLabel>
            <Select value={role} label={t('userDialog.roleLabel')} onChange={(e) => setRole(e.target.value)}>
              {availableRoles.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        {isEdit && canDelete && !isSelf && (
          <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}
            startIcon={<IconTrash size={18} />} sx={{ mr: 'auto' }}>
            {t('userDialog.deleteUser')}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving || deleting}>{t('userDialog.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || deleting}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? t('userDialog.saving') : isEdit ? t('userDialog.save') : t('userDialog.createUser')}
        </Button>
      </Box>
    </Drawer>

    <ConfirmDialog
      open={deleteConfirmOpen}
      title={t('userDialog.deleteConfirmTitle', { username: editUser?.username })}
      message={t('userDialog.deleteConfirmMessage')}
      confirmLabel={t('userDialog.delete')} confirmColor="error" loading={deleting}
      onConfirm={handleDeleteConfirm}
      onClose={() => setDeleteConfirmOpen(false)}
    />
    </>
  )
}

// ─── My profile tab ───────────────────────────────────────────────────────────

function MyProfileTab({ me, onUpdated }: MyProfileTabProps) {
  const { t } = useTranslation('profile')
  const [username, setUsername] = useState(me.username)
  const [email, setEmail] = useState(me.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const { feedback, showFeedback, clearFeedback } = useAsyncFeedback()

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      showFeedback(t('myProfile.passwordMatchError'), 'error'); return
    }
    if (newPassword && !currentPassword) {
      showFeedback(t('myProfile.currentPasswordRequired'), 'error'); return
    }

    setSaving(true)
    try {
      const dto: Record<string, unknown> = {}
      if (username !== me.username) dto.username = username
      if (email !== me.email) dto.email = email
      if (newPassword) { dto.currentPassword = currentPassword; dto.newPassword = newPassword }

      if (Object.keys(dto).length === 0) { showFeedback(t('myProfile.noChanges'), 'error'); return }

      const res = await api.patch<UserProfile>('/users/me', dto)
      onUpdated(res.data)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      showFeedback(t('myProfile.saveSuccess'), 'success')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('myProfile.saveError')
        : t('myProfile.saveError')
      showFeedback(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: '1.5rem', bgcolor: avatarColor(me.username), fontWeight: 700 }}>
          {avatarLetter(me.username)}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>{me.username}</Typography>
          <Typography variant="body2" color="text.secondary">{me.email}</Typography>
          <Chip
            label={me.role === 'admin' ? t('userDialog.roleAdmin') : me.role.charAt(0).toUpperCase() + me.role.slice(1)}
            size="small"
            color={me.role === 'admin' ? 'primary' : 'default'}
            sx={{ mt: 0.5, height: 22 }}
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Divider textAlign="left" sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">{t('myProfile.accountInfo')}</Typography>
          </Divider>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label={t('myProfile.usernameLabel')} value={username}
                onChange={(e) => setUsername(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label={t('myProfile.emailLabel')} type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Divider textAlign="left" sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">{t('myProfile.changePassword')}</Typography>
          </Divider>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label={t('myProfile.currentPasswordLabel')} type="password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label={t('myProfile.newPasswordLabel')} type="password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label={t('myProfile.confirmPasswordLabel')} type="password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!newPassword && !!confirmPassword && newPassword !== confirmPassword}
                helperText={newPassword && confirmPassword && newPassword !== confirmPassword
                  ? t('myProfile.passwordMismatchHelper') : ''} />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Button size="small" variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? t('myProfile.saving') : t('myProfile.saveChanges')}
          </Button>
        </Grid>
      </Grid>

      <AppSnackbar open={feedback.open} message={feedback.message} severity={feedback.severity} onClose={clearFeedback} />
    </Box>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ currentUserId }: UsersTabProps) {
  const { t } = useTranslation('profile')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>()
  const { can } = useAuth()
  const { feedback, showFeedback, clearFeedback } = useAsyncFeedback()

  const load = () => {
    setLoading(true)
    api.get<UserProfile[]>('/users')
      .then((r) => setUsers(r.data))
      .catch(() => setError(t('users.loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSaved = (user: UserProfile) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u._id === user._id)
      if (idx >= 0) { const next = [...prev]; next[idx] = user; return next }
      return [...prev, user]
    })
  }

  const handleDeleted = (id: string) => {
    setUsers((prev) => prev.filter((u) => u._id !== id))
    setDialogOpen(false)
    showFeedback(t('users.deleteSuccess'), 'success')
  }

  const handleOpenCreate = () => { setEditingUser(undefined); setDialogOpen(true) }
  const handleOpenEdit = (user: UserProfile) => { setEditingUser(user); setDialogOpen(true) }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
  if (error) return (
    <Box py={8} textAlign="center">
      <Typography color="text.secondary">{error}</Typography>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          {users.length === 1 ? t('users.countSingular') : t('users.countPlural', { count: users.length })}
        </Typography>
        {can(Permission.UsersInvite) && (
          <Button variant="contained" startIcon={<IconPlus size={18} />} size="small" onClick={handleOpenCreate}>
            {t('users.newUser')}
          </Button>
        )}
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('users.columns.user')}</TableCell>
              <TableCell>{t('users.columns.email')}</TableCell>
              <TableCell>{t('users.columns.role')}</TableCell>
              <TableCell>{t('users.columns.created')}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: avatarColor(u.username), fontWeight: 700 }}>
                      {avatarLetter(u.username)}
                    </Avatar>
                    <Typography fontSize="0.875rem" fontWeight={500}>{u.username}</Typography>
                    {u._id === currentUserId && (
                      <Chip label={t('users.you')} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell><Typography fontSize="0.82rem" color="text.secondary">{u.email}</Typography></TableCell>
                <TableCell>
                  <Chip
                    label={u.role.charAt(0).toUpperCase() + u.role.slice(1).replace(/_/g, ' ')}
                    size="small"
                    color={u.role === 'admin' ? 'primary' : u.role === 'developer' ? 'secondary' : 'default'}
                    sx={{ fontSize: '0.72rem', height: 22 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.78rem" color="text.secondary">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {can(Permission.UsersEdit) && (
                    <Tooltip title={t('users.editTooltip')}>
                      <IconButton size="small" onClick={() => handleOpenEdit(u)}><IconEdit size={16} /></IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        editUser={editingUser}
        onDeleted={handleDeleted}
        canDelete={can(Permission.UsersDelete)}
        currentUserId={currentUserId}
      />

      <AppSnackbar open={feedback.open} message={feedback.message} severity={feedback.severity} onClose={clearFeedback} />
    </Box>
  )
}

// ─── Role drawer ──────────────────────────────────────────────────────────────

function RoleDrawer({
  open, onClose, onSaved, editRole,
}: RoleDrawerProps) {
  const { t } = useTranslation('profile')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>(emptyPermissions())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { feedback, showFeedback, clearFeedback } = useAsyncFeedback()

  useEffect(() => {
    if (open) {
      setName(editRole?.name ?? '')
      setDescription(editRole?.description ?? '')
      setPermissions(editRole?.permissions ?? emptyPermissions())
      setError('')
    }
  }, [open, editRole])

  const toggle = (key: keyof RolePermissions) =>
    setPermissions((p) => ({ ...p, [key]: !p[key] }))

  const toggleGroup = (keys: (keyof RolePermissions)[]) =>
    setPermissions((p) => {
      const allOn = keys.every((k) => p[k])
      const patch = Object.fromEntries(keys.map((k) => [k, !allOn])) as Partial<RolePermissions>
      return { ...p, ...patch }
    })

  const toggleAll = () =>
    setPermissions((p) => {
      const allKeys = PERMISSION_GROUPS.flatMap((g) => g.keys)
      const allOn = allKeys.every((k) => p[k])
      return Object.fromEntries(Object.keys(p).map((k) => [k, !allOn])) as unknown as RolePermissions
    })

  const allKeys = PERMISSION_GROUPS.flatMap((g) => g.keys)
  const allOn = allKeys.every((k) => permissions[k])

  const handleSave = async () => {
    if (!name.trim()) { setError(t('roleDrawer.nameRequired')); return }
    setSaving(true); setError('')
    try {
      const dto = { name: name.trim(), description: description.trim() || undefined, permissions }
      let role: Role
      if (editRole) {
        const { data } = await api.patch<Role>(`/roles/${editRole._id}`, dto)
        role = { ...data, _id: data._id ?? data.id ?? '', builtin: false }
      } else {
        const { data } = await api.post<Role>('/roles', dto)
        role = { ...data, _id: data._id ?? data.id ?? '', builtin: false }
      }
      onSaved(role)
      onClose()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('roleDrawer.saveError')
        : t('roleDrawer.saveError')
      showFeedback(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 560 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>
          {editRole ? t('roleDrawer.editTitle') : t('roleDrawer.newTitle')}
        </Typography>
        <Tooltip title={t('roleDrawer.closeTooltip')}>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <AppSnackbar open={feedback.open} message={feedback.message} severity={feedback.severity} onClose={clearFeedback} />

        <Box display="flex" flexDirection="column" gap={2}>
          <TextField size="small" fullWidth required autoFocus label={t('roleDrawer.nameLabel')}
            value={name} onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder={t('roleDrawer.namePlaceholder')} />
          <TextField size="small" fullWidth multiline minRows={4} label={t('roleDrawer.descriptionLabel')}
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t('roleDrawer.descriptionPlaceholder')} />
        </Box>

        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle2" fontWeight={700}>{t('roleDrawer.permissionsTitle')}</Typography>
            <FormControlLabel
              control={<Switch size="small" checked={allOn} onChange={toggleAll} />}
              label={<Typography fontSize="0.8rem" color="text.secondary">{t('roleDrawer.selectAll')}</Typography>}
              sx={{ mr: 0 }}
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={0}>
            {PERMISSION_GROUPS.map((group, gi) => {
              const groupAllOn = group.keys.every((k) => permissions[k])
              return (
                <Box key={group.label}>
                  {gi > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t(`permissionGroups.${group.label}`, { defaultValue: group.label })}
                    </Typography>
                    <FormControlLabel
                      control={<Switch size="small" checked={groupAllOn} onChange={() => toggleGroup(group.keys)} />}
                      label={<Typography fontSize="0.75rem" color="text.secondary">{t('roleDrawer.all')}</Typography>}
                      sx={{ mr: 0 }}
                    />
                  </Box>
                  {group.keys.map((key) => (
                    <FormControlLabel
                      key={key}
                      control={<Switch size="small" checked={permissions[key]} onChange={() => toggle(key)} />}
                      label={<Typography fontSize="0.875rem">{t(`permissions.${key}`)}</Typography>}
                      sx={{ display: 'flex', alignItems: 'center', mb: 0.25, ml: 0 }}
                    />
                  ))}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button onClick={onClose} disabled={saving}>{t('roleDrawer.cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? t('roleDrawer.saving') : editRole ? t('roleDrawer.save') : t('roleDrawer.create')}
        </Button>
      </Box>
    </Drawer>
  )
}

// ─── Roles tab ─────────────────────────────────────────────────────────────────

function RolesTab() {
  const { t } = useTranslation('profile')
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { can } = useAuth()
  const { feedback, showFeedback, clearFeedback } = useAsyncFeedback()

  useEffect(() => {
    api.get<Role[]>('/roles')
      .then((r) => {
        const normalized = r.data.map((role) => ({
          ...role,
          _id: role._id ?? role.id ?? '',
          builtin: false,
        }))
        setRoles([...BUILTIN_ROLES, ...normalized])
      })
      .catch(() => setRoles(BUILTIN_ROLES))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (role: Role) => {
    setRoles((prev) => {
      const idx = prev.findIndex((r) => r._id === role._id)
      if (idx >= 0) { const next = [...prev]; next[idx] = role; return next }
      return [...prev, role]
    })
    showFeedback(editRole ? t('roles.roleUpdated') : t('roles.roleCreated'), 'success')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/roles/${deleteTarget._id}`)
      setRoles((prev) => prev.filter((r) => r._id !== deleteTarget._id))
      showFeedback(t('roles.roleDeleted'), 'success')
    } catch {
      showFeedback(t('roles.roleDeleteFailed'), 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const totalPermissions = Object.keys(emptyPermissions()).length

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  const staticRoles = roles.filter((r) => r.builtin)
  const dynamicRoles = roles.filter((r) => !r.builtin)

  const renderRoleCard = (role: Role) => {
    const isDynamic = !role.builtin
    const allPermKeys = PERMISSION_GROUPS.flatMap((g) => g.keys)
    const count = permissionCount(role.permissions)
    const builtinDescription = role.builtin ? t(`builtinRoles.${role._id}`) : undefined
    const displayDescription = builtinDescription || role.description
    return (
      <Paper key={role._id} variant="outlined" sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="flex-start" gap={1.5}>
          <Box sx={{ color: isDynamic ? 'secondary.main' : 'primary.main', mt: 0.25, flexShrink: 0 }}>
            {isDynamic ? <IconShield size={18} /> : <IconLock size={18} />}
          </Box>
          <Box flexGrow={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography fontWeight={700} fontSize="0.925rem">{role.name}</Typography>
              <Chip
                label={t('roles.permissions', { count, total: totalPermissions })}
                size="small"
                color={count === totalPermissions ? 'primary' : 'default'}
                sx={{ fontSize: '0.65rem', height: 18, borderRadius: '4px' }}
              />
            </Box>
            {displayDescription && (
              <Typography variant="body2" color="text.secondary" mb={1.5}>{displayDescription}</Typography>
            )}
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {allPermKeys.map((k) => {
                if (!role.permissions[k]) return null
                return (
                  <Chip key={k} label={t(`permissions.${k}`)} size="small" variant="outlined"
                    sx={{ fontSize: '0.67rem', height: 20, borderRadius: '4px' }} />
                )
              })}
            </Box>
          </Box>
          {isDynamic && can(Permission.RolesManage) && (
            <Box display="flex" gap={0.5} flexShrink={0}>
              <Tooltip title={t('roles.editTooltip')}>
                <IconButton size="small" onClick={() => { setEditRole(role); setDrawerOpen(true) }}>
                  <IconEdit size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('roles.deleteTooltip')}>
                <IconButton size="small" color="error" onClick={() => setDeleteTarget(role)}>
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Paper>
    )
  }

  return (
    <Box>
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <IconLock size={16} />
          <Typography variant="subtitle2" fontWeight={700}>{t('roles.builtinTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('roles.builtinSubtitle')}</Typography>
        </Box>
        <Box display="flex" flexDirection="column" gap={1.5}>
          {staticRoles.map(renderRoleCard)}
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconShield size={16} />
            <Typography variant="subtitle2" fontWeight={700}>{t('roles.customTitle')}</Typography>
          </Box>
          {can(Permission.RolesManage) && (
            <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
              onClick={() => { setEditRole(undefined); setDrawerOpen(true) }}>
              {t('roles.newRole')}
            </Button>
          )}
        </Box>
        {dynamicRoles.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography color="text.secondary" variant="body2">{t('roles.noCustomRoles')}</Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {dynamicRoles.map(renderRoleCard)}
          </Box>
        )}
      </Box>

      <RoleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        editRole={editRole}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('roles.deleteConfirmTitle', { name: deleteTarget?.name })}
        message={t('roles.deleteConfirmMessage')}
        confirmLabel={t('roles.delete')}
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      <AppSnackbar
        open={feedback.open}
        message={feedback.message}
        severity={feedback.severity}
        onClose={clearFeedback}
      />
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { t } = useTranslation('profile')
  const [me, setMe] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'profile' | 'users' | 'roles'>('profile')
  const { can, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    api.get<UserProfile>('/users/me')
      .then((r) => setMe(r.data))
      .finally(() => setLoading(false))
  }, [authLoading])

  useDetailPageNav(() => {
    if (!me) return null

    return {
      name: me.username,
      sourceEmoji: '👤',
      sourceColor: '#5D87FF',
      backLabel: t('nav.backLabel'),
      backPath: '/',
      navItems: [
        { label: t('tabs.myProfile'), icon: <IconUser size={17} />, idx: 'profile' },
        ...(can(Permission.UsersView)
          ? [{ label: t('tabs.users'), icon: <IconUsers size={17} />, idx: 'users' as const }]
          : []),
        ...(can(Permission.RolesView)
          ? [{ label: t('tabs.roles'), icon: <IconShield size={17} />, idx: 'roles' as const }]
          : []),
      ],
      tab,
      onTabChange: (next: typeof tab) => setTab(next),
    }
  }, [me, tab, can, t])

  if (loading || authLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
      <CircularProgress />
    </Box>
  )

  if (!me) return (
    <Box py={8} textAlign="center">
      <Typography color="text.secondary">{t('loadError')}</Typography>
    </Box>
  )

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2.5} letterSpacing="-0.2px">{t('title')}</Typography>

      {tab === 'profile' && <MyProfileTab me={me} onUpdated={setMe} />}
      {tab === 'users' && can(Permission.UsersView) && <UsersTab currentUserId={me._id} />}
      {tab === 'roles' && can(Permission.RolesView) && <RolesTab />}
    </Box>
  )
}
