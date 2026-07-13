import { Paper, Typography } from '@mui/material'
import type { StatCardProps } from './statCardProps.interface'

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: color ? `${color}44` : 'divider' }}>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
  )
}
