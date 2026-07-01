import { useState } from 'react'
import type { ReactNode } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { useTranslation } from 'react-i18next'

export function CodePreviewTabs({ codeContent, previewContent, tabSx }: {
  codeContent: ReactNode
  previewContent: ReactNode
  tabSx?: object
}) {
  const { t } = useTranslation('common')
  const [tab, setTab] = useState(0)
  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, ...tabSx }}>
        <Tab label={t('action.code')} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
        <Tab label={t('action.preview')} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
      </Tabs>
      {tab === 0 && codeContent}
      {tab === 1 && previewContent}
    </>
  )
}
