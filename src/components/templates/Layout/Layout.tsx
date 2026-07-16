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
import { avatarLetter, avatarColor } from '../../../utils/avatar'
import { useColorMode, ColorMode } from '../../../theme'
import { useAuth, type UserPermissions } from '../../../context/auth'
import { useServerNav } from '../../../context'
import type { NavItem } from './navItem.type'
import type { NavSection } from './navSection.type'
import type { Status } from './status.type'
import type { LayoutProps } from './layoutProps.interface'
import { SIDEBAR_WIDTH } from './constants/sidebarWidth.constant'
import { NAV_SECTIONS } from './constants/navSections.constant'
import './index.css'

const COLLAPSED_SIDEBAR_WIDTH = 64




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

function SidebarContent({ onToggle, collapsed = false }: { onToggle: () => void; collapsed?: boolean }) {
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
      justifyContent: collapsed ? 'center' : 'flex-start',
      px: collapsed ? 0 : 2.5, height: '56px',
      borderBottom: `1px solid ${theme.palette.divider}`,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {!collapsed && (logoError ? (
        <Typography variant="h6" fontWeight={700} color="primary.main"
          sx={{ letterSpacing: '-0.4px', fontSize: '0.9375rem' }}>
          Arthur MCP
        </Typography>
      ) : (
        <Box component="img"
          src={mode === ColorMode.Dark ? '/images/logos/arthur_mcp_dark.png' : '/images/logos/arthur_mcp_light.png'}
          alt="Arthur MCP"
          sx={{ height: '200%', maxWidth: '200%' }}
          onError={() => setLogoError(true)}
        />
      ))}
      <Tooltip title={t('sidebar.toggleMenu')} placement="right">
        <IconButton size="small" aria-label={t('sidebar.toggleMenu')} onClick={onToggle}
          sx={{ ml: collapsed ? 0 : 'auto', flexShrink: 0 }}>
          <IconMenu2 size={18} />
        </IconButton>
      </Tooltip>
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
        <Tooltip title={collapsed ? (serverDetail.backLabel ?? t('sidebar.backToServers')) : ''} placement="right">
          <Box
            display="flex" alignItems="center" gap={0.75} py={1.25}
            px={collapsed ? 0 : 2}
            justifyContent={collapsed ? 'center' : 'flex-start'}
            onClick={() => navigate(serverDetail.backPath ?? '/')}
            sx={{
              cursor: 'pointer', borderBottom: `1px solid ${theme.palette.divider}`,
              color: 'text.secondary', flexShrink: 0,
              '&:hover': { color: 'text.primary' }, transition: 'color 0.15s',
            }}
          >
            <IconArrowLeft size={14} />
            {!collapsed && <Typography fontSize="0.75rem">{serverDetail.backLabel ?? t('sidebar.backToServers')}</Typography>}
          </Box>
        </Tooltip>

        {/* Server identity */}
        <Box px={collapsed ? 0 : 2} py={1.25} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
          <Box display="flex" alignItems="center" gap={0.75} justifyContent={collapsed ? 'center' : 'flex-start'}>
            <Tooltip title={collapsed ? serverDetail.name : ''} placement="right">
              <Box component="span" fontSize="0.85rem">{serverDetail.sourceEmoji}</Box>
            </Tooltip>
            {!collapsed && (
              <Typography fontSize="0.8rem" fontWeight={700} noWrap color="text.primary"
                title={serverDetail.name}>
                {serverDetail.name}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Server nav items */}
        <Box sx={{ flexGrow: 1, py: 0.5, overflowY: 'auto' }}>
          {serverDetail.navItems.map((item) => {
            const active = serverDetail.tab === item.idx
            return (
              <Tooltip key={item.label} title={collapsed ? item.label : ''} placement="right">
                <Box
                  display="flex" alignItems="center" gap={1.25} py={1}
                  px={collapsed ? 0 : 1.75}
                  justifyContent={collapsed ? 'center' : 'flex-start'}
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
                  {!collapsed && (
                    <Typography fontSize="0.8375rem" fontWeight={active ? 600 : 400} noWrap
                      sx={{ flexGrow: 1, color: 'inherit' }}>
                      {item.label}
                    </Typography>
                  )}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
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
              </Tooltip>
            )
          })}
        </Box>

        {!collapsed && promoBox}
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
              subheader={collapsed ? undefined : (
                <ListSubheader sx={{
                  fontSize: '0.6875rem', fontWeight: 700, color: 'text.disabled',
                  letterSpacing: '0.08em', lineHeight: 1, bgcolor: 'transparent',
                  px: 2.5, pt: 2, pb: 0.75, textTransform: 'uppercase',
                }}>
                  {t(section.subheaderKey)}
                </ListSubheader>
              )}
              dense disablePadding
            >
              {visibleItems.map((item) => {
                const Icon = item.icon
                const selected = location.pathname === item.path
                return (
                  <Tooltip key={item.path} title={collapsed ? t(item.titleKey) : ''} placement="right">
                    <ListItem disablePadding sx={{ px: collapsed ? 0.75 : 1.5, py: '1px' }}>
                      <ListItemButton
                        selected={selected}
                        disabled={item.wip}
                        onClick={() => !item.wip && navigate(item.path)}
                        sx={{
                          borderRadius: '8px', minHeight: 38,
                          px: 1.5,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          '&.Mui-selected': {
                            bgcolor: 'rgba(26,115,232,0.08)', color: 'primary.main',
                            '& .MuiListItemIcon-root': { color: 'primary.main' },
                            '&:hover': { bgcolor: 'rgba(26,115,232,0.12)' },
                          },
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: selected ? 'primary.main' : 'text.secondary' }}>
                          <Icon stroke={selected ? 2 : 1.5} size="1.1rem" />
                        </ListItemIcon>
                        {!collapsed && (
                          <ListItemText
                            primary={item.wip ? `${t(item.titleKey)} (Soon)` : t(item.titleKey)}
                            primaryTypographyProps={{
                              fontSize: '0.8375rem',
                              fontWeight: selected ? 600 : 400,
                              color: selected ? 'primary.main' : 'text.primary',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                )
              })}
            </List>
          )
        })}
      </Box>
      {!collapsed && promoBox}
    </Box>
  )
}

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme()
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [status, setStatus] = useState<Status>('checking')
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const profileMenuOpen = profileMenuPosition !== null
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
        <Box sx={{ width: desktopOpen ? SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH, flexShrink: 0, transition: 'width 0.2s' }}>
          <Drawer
            variant="permanent"
            anchor="left"
            open
            PaperProps={{
              sx: {
                width: desktopOpen ? SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH,
                transition: 'width 0.2s',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                border: 'none',
                borderRight: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
                bgcolor: 'background.paper',
              },
            }}
          >
            <SidebarContent collapsed={!desktopOpen} onToggle={() => setDesktopOpen((open) => !open)} />
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
          <SidebarContent onToggle={() => setMobileOpen(false)} />
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
                aria-label={t('sidebar.toggleMenu')}
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
                <IconSun size={15} className={mode === ColorMode.Light ? 'layout-theme-icon layout-theme-icon-active' : 'layout-theme-icon'} />
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
                <IconMoon size={15} className={mode === ColorMode.Dark ? 'layout-theme-icon layout-theme-icon-active' : 'layout-theme-icon'} />
              </Box>
            </Tooltip>

            {/* Profile */}
            <Tooltip title={t('account.menu')}>
              <IconButton
                size="small"
                color="inherit"
                aria-controls={profileMenuOpen ? 'profile-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen ? 'true' : undefined}
                onClick={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect()
                  setProfileMenuPosition({ top: bounds.bottom, left: bounds.right })
                }}
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
              id="profile-menu"
              anchorReference="anchorPosition"
              anchorPosition={profileMenuPosition ?? undefined}
              open={profileMenuOpen}
              onClose={() => setProfileMenuPosition(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              PaperProps={{ sx: { width: 200, mt: 0.5 } }}
            >
              <MenuItem onClick={() => { setProfileMenuPosition(null); navigate('/profile') }}>
                <ListItemIcon><IconUser size={18} /></ListItemIcon>
                <ListItemText>{t('account.myProfile')}</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => { setProfileMenuPosition(null); handleLogout() }}
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
