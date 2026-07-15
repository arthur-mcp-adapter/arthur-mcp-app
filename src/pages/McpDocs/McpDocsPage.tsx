import { Alert, Box, Button, CircularProgress } from '@mui/material'
import { IconArrowLeft } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import type { DocsProject } from './docsProject.interface'
import { McpDocsContent } from './McpDocs'

export default function McpDocsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('servers')
  const [project, setProject] = useState<DocsProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<DocsProject>(`/swagger/servers/${id}`)
      .then((response) => setProject(response.data))
      .catch(() => setError(t('docs.serverNotFound')))
      .finally(() => setLoading(false))
  }, [id, t])

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
  if (error || !project) return <Box p={3}><Alert severity="error">{error || t('docs.loadError')}</Alert></Box>

  return (
    <Box>
      <Button size="small" startIcon={<IconArrowLeft size={18} />} onClick={() => navigate(`/servers/${id}`)} sx={{ mb: 2 }}>
        {t('docs.backToServer')}
      </Button>
      <McpDocsContent project={project} projectId={id!} />
    </Box>
  )
}
