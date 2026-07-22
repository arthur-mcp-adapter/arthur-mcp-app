import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import HelpIcon from '@mui/icons-material/Help'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useTranslation } from 'react-i18next'
import type { HelpButtonProps } from './helpButtonProps.interface'
import { DOCS_BASE_URL } from './docsBaseUrl.constant'

export default function HelpButton({ title, children, docsRefs }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  const { t, i18n } = useTranslation('common')
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isPtBR = i18n?.language?.toLowerCase().startsWith('pt')
  const docsLinks = (docsRefs ?? []).map((ref) => {
    const slug = (isPtBR ? ref.ptBR : ref.en).toLowerCase()
    return { slug, url: `${DOCS_BASE_URL}${isPtBR ? 'pt-br' : 'en'}-${slug}/` }
  })
  return (
    <>
      <Tooltip title={t('action.learnMore')}>
        <IconButton size="small" aria-label={t('action.learnMore')} onClick={() => setOpen(true)}
          sx={{
            p: 0.4,
            '&:hover': { bgcolor: 'primary' },
          }}>
          <HelpIcon color="primary" fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <HelpIcon color="primary" fontSize="small" />
          <Typography component="span" variant="subtitle1" fontWeight={700}>{title}</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ lineHeight: 1.6 }}>
          {children}
          {docsLinks.length > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1.8 }}>
                {t('label.documentation')}
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
                {docsLinks.map(({ slug, url }) => (
                  <Link
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}
                  >
                    {slug}
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('action.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
