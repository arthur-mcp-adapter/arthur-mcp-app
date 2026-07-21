import type { DocsRef } from './docsRef.interface'

export interface HelpButtonProps {
  title: string
  children: React.ReactNode
  /**
   * Related arthurmcp.io pages, each given as a canonical suffix (no locale
   * prefix) per locale — e.g. `{ en: 'Dynamic-Tools', ptBR: 'Dynamic-Tools' }`.
   * The two locales don't share a derivable slug (some pt-BR guides keep the
   * English "How-to-…" title, others are fully translated), so both must be
   * given explicitly for every entry. Renders a "Documentation" section
   * listing one link per entry, each pointing at the page matching the
   * current app locale and opened in a new tab. List as many as are genuinely
   * relevant to this help topic (a how-to guide, its "what/why" concept page,
   * etc.) — omit entirely when no page covers the topic.
   */
  docsRefs?: DocsRef[]
}
