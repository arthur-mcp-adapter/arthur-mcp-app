import { useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Drawer,
  IconButton, Paper, Tooltip, Typography,
} from '@mui/material'
import {
  IconCopy, IconQrcode, IconShare, IconWorld, IconX,
} from '@tabler/icons-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth, Permission } from '../../../../context/AuthContext'
import api from '../../../../api'
import { HelpButton } from '../../../../components'

export function McpEndpointBar({ projectId, hasKeys }: { projectId: string; hasKeys: boolean }) {
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const url = `${window.location.origin}/api/mcp/server/${projectId}`
  const { can } = useAuth()

  const handleShareOpen = async () => {
    setShareOpen(true)
    if (shareLink) return
    setShareLoading(true)
    try {
      const { data } = await api.post<{ url: string }>(`/swagger/servers/${projectId}/share-link`)
      setShareLink(data.url)
    } catch { setShareLink('') } finally { setShareLoading(false) }
  }

  const fullShareLink = shareLink ? `${window.location.origin}${shareLink}` : ''

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <IconWorld size={18} style={{ color: '#5D87FF' }} />
        <Typography variant="subtitle1" fontWeight={700} flexGrow={1}>Connection URL</Typography>
        {can(Permission.ServersShare) && <Tooltip title="Share setup instructions with a client">
          <Button size="small" variant="outlined" startIcon={<IconShare size={18} />} onClick={handleShareOpen}>
            Share with client
          </Button>
        </Tooltip>}
        <HelpButton title="MCP Endpoint">
          <Typography variant="body2" gutterBottom>
            The URL that MCP clients (Claude Desktop, Cursor, or any compatible client) use to connect to <em>this specific server's</em> tools.
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Share with client</strong> — generates a step-by-step setup page you can send to your client. The page includes a QR code and copy-ready configuration snippets for Claude Desktop, Cursor, and generic MCP clients.
          </Typography>
          <Typography variant="body2">
            If <strong>MCP Authentication</strong> is enabled, the client must include the header <code>auth: &lt;key&gt;</code> in every request. Without it the server returns HTTP 401.
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
        <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
          <IconButton size="small" color={copied ? 'primary' : 'default'}
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <IconCopy size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {hasKeys
          ? <>Configure this URL in your MCP client and include the header <Box component="code" sx={{ bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, fontSize: '0.78rem' }}>auth: &lt;key&gt;</Box></>
          : 'Configure this URL in Claude Desktop, Cursor, or any compatible MCP client.'}
      </Typography>

      {/* Share dialog */}
      <Drawer anchor="right" open={shareOpen} onClose={() => setShareOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <IconShare size={18} style={{ color: '#5D87FF' }} />
          <Typography variant="h6" fontWeight={700} flexGrow={1}>Share with client</Typography>
          <IconButton size="small" onClick={() => setShareOpen(false)}><IconX size={18} /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Send this link to anyone who needs to connect their AI client to this server. The page includes step-by-step instructions for Claude Desktop, Cursor, and a QR code for mobile.
          </Typography>
          {shareLoading ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          ) : fullShareLink ? (
            <>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Box sx={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1, wordBreak: 'break-all' }}>
                  {fullShareLink}
                </Box>
                <Tooltip title={shareLinkCopied ? 'Copied!' : 'Copy link'}>
                  <IconButton size="small" color={shareLinkCopied ? 'primary' : 'default'}
                    onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
                    <IconCopy size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={2}>
                <QRCodeSVG value={fullShareLink} size={140} />
                <Typography variant="caption" color="text.disabled">Scan to open on a mobile device</Typography>
              </Box>
              <Alert severity="info" icon={<IconQrcode size={18} />}>
                This link is valid for 30 days. It gives read-only setup information — no access to data or credentials.
              </Alert>
            </>
          ) : (
            <Alert severity="error">Could not generate the share link. Please try again.</Alert>
          )}
        </Box>
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button onClick={() => setShareOpen(false)}>Close</Button>
          {fullShareLink && (
            <Button variant="contained" startIcon={<IconCopy size={18} />}
              onClick={() => { navigator.clipboard.writeText(fullShareLink); setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2500) }}>
              {shareLinkCopied ? 'Copied!' : 'Copy link'}
            </Button>
          )}
        </Box>
      </Drawer>
    </Paper>
  )
}
