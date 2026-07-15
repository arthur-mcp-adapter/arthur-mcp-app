import type { ServerDetailNav } from './serverDetailNav.interface'

export interface ServerNavContextValue {
  serverDetail: ServerDetailNav | null
  setServerDetail: (detail: ServerDetailNav | null) => void
}
