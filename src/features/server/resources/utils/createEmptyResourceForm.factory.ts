import type { ResourceForm } from '../resourceForm.interface'

export function createEmptyResourceForm(): ResourceForm {
  return { name: '', uri: '', description: '', mimeType: 'text/html', content: '' }
}
