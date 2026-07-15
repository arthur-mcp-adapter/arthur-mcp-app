import type { toolToFormState } from '../utils'

export interface ToolOutputTemplateSectionProps {
  projectId: string
  projectBaseUrl: string
  form: ReturnType<typeof toolToFormState>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof toolToFormState>>>
}
