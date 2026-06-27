import { useState } from 'react'
import type { ReactNode } from 'react'
import { Box, Tab, Tabs } from '@mui/material'

export function CodePreviewTabs({ codeContent, previewContent, tabSx }: {
  codeContent: ReactNode
  previewContent: ReactNode
  tabSx?: object
}) {
  const [tab, setTab] = useState(0)
  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, ...tabSx }}>
        <Tab label="Code" sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
        <Tab label="Preview" sx={{ minHeight: 36, fontSize: '0.78rem', py: 0 }} />
      </Tabs>
      {tab === 0 && codeContent}
      {tab === 1 && previewContent}
    </>
  )
}
