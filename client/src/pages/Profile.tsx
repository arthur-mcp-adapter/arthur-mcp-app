import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
} from '@tabler/icons-react'
import api from '../api'
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
}

function UserDialog({ open, onClose, onSaved, editUser }: UserDialogProps) {
  const isEdit = !!editUser
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setUsername(editUser?.username ?? '')
      setEmail(editUser?.email ?? '')
      setPassword('')
      setRole(editUser?.role ?? 'user')
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Edit user' : 'New user'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
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
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create user'}
        </Button>
      </DialogActions>
    </Dialog>
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

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<UserProfile | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

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

  const handleDeleteRequest = (user: UserProfile) => {
    setConfirmTarget(user)
    setConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      await api.delete(`/users/${confirmTarget._id}`)
      setUsers((prev) => prev.filter((u) => u._id !== confirmTarget._id))
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not remove user.'
        : 'Could not remove user.'
      setSnackMsg(msg)
      setSnackSeverity('error')
      setSnackOpen(true)
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setConfirmTarget(null)
    }
  }

  const handleOpenCreate = () => { setEditingUser(undefined); setDialogOpen(true) }
  const handleOpenEdit = (user: UserProfile) => { setEditingUser(user); setDialogOpen(true) }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>{users.length} user{users.length !== 1 ? 's' : ''}</Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} />} size="small" onClick={handleOpenCreate}>
          New user
        </Button>
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
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenEdit(u)}><IconEdit size={16} /></IconButton>
                  </Tooltip>
                  <Tooltip title={u._id === currentUserId ? 'Cannot remove your own account' : 'Remove'}>
                    <span>
                      <IconButton size="small" color="error" onClick={() => handleDeleteRequest(u)} disabled={u._id === currentUserId}>
                        <IconTrash size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <UserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={handleSaved} editUser={editingUser} />

      <ConfirmDialog
        open={confirmOpen}
        title={`Remove "${confirmTarget?.username}"?`}
        message="This action cannot be undone."
        confirmLabel="Remove"
        confirmColor="error"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />

      <AppSnackbar open={snackOpen} message={snackMsg} severity={snackSeverity} onClose={() => setSnackOpen(false)} />
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Profile() {
  const [me, setMe] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    api.get<UserProfile>('/users/me')
      .then((r) => setMe(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  if (!me) return <Alert severity="error">Unable to load profile.</Alert>

  return (
    <Box py={3} px={0}>
      <Typography variant="h5" fontWeight={700} mb={2.5} letterSpacing="-0.2px">Profile</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<IconUser size={16} />} iconPosition="start" label="My Profile" />
        {me.role === 'admin' && (
          <Tab icon={<IconUsers size={16} />} iconPosition="start" label="Users" />
        )}
      </Tabs>

      {tab === 0 && <MyProfileTab me={me} onUpdated={setMe} />}
      {tab === 1 && me.role === 'admin' && <UsersTab currentUserId={me._id} />}
    </Box>
  )
}

// Re-export helpers for use in Layout
export { avatarLetter, avatarColor }
