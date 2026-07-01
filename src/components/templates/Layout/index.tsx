import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  Switch,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  styled,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  IconFolder,
  IconMenu2,
  IconLogout,
  IconUser,
  IconLayoutDashboard,
  IconSettings,
  IconClipboardList,
  IconMessage2,
  IconLock,
  IconRobot,
  IconActivity,
  IconBug,
  IconSun,
  IconMoon,
  IconArrowLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'
import { avatarLetter, avatarColor } from '../../../pages/Profile'
import { useColorMode, ColorMode } from '../../../theme/ColorModeContext'
import { useAuth, type UserPermissions } from '../../../context/AuthContext'
import { useServerNav } from '../../../context/ServerNavContext'

const SIDEBAR_WIDTH = 248

type NavItem = {
  titleKey: string
  icon: React.ElementType
  path: string
  permission?: keyof UserPermissions
  adminOnly?: boolean
  wip?: boolean
}

type NavSection = {
  subheaderKey: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    subheaderKey: 'section.overview',
    items: [
      { titleKey: 'nav.dashboard', icon: IconLayoutDashboard, path: '/dashboard', permission: 'servers_view' },
    ],
  },
  {
    subheaderKey: 'section.main',
    items: [
      { titleKey: 'nav.servers', icon: IconFolder, path: '/', permission: 'servers_view' },
      { titleKey: 'nav.prompts', icon: IconMessage2, path: '/prompts', permission: 'prompts_view' },
      { titleKey: 'nav.secrets', icon: IconLock, path: '/secrets', permission: 'secrets_view_names' },
      { titleKey: 'nav.aiProviders', icon: IconRobot, path: '/ai-providers', permission: 'ai_providers_view', wip: true },
    ],
  },
  {
    subheaderKey: 'section.administration',
    items: [
      { titleKey: 'nav.observability', icon: IconActivity, path: '/observability', permission: 'observability_view' },
      { titleKey: 'nav.errorTracking', icon: IconBug, path: '/error-tracking', permission: 'error_tracking_view' },
      { titleKey: 'nav.settings', icon: IconSettings, path: '/settings', permission: 'settings_manage' },
      { titleKey: 'nav.auditLogs', icon: IconClipboardList, path: '/audit-logs', permission: 'audit_view' },
    ],
  },
]


const AppBarStyled = styled(AppBar)(({ theme }) => ({
  boxShadow: 'none',
  background: `${theme.palette.background.paper}f2`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  justifyContent: 'center',
  backdropFilter: 'blur(8px)',
  minHeight: '56px',
}))

const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
  width: '100%',
  color: theme.palette.text.secondary,
  minHeight: '56px !important',
  paddingLeft: '16px',
  paddingRight: '12px',
}))

type Status = 'checking' | 'online' | 'offline'

function SidebarContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const [logoError, setLogoError] = useState(false)
  const { can, isAdmin } = useAuth()
  const { mode } = useColorMode()
  const { serverDetail } = useServerNav()
  const { t } = useTranslation('layout')

  const scrollbarStyles = {
    '&::-webkit-scrollbar': { width: '7px' },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: mode === ColorMode.Dark ? '#3c4043' : '#e8eaed',
      borderRadius: '15px',
    },
  }

  const logoArea = (
    <Box sx={{
      display: 'flex', alignItems: 'center',
      px: 2.5, height: '56px',
      borderBottom: `1px solid ${theme.palette.divider}`,
      flexShrink: 0,
    }}>
      {logoError ? (
        <Typography variant="h6" fontWeight={700} color="primary.main"
          sx={{ letterSpacing: '-0.4px', fontSize: '0.9375rem' }}>
          Arthur MCP
        </Typography>
      ) : (
        <Box component="img"
          src={mode === ColorMode.Dark ? '/images/logos/arthur_mcp_logo_dark_mode.svg' : '/images/logos/arthur_mcp_logo_light_mode.svg'}
          alt="Arthur MCP"
          sx={{ height: '100%', maxWidth: '100%' }}
          onError={() => setLogoError(true)}
        />
      )}
    </Box>
  )

  const promoBox = (
    <Box sx={{ p: 1.5, pb: 2, flexShrink: 0 }}>
      <Box sx={{
        p: 1.5, bgcolor: 'primary.light', borderRadius: '10px',
        border: '1px solid', borderColor: 'rgba(93,135,255,0.15)',
      }}>
        <Typography fontWeight={700} fontSize="0.8rem" color="primary.dark" mb={0.25}>
          {t('promo.title')}
        </Typography>
        <Typography fontSize="0.72rem" color="text.secondary" lineHeight={1.4}>
          {t('promo.subtitle')}
        </Typography>
      </Box>
    </Box>
  )

  /* ── Contextual nav — server detail ── */
  if (serverDetail) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', ...scrollbarStyles }}>
        {logoArea}

        {/* Back to Servers */}
        <Box
          display="flex" alignItems="center" gap={0.75} px={2} py={1.25}
          onClick={() => navigate(serverDetail.backPath ?? '/')}
          sx={{
            cursor: 'pointer', borderBottom: `1px solid ${theme.palette.divider}`,
            color: 'text.secondary', flexShrink: 0,
            '&:hover': { color: 'text.primary' }, transition: 'color 0.15s',
          }}
        >
          <IconArrowLeft size={14} />
          <Typography fontSize="0.75rem">{serverDetail.backLabel ?? t('sidebar.backToServers')}</Typography>
        </Box>

        {/* Server identity */}
        <Box px={2} py={1.25} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Box component="span" fontSize="0.85rem">{serverDetail.sourceEmoji}</Box>
            <Typography fontSize="0.8rem" fontWeight={700} noWrap color="text.primary"
              title={serverDetail.name}>
              {serverDetail.name}
            </Typography>
          </Box>
        </Box>

        {/* Server nav items */}
        <Box sx={{ flexGrow: 1, py: 0.5, overflowY: 'auto' }}>
          {serverDetail.navItems.map((item) => {
            const active = serverDetail.tab === item.idx
            return (
              <Box
                key={item.label}
                display="flex" alignItems="center" gap={1.25} px={1.75} py={1}
                onClick={() => !item.disabled && serverDetail.onTabChange(item.idx)}
                sx={{
                  cursor: item.disabled ? 'default' : 'pointer',
                  opacity: item.disabled ? 0.38 : 1,
                  color: active ? 'primary.main' : 'text.secondary',
                  borderLeft: '2px solid',
                  borderColor: active ? 'primary.main' : 'transparent',
                  bgcolor: active ? 'rgba(26,115,232,0.08)' : 'transparent',
                  transition: 'background 0.12s, color 0.12s',
                  '&:hover': !item.disabled ? {
                    bgcolor: active ? 'rgba(26,115,232,0.12)' : 'action.hover',
                    color: active ? 'primary.main' : 'text.primary',
                  } : {},
                  userSelect: 'none',
                  mx: 0.75, borderRadius: '0 6px 6px 0',
                }}
              >
                <Box sx={{ flexShrink: 0, display: 'flex', color: 'inherit', '& svg': { strokeWidth: active ? 2 : 1.5 } }}>
                  {item.icon}
                </Box>
                <Typography fontSize="0.8375rem" fontWeight={active ? 600 : 400} noWrap
                  sx={{ flexGrow: 1, color: 'inherit' }}>
                  {item.label}
                </Typography>
                {item.badge !== undefined && item.badge > 0 && (
                  <Box sx={{
                    minWidth: 18, height: 18, borderRadius: '9px', px: 0.6,
                    bgcolor: active ? 'primary.main' : 'action.selected',
                    color: active ? '#fff' : 'text.secondary',
                    fontSize: '0.65rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.badge}
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>

        {promoBox}
      </Box>
    )
  }

  /* ── Default app nav ── */
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', ...scrollbarStyles }}>
      {logoArea}
      <Box sx={{ flexGrow: 1, py: 1 }}>
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly) return isAdmin
            if (item.permission) return can(item.permission)
            return true
          })
          if (visibleItems.length === 0) return null
          return (
            <List
              key={section.subheaderKey}
              subheader={
                <ListSubheader sx={{
                  fontSize: '0.6875rem', fontWeight: 700, color: 'text.disabled',
                  letterSpacing: '0.08em', lineHeight: 1, bgcolor: 'transparent',
                  px: 2.5, pt: 2, pb: 0.75, textTransform: 'uppercase',
                }}>
                  {t(section.subheaderKey)}
                </ListSubheader>
              }
              dense disablePadding
            >
              {visibleItems.map((item) => {
                const Icon = item.icon
                const selected = location.pathname === item.path
                return (
                  <ListItem key={item.path} disablePadding sx={{ px: 1.5, py: '1px' }}>
                    <ListItemButton
                      selected={selected}
                      disabled={item.wip}
                      onClick={() => !item.wip && navigate(item.path)}
                      sx={{
                        borderRadius: '8px', minHeight: 38, px: 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(26,115,232,0.08)', color: 'primary.main',
                          '& .MuiListItemIcon-root': { color: 'primary.main' },
                          '&:hover': { bgcolor: 'rgba(26,115,232,0.12)' },
                        },
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: selected ? 'primary.main' : 'text.secondary' }}>
                        <Icon stroke={selected ? 2 : 1.5} size="1.1rem" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.wip ? `${t(item.titleKey)} (WIP)` : t(item.titleKey)}
                        primaryTypographyProps={{
                          fontSize: '0.8375rem',
                          fontWeight: selected ? 600 : 400,
                          color: selected ? 'primary.main' : 'text.primary',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          )
        })}
      </Box>
      {promoBox}
    </Box>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [status, setStatus] = useState<Status>('checking')
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null)
  const [username, setUsername] = useState('')
  const navigate = useNavigate()
  const { mode, toggle } = useColorMode()
  const { logout } = useAuth()
  const { t, i18n } = useTranslation('layout')

  const activeLang = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en'

  useEffect(() => {
    api.get('/health')
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    api.get<{ username: string }>('/users/me')
      .then((r) => setUsername(r.data.username))
      .catch(() => { /* silently ignore */ })
  }, [])

  const statusColor: Record<Status, 'default' | 'success' | 'error'> = {
    checking: 'default',
    online: 'success',
    offline: 'error',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar desktop */}
      {mdUp && (
        <Box sx={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}>
          <Drawer
            variant="permanent"
            anchor="left"
            open
            PaperProps={{
              sx: {
                width: SIDEBAR_WIDTH,
                boxSizing: 'border-box',
                border: 'none',
                borderRight: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
                bgcolor: 'background.paper',
              },
            }}
          >
            <SidebarContent />
          </Drawer>
        </Box>
      )}

      {/* Sidebar mobile */}
      {!mdUp && (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              boxShadow: theme.shadows[6],
              border: 'none',
            },
          }}
        >
          <SidebarContent />
        </Drawer>
      )}

      {/* Main content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
        }}
      >
        {/* Header */}
        <AppBarStyled position="sticky" color="default">
          <ToolbarStyled>
            {!mdUp && (
              <IconButton
                color="inherit"
                aria-label="open menu"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 1 }}
              >
                <IconMenu2 width={20} height={20} />
              </IconButton>
            )}

            <Box flexGrow={1} />

            {/* Language toggle */}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={activeLang}
              onChange={(_e, val) => { if (val) i18n.changeLanguage(val) }}
              sx={{
                mr: 1.5,
                '& .MuiToggleButtonGroup-grouped': {
                  marginLeft: '0 !important',
                  border: '1px solid !important',
                  borderColor: 'divider !important',
                  '&.Mui-selected': {
                    borderColor: 'primary.main !important',
                    zIndex: 1,
                  },
                },
                '& .MuiToggleButton-root': {
                  height: 24,
                  px: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  lineHeight: 1,
                  color: 'text.secondary',
                  textTransform: 'none',
                  '&.Mui-selected': {
                    color: 'primary.main',
                    bgcolor: 'rgba(26,115,232,0.08)',
                    '&:hover': { bgcolor: 'rgba(26,115,232,0.12)' },
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                },
              }}
            >
              <ToggleButton value="en" disableRipple>EN</ToggleButton>
              <ToggleButton value="pt-BR" disableRipple>PT</ToggleButton>
            </ToggleButtonGroup>

            {/* Dark mode toggle */}
            <Tooltip title={mode === ColorMode.Dark ? t('theme.lightMode') : t('theme.darkMode')}>
              <Box display="flex" alignItems="center" gap={0.5} mr={0.5}>
                <IconSun size={15} style={{ opacity: mode === ColorMode.Light ? 1 : 0.4 }} />
                <Switch
                  size="small"
                  checked={mode === ColorMode.Dark}
                  onChange={toggle}
                  color="default"
                  sx={{
                    '& .MuiSwitch-thumb': { bgcolor: mode === ColorMode.Dark ? '#e8eaed' : '#5f6368' },
                    '& .MuiSwitch-track': { bgcolor: mode === ColorMode.Dark ? '#5f6368 !important' : undefined },
                  }}
                />
                <IconMoon size={15} style={{ opacity: mode === ColorMode.Dark ? 1 : 0.4 }} />
              </Box>
            </Tooltip>

            {/* Profile */}
            <Tooltip title={t('account.menu')}>
              <IconButton
                size="small"
                color="inherit"
                onClick={(e) => setProfileAnchor(e.currentTarget)}
                sx={{ p: 0.5, ml: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    bgcolor: username ? avatarColor(username) : 'primary.main',
                  }}
                >
                  {username ? avatarLetter(username) : <IconUser size={16} />}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={profileAnchor}
              open={Boolean(profileAnchor)}
              onClose={() => setProfileAnchor(null)}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              PaperProps={{ sx: { width: 200, mt: 0.5 } }}
            >
              <MenuItem onClick={() => { setProfileAnchor(null); navigate('/profile') }}>
                <ListItemIcon><IconUser size={18} /></ListItemIcon>
                <ListItemText>{t('account.myProfile')}</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => { setProfileAnchor(null); handleLogout() }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}><IconLogout size={18} /></ListItemIcon>
                <ListItemText>{t('account.logout')}</ListItemText>
              </MenuItem>
            </Menu>
          </ToolbarStyled>
        </AppBarStyled>

        {/* Page content */}
        <Container
          maxWidth={false}
          sx={{ maxWidth: '1280px', pt: 2, pb: 6, flexGrow: 1, px: { xs: 2, md: 3 } }}
        >
          <Box sx={{ minHeight: 'calc(100vh - 136px)' }}>
            {children}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
