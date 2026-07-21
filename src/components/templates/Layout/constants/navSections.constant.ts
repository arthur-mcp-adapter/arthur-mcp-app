import type { NavSection } from '../navSection.type'
import { IconLayoutDashboard } from '@tabler/icons-react'
import { IconFolder } from '@tabler/icons-react'
import { IconMessage2 } from '@tabler/icons-react'
import { IconLock } from '@tabler/icons-react'
import { IconRobot } from '@tabler/icons-react'
import { IconActivity } from '@tabler/icons-react'
import { IconBug } from '@tabler/icons-react'
import { IconSettings } from '@tabler/icons-react'
import { IconClipboardList } from '@tabler/icons-react'
import { IconBook2 } from '@tabler/icons-react'

export const NAV_SECTIONS: NavSection[] = [
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
      { titleKey: 'nav.aiProviders', icon: IconRobot, path: '/ai-providers', permission: 'ai_providers_view' },
      {
        titleKey: 'nav.documentation',
        icon: IconBook2,
        path: '',
        externalUrl: {
          en: 'https://arthurmcp.io/documentation/',
          ptBR: 'https://arthurmcp.io/documentation/',
        },
      },
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
