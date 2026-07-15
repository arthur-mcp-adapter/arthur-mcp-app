import type { DbConnectionConfig, DbQuery } from '../types'

export interface OperationsTabProps {
  projectId: string
  sourceType: string
  initialConnection?: DbConnectionConfig
  initialOperations?: DbQuery[]
  onChange: (connection: DbConnectionConfig, operations: DbQuery[]) => void
}
