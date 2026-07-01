import { useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Drawer,
  IconButton, Paper, Tooltip, Typography,
  TextField,
} from '@mui/material'
import {
  IconCopy, IconDownload, IconQrcode, IconShare, IconWorld, IconX,
} from '@tabler/icons-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useTranslation } from 'react-i18next'
import { useAuth, Permission } from '../../../../context/AuthContext'
import api from '../../../../api'
import { HelpButton } from '../../../../components'
import { backendUrl } from '../../../../config/urls'

export function McpEndpointBar({ projectId, hasKeys, shareSlug, onShareSlugChange }: {
  projectId: string
  hasKeys: boolean
  shareSlug?: string | null
  onShareSlugChange?: (shareSlug: string) => void
}) {
  const { t } = useTranslation('serverDetail')
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [slugDraft, setSlugDraft] = useState(shareSlug ?? '')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [slugSaved, setSlugSaved] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const endpointIdentifier = shareSlug?.trim() || projectId
  const url = backendUrl(`/api/mcp/server/${endpointIdentifier}`)
  const { can } = useAuth()

  useEffect(() => {
    setSlugDraft(shareSlug ?? '')
  }, [shareSlug])

  const handleShareOpen = async () => {
    setShareOpen(true)
    if (shareLink) return
    setShareLoading(true)
    try {
      const { data } = await api.post<{ url: string; shareSlug?: string }>(`/swagger/servers/${projectId}/share-link`)
      setShareLink(data.url)
      if (data.shareSlug) onShareSlugChange?.(data.shareSlug)
    } catch { setShareLink('') } finally { setShareLoading(false) }
  }

  const fullShareLink = shareLink ? `${window.location.origin}${shareLink}` : ''

  const handleDownloadQrCode = () => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${slugDraft.trim() || 'mcp-server'}-qr-code.png`
      link.href = objectUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    }, 'image/png')
  }

  const handleSlugSave = async () => {
    const value = slugDraft.trim()
    if (!value) return
    setSlugSaving(true)
    setSlugError('')
    setSlugSaved(false)
    try {
      const { data } = await api.patch<{ shareSlug?: string }>(`/swagger/servers/${projectId}/share-slug`, { shareSlug: value })
      const saved = data.shareSlug ?? value
      setSlugDraft(saved)
      setShareLink('')
      onShareSlugChange?.(saved)
      setSlugSaved(true)
      setTimeout(() => setSlugSaved(false), 2500)
    } catch (err: any) {
      setSlugError(err?.response?.data?.message ?? t('error.slugSaveFailed'))
    } finally {
      setSlugSaving(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <IconWorld size={18} style={{ color: '#5D87FF' }} />
        <Typography variant="subtitle1" fontWeight={700} flexGrow={1}>{t('heading.connectionUrl')}</Typography>
        {can(Permission.ServersShare) && <Tooltip title={t('action.shareWithClient')}>
          <Button size="small" variant="outlined" startIcon={<IconShare size={18} />} onClick={handleShareOpen}>
            {t('connect.shareTitle')}
          </Button>
        </Tooltip>}
        <HelpButton title={t('label.mcpEndpoint')}>
          <Typography variant="body2" gutterBottom>
            {t('hint.shareDesc')}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {t('hint.accessKeyHint')}
          </Typography>
          <Typography variant="body2">
            {t('hint.publicAccess')}
          </Typography>
        </HelpButton>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <Box sx={{
          flexGrow: 1, fontFamily: 'monospace', fontSize: '0.82rem',
          bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1,
          px: 1.5, py: 1, color: 'text.primary', wordBreak: 'break-all',
        }}>
          {url}
        </Box>
        <Tooltip title={copied ? t('tooltip.copiedBang') : t('action.copyUrl')}>
          <IconButton size="small" color={copied ? 'primary' : 'default'}
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <IconCopy size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {hasKeys
          ? <>{t('label.authEndpoint')} <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.78rem' }}>auth: &lt;key&gt;</Box></>
          : t('label.publicEndpoint')}
      </Typography>

      {can(Permission.ServersEditSettings) && (
        <Box mt={2} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>{t('label.publicDocSlug')}</Typography>
          <Typography variant="body2" color="text.secondary" mb={1.25}>
            {t('hint.publicDocSlugFormat')} <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.6, py: 0.15, borderRadius: 0.5 }}>/mcp-swagger/{slugDraft || 'server-slug'}</Box>. {t('hint.publicDocSlugUnique')}
          </Typography>
          <Box display="flex" gap={1} alignItems="flex-start" flexDirection={{ xs: 'column', sm: 'row' }}>
            <TextField
              size="small"
              fullWidth
              label={t('label.shareSlug')}
              value={slugDraft}
              error={!!slugError}
              helperText={slugError || t('hint.shareSlugPattern')}
              onChange={(event) => { setSlugDraft(event.target.value); setSlugError(''); setSlugSaved(false) }}
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleSlugSave}
              disabled={slugSaving || !slugDraft.trim()}
              startIcon={slugSaving ? <CircularProgress size={14} /> : undefined}
              sx={{ mt: { sm: 0.25 }, whiteSpace: 'nowrap' }}
            >
              {slugSaving ? t('status.saving') : t('action.saveSlug')}
            </Button>
          </Box>
          {slugSaved && <Typography variant="caption" color="success.main" mt={0.75} display="block">{t('status.slugSaved')}</Typography>}
        </Box>
      )}

      {/* Share dialog */}
      <Drawer anchor="right" open={shareOpen} onClose={() => setShareOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <IconShare size={18} style={{ color: '#5D87FF' }} />
          <Typography variant="h6" fontWeight={700} flexGrow={1}>{t('connect.shareDrawerTitle')}</Typography>
          <IconButton size="small" onClick={() => setShareOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('hint.shareDesc')}
          </Typography>
          {shareLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          ) : fullShareLink ? (
            <>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, wordBreak: 'break-all' }}>
                  {fullShareLink}
                </Box>
                <Tooltip title={shareLinkCopied ? t('tooltip.copiedBang') : t('action.copyLink')}>
                  <IconButton size="small" color={shareLinkCopied ? 'primary' : 'default'}
                    onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={2}>
                <QRCodeCanvas ref={qrCanvasRef} value={fullShareLink} size={140} />
                <Typography variant="caption" color="text.disabled">{t('label.scanQr')}</Typography>
                <Button size="small" startIcon={<IconDownload size={16} />} onClick={handleDownloadQrCode}>
                  {t('action.downloadQr')}
                </Button>
              </Box>
              <Alert severity="info" icon={<IconQrcode size={18} />}>
                {t('label.shareValidityPermanent')}
              </Alert>
            </>
          ) : (
            <Alert severity="error">{t('error.shareGenFailed')}</Alert>
          )}
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setShareOpen(false)}>{t('common:action.close')}</Button>
          {fullShareLink && (
            <Button variant="contained" startIcon={<IconCopy size={18} />}
              onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
              {shareLinkCopied ? t('common:action.copied') : t('action.copyLink')}
            </Button>
          )}
        </Box>
      </Drawer>
    </Paper>
  )
}
