export interface ReimportSpecDialogProps {
  projectId: string
  open: boolean
  onClose: () => void
  onSuccess: (result: { added: number; updated: number; baseUrl: string }) => void
}
