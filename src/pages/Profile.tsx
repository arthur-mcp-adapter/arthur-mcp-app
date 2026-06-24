import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
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
import api from '../api'
import { useAuth, Permission } from '../context/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import AppSnackbar from '../components/AppSnackbar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  _id: string
  username: string
  email: string
  role: string
  createdAt: string
}

// ─── Role types ───────────────────────────────────────────────────────────────

interface RolePermissions {
  // Servers
  servers_view: boolean
  servers_create: boolean
  servers_edit_settings: boolean
  servers_delete: boolean
  servers_toggle_active: boolean
  servers_share: boolean
  // Tools
  tools_view: boolean
  tools_create: boolean
  tools_edit: boolean
  tools_delete: boolean
  tools_test: boolean
  endpoints_create: boolean
  // Resources
  resources_view: boolean
  resources_create: boolean
  resources_edit: boolean
  resources_delete: boolean
  // Prompts
  prompts_view: boolean
  prompts_create: boolean
  prompts_edit: boolean
  prompts_delete: boolean
  // Secrets
  secrets_view_names: boolean
  secrets_reveal_values: boolean
  secrets_create: boolean
  secrets_edit: boolean
  secrets_delete: boolean
  // API Keys
  api_keys_view: boolean
  api_keys_create: boolean
  api_keys_delete: boolean
  // Users & Roles
  users_view: boolean
  users_invite: boolean
  users_edit: boolean
  users_delete: boolean
  roles_view: boolean
  roles_manage: boolean
  // Audit & Logs
  audit_view: boolean
  audit_export: boolean
  // Templates
  templates_use: boolean
  // Settings
  settings_manage: boolean
}

interface Role {
  _id: string
  id?: string
  name: string
  description?: string
  builtin?: boolean
  permissions: RolePermissions
}

const PERMISSION_GROUPS: {
  label: string
  icon?: string
  keys: (keyof RolePermissions)[]
  descriptions: Partial<Record<keyof RolePermissions, string>>
}[] = [
  {
    label: 'Servers',
    keys: ['servers_view', 'servers_create', 'servers_edit_settings', 'servers_delete', 'servers_toggle_active', 'servers_share'],
    descriptions: {
      servers_view: 'View servers and their configuration',
      servers_create: 'Create new MCP servers',
      servers_edit_settings: 'Edit server name, base URL and authentication',
      servers_delete: 'Delete servers permanently',
      servers_toggle_active: 'Enable or disable a server',
      servers_share: 'Generate and manage share links',
    },
  },
  {
    label: 'Tools',
    keys: ['tools_view', 'tools_create', 'tools_edit', 'tools_delete', 'tools_test', 'endpoints_create'],
    descriptions: {
      tools_view: 'View tools and their parameters',
      tools_create: 'Add new tools to a server',
      tools_edit: 'Edit tool configuration and parameters',
      tools_delete: 'Remove tools from a server',
      tools_test: 'Run live test calls against tools',
      endpoints_create: 'Manually create API endpoints in the Endpoints tab',
    },
  },
  {
    label: 'Resources',
    keys: ['resources_view', 'resources_create', 'resources_edit', 'resources_delete'],
    descriptions: {
      resources_view: 'View static and dynamic resources',
      resources_create: 'Add new resources to a server',
      resources_edit: 'Edit resource content and configuration',
      resources_delete: 'Remove resources from a server',
    },
  },
  {
    label: 'Prompts',
    keys: ['prompts_view', 'prompts_create', 'prompts_edit', 'prompts_delete'],
    descriptions: {
      prompts_view: 'View prompt templates',
      prompts_create: 'Create new prompt templates',
      prompts_edit: 'Edit prompt content and arguments',
      prompts_delete: 'Delete prompt templates',
    },
  },
  {
    label: 'Secrets',
    keys: ['secrets_view_names', 'secrets_reveal_values', 'secrets_create', 'secrets_edit', 'secrets_delete'],
    descriptions: {
      secrets_view_names: 'See secret names in the vault',
      secrets_reveal_values: 'Reveal secret values (sensitive)',
      secrets_create: 'Add new secrets to the vault',
      secrets_edit: 'Update existing secret values',
      secrets_delete: 'Remove secrets permanently',
    },
  },
  {
    label: 'API Keys',
    keys: ['api_keys_view', 'api_keys_create', 'api_keys_delete'],
    descriptions: {
      api_keys_view: 'View existing API keys',
      api_keys_create: 'Generate new API keys',
      api_keys_delete: 'Revoke and delete API keys',
    },
  },
  {
    label: 'Users & Roles',
    keys: ['users_view', 'users_invite', 'users_edit', 'users_delete', 'roles_view', 'roles_manage'],
    descriptions: {
      users_view: 'View the member list',
      users_invite: 'Invite new members to the workspace',
      users_edit: 'Change member roles and details',
      users_delete: 'Remove members from the workspace',
      roles_view: 'View roles and their permissions',
      roles_manage: 'Create, edit and delete custom roles',
    },
  },
  {
    label: 'Audit & Logs',
    keys: ['audit_view', 'audit_export'],
    descriptions: {
      audit_view: 'View the activity audit log',
      audit_export: 'Export audit logs to CSV',
    },
  },
  {
    label: 'Templates',
    keys: ['templates_use'],
    descriptions: {
      templates_use: 'Use API templates to create pre-configured servers',
    },
  },
  {
    label: 'Settings',
    keys: ['settings_manage'],
    descriptions: {
      settings_manage: 'Access and modify system settings (SMTP, base URL)',
    },
  },
]

const ALL_OFF: RolePermissions = {
  servers_view: false, servers_create: false, servers_edit_settings: false, servers_delete: false,
  servers_toggle_active: false, servers_share: false,
  tools_view: false, tools_create: false, tools_edit: false, tools_delete: false, tools_test: false, endpoints_create: false,
  resources_view: false, resources_create: false, resources_edit: false, resources_delete: false,
  prompts_view: false, prompts_create: false, prompts_edit: false, prompts_delete: false,
  secrets_view_names: false, secrets_reveal_values: false, secrets_create: false, secrets_edit: false, secrets_delete: false,
  api_keys_view: false, api_keys_create: false, api_keys_delete: false,
  users_view: false, users_invite: false, users_edit: false, users_delete: false,
  roles_view: false, roles_manage: false,
  audit_view: false, audit_export: false,
  templates_use: false,
  settings_manage: false,
}

const BUILTIN_ROLES: Role[] = [
  {
    _id: 'admin',
    name: 'Administrator',
    description: 'Full access to everything.',
    builtin: true,
    permissions: Object.fromEntries(Object.keys(ALL_OFF).map((k) => [k, true])) as unknown as RolePermissions,
  },
  {
    _id: 'developer',
    name: 'Developer',
    description: 'Can manage servers and content. Cannot manage users, roles or secrets.',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true, servers_create: true, servers_edit_settings: true, servers_delete: false,
      servers_toggle_active: true, servers_share: true,
      tools_view: true, tools_create: true, tools_edit: true, tools_delete: true, tools_test: true, endpoints_create: true,
      resources_view: true, resources_create: true, resources_edit: true, resources_delete: true,
      prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: true,
      secrets_view_names: true, secrets_reveal_values: false,
      api_keys_view: true, api_keys_create: true, api_keys_delete: false,
      users_view: true, roles_view: true,
      audit_view: true, templates_use: true,
    },
  },
  {
    _id: 'editor',
    name: 'Editor',
    description: 'Can edit tools, resources and prompts on existing servers. Cannot create or delete servers.',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true,
      tools_view: true, tools_create: true, tools_edit: true, tools_delete: true, tools_test: true, endpoints_create: true,
      resources_view: true, resources_create: true, resources_edit: true, resources_delete: true,
      prompts_view: true, prompts_create: true, prompts_edit: true, prompts_delete: true,
      secrets_view_names: true,
      users_view: true,
      templates_use: true,
    },
  },
  {
    _id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access. Cannot make any changes.',
    builtin: true,
    permissions: {
      ...ALL_OFF,
      servers_view: true,
      tools_view: true, resources_view: true, prompts_view: true,
      users_view: true, roles_view: true,
      audit_view: true,
    },
  },
]

const emptyPermissions = (): RolePermissions => ({ ...ALL_OFF, servers_view: true })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarLetter(username: string) {
  return username.charAt(0).toUpperCase()
}

function avatarColor(username: string) {
  const colors = ['#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B']
  return colors[username.charCodeAt(0) % colors.length]
}

// ─── User form dialog (create / edit — admin) ─────────────────────────────────

interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (user: UserProfile) => void
  editUser?: UserProfile
  onDeleted?: (id: string) => void
  canDelete?: boolean
  currentUserId?: string
}

function UserDialog({ open, onClose, onSaved, editUser, onDeleted, canDelete, currentUserId }: UserDialogProps) {
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
          { value: 'admin', label: 'Administrator' },
          { value: 'developer', label: 'Developer' },
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
          ...dynamic,
        ])
      })
      .catch(() => {
        setAvailableRoles([
          { value: 'admin', label: 'Administrator' },
          { value: 'developer', label: 'Developer' },
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
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
    if (!username.trim()) { setError('Username is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (!isEdit && !password.trim()) { setError('Password is required for new users.'); return }

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
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error saving.'
        : 'Error saving.'
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
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{isEdit ? 'Edit user' : 'New user'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
          <TextField size="small" fullWidth required autoFocus label="Username"
            value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} />
          <TextField size="small" fullWidth required label="Email" type="email"
            value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} />
          <TextField size="small" fullWidth label={isEdit ? 'New password (leave blank to keep)' : 'Password *'}
            type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
          <FormControl size="small" fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
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
            Delete user
          </Button>
        )}
        <Button onClick={onClose} disabled={saving || deleting}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || deleting}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create user'}
        </Button>
      </Box>
    </Drawer>

    <ConfirmDialog
      open={deleteConfirmOpen}
      title={`Delete "${editUser?.username}"?`}
      message="This action cannot be undone."
      confirmLabel="Delete" confirmColor="error" loading={deleting}
      onConfirm={handleDeleteConfirm}
      onClose={() => setDeleteConfirmOpen(false)}
    />
    </>
  )
}

// ─── My profile tab ───────────────────────────────────────────────────────────

function MyProfileTab({ me, onUpdated }: { me: UserProfile; onUpdated: (u: UserProfile) => void }) {
  const [username, setUsername] = useState(me.username)
  const [email, setEmail] = useState(me.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  const showSnack = (msg: string, sev: 'success' | 'error') => {
    setSnackMsg(msg); setSnackSeverity(sev); setSnackOpen(true)
  }

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) { showSnack('Passwords do not match.', 'error'); return }
    if (newPassword && !currentPassword) { showSnack('Enter your current password to set a new one.', 'error'); return }

    setSaving(true)
    try {
      const dto: Record<string, unknown> = {}
      if (username !== me.username) dto.username = username
      if (email !== me.email) dto.email = email
      if (newPassword) { dto.currentPassword = currentPassword; dto.newPassword = newPassword }

      if (Object.keys(dto).length === 0) { showSnack('No changes detected.', 'error'); return }

      const res = await api.patch<UserProfile>('/users/me', dto)
      onUpdated(res.data)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      showSnack('Profile updated successfully.', 'success')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error updating.'
        : 'Error updating.'
      showSnack(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      {/* Avatar / header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: '1.5rem', bgcolor: avatarColor(me.username), fontWeight: 700 }}>
          {avatarLetter(me.username)}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>{me.username}</Typography>
          <Typography variant="body2" color="text.secondary">{me.email}</Typography>
          <Chip label={me.role === 'admin' ? 'Administrator' : 'User'} size="small" color={me.role === 'admin' ? 'primary' : 'default'} sx={{ mt: 0.5 }} />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Basic info */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Account information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </Grid>
          </Grid>
        </Grid>

        {/* Change password */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Change password</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="Current password" type="password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="New password" type="password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField size="small" fullWidth label="Confirm new password" type="password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!newPassword && !!confirmPassword && newPassword !== confirmPassword}
                helperText={newPassword && confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''} />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Grid>
      </Grid>

      <AppSnackbar open={snackOpen} message={snackMsg} severity={snackSeverity} onClose={() => setSnackOpen(false)} />
    </Box>
  )
}

// ─── Users management tab (admin) ─────────────────────────────────────────────

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>()
  const { can } = useAuth()

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  const load = () => {
    setLoading(true)
    api.get<UserProfile[]>('/users')
      .then((r) => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
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
    setSnackMsg('User deleted.')
    setSnackSeverity('success')
    setSnackOpen(true)
  }

  const handleOpenCreate = () => { setEditingUser(undefined); setDialogOpen(true) }
  const handleOpenEdit = (user: UserProfile) => { setEditingUser(user); setDialogOpen(true) }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>{users.length} user{users.length !== 1 ? 's' : ''}</Typography>
        {can(Permission.UsersInvite) && (
          <Button variant="contained" startIcon={<IconPlus size={18} />} size="small" onClick={handleOpenCreate}>
            New user
          </Button>
        )}
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
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
                    {u._id === currentUserId && <Chip label="you" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                  </Box>
                </TableCell>
                <TableCell><Typography fontSize="0.82rem" color="text.secondary">{u.email}</Typography></TableCell>
                <TableCell>
                  <Chip label={u.role === 'admin' ? 'Admin' : 'User'} size="small"
                    color={u.role === 'admin' ? 'primary' : 'default'} sx={{ fontSize: '0.72rem', height: 22 }} />
                </TableCell>
                <TableCell>
                  <Typography fontSize="0.78rem" color="text.secondary">
                    {new Date(u.createdAt).toLocaleDateString('en-US')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {can(Permission.UsersEdit) && (
                    <Tooltip title="Edit">
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

      <AppSnackbar open={snackOpen} message={snackMsg} severity={snackSeverity} onClose={() => setSnackOpen(false)} />
    </Box>
  )
}

// ─── Role drawer ──────────────────────────────────────────────────────────────

function RoleDrawer({
  open, onClose, onSaved, editRole,
}: {
  open: boolean
  onClose: () => void
  onSaved: (role: Role) => void
  editRole?: Role
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>(emptyPermissions())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
  const someOn = !allOn && allKeys.some((k) => permissions[k])

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return }
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
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error saving.'
        : 'Error saving.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700} flexGrow={1}>{editRole ? 'Edit role' : 'New role'}</Typography>
        <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box display="flex" flexDirection="column" gap={2}>
          <TextField size="small" fullWidth required autoFocus label="Role name"
            value={name} onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="e.g. Developer, Analyst…" />
          <TextField size="small" fullWidth multiline minRows={2} label="Description (optional)"
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role allows…" />
        </Box>

        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle2" fontWeight={700}>Permissions</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={allOn}
                  indeterminate={someOn}
                  onChange={toggleAll}
                />
              }
              label={<Typography fontSize="0.8rem" color="text.secondary">Select all</Typography>}
              sx={{ mr: 0 }}
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={0}>
            {PERMISSION_GROUPS.map((group, gi) => {
              const groupAllOn = group.keys.every((k) => permissions[k])
              const groupSomeOn = !groupAllOn && group.keys.some((k) => permissions[k])
              return (
                <Box key={group.label}>
                  {gi > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                      sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {group.label}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={groupAllOn}
                          indeterminate={groupSomeOn}
                          onChange={() => toggleGroup(group.keys)}
                        />
                      }
                      label={<Typography fontSize="0.75rem" color="text.secondary">All</Typography>}
                      sx={{ mr: 0 }}
                    />
                  </Box>
                  {group.keys.map((key) => (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          size="small"
                          checked={permissions[key]}
                          onChange={() => toggle(key)}
                        />
                      }
                      label={<Typography fontSize="0.875rem">{group.descriptions[key]}</Typography>}
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
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : editRole ? 'Save changes' : 'Create role'}
        </Button>
      </Box>
    </Drawer>
  )
}

// ─── Roles tab ─────────────────────────────────────────────────────────────────

function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const { can } = useAuth()

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
    setSnack({ message: editRole ? 'Role updated.' : 'Role created.', severity: 'success' })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/roles/${deleteTarget._id}`)
      setRoles((prev) => prev.filter((r) => r._id !== deleteTarget._id))
      setSnack({ message: 'Role deleted.', severity: 'success' })
    } catch {
      setSnack({ message: 'Failed to delete role.', severity: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const permissionCount = (p: RolePermissions) => Object.values(p).filter(Boolean).length
  const totalPermissions = Object.keys(emptyPermissions()).length

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  const staticRoles = roles.filter((r) => r.builtin)
  const dynamicRoles = roles.filter((r) => !r.builtin)

  const renderRoleCard = (role: Role) => {
    const isDynamic = !role.builtin
    const allPermLabels = PERMISSION_GROUPS.flatMap((g) =>
      g.keys.map((k) => ({ k, desc: g.descriptions[k] ?? k }))
    )
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
                label={`${permissionCount(role.permissions)} / ${totalPermissions} permissions`}
                size="small"
                color={permissionCount(role.permissions) === totalPermissions ? 'primary' : 'default'}
                sx={{ fontSize: '0.65rem', height: 18, borderRadius: '4px' }}
              />
            </Box>
            {role.description && (
              <Typography variant="body2" color="text.secondary" mb={1.5}>{role.description}</Typography>
            )}
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {allPermLabels.map(({ k, desc }) => {
                if (!role.permissions[k]) return null
                return (
                  <Chip key={k} label={desc} size="small" variant="outlined"
                    sx={{ fontSize: '0.67rem', height: 20, borderRadius: '4px' }} />
                )
              })}
            </Box>
          </Box>
          {isDynamic && can(Permission.RolesManage) && (
            <Box display="flex" gap={0.5} flexShrink={0}>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => { setEditRole(role); setDrawerOpen(true) }}>
                  <IconEdit size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
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
      {/* Static roles */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <IconLock size={16} />
          <Typography variant="subtitle2" fontWeight={700}>Built-in roles</Typography>
          <Typography variant="body2" color="text.secondary">— read-only, always available</Typography>
        </Box>
        <Box display="flex" flexDirection="column" gap={1.5}>
          {staticRoles.map(renderRoleCard)}
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Dynamic roles */}
      <Box>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconShield size={16} />
            <Typography variant="subtitle2" fontWeight={700}>Custom roles</Typography>
          </Box>
          {can(Permission.RolesManage) && (
            <Button variant="contained" size="small" startIcon={<IconPlus size={16} />}
              onClick={() => { setEditRole(undefined); setDrawerOpen(true) }}>
              New role
            </Button>
          )}
        </Box>
        {dynamicRoles.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
            No custom roles yet. Click <strong>New role</strong> to create one.
          </Alert>
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
        title={`Delete role "${deleteTarget?.name}"?`}
        message="Members assigned to this role will lose its permissions."
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      <AppSnackbar
        open={snack !== null}
        message={snack?.message ?? ''}
        severity={snack?.severity ?? 'success'}
        onClose={() => setSnack(null)}
      />
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Profile() {
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

  if (loading || authLoading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  if (!me) return <Alert severity="error">Unable to load profile.</Alert>

  return (
    <Box py={3} px={0}>
      <Typography variant="h5" fontWeight={700} mb={2.5} letterSpacing="-0.2px">Profile</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v as typeof tab)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab value="profile" icon={<IconUser size={16} />} iconPosition="start" label="My Profile" />
        {can(Permission.UsersView) && (
          <Tab value="users" icon={<IconUsers size={16} />} iconPosition="start" label="Users" />
        )}
        {can(Permission.RolesView) && (
          <Tab value="roles" icon={<IconShield size={16} />} iconPosition="start" label="Roles" />
        )}
      </Tabs>

      {tab === 'profile' && <MyProfileTab me={me} onUpdated={setMe} />}
      {tab === 'users' && can(Permission.UsersView) && <UsersTab currentUserId={me._id} />}
      {tab === 'roles' && can(Permission.RolesView) && <RolesTab />}
    </Box>
  )
}

// Re-export helpers for use in Layout
export { avatarLetter, avatarColor }
