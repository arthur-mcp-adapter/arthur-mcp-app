import type { SourceType } from '../sourceType.type'
import { SQL_HOSTS } from './sqlHosts.constant'

export const CONNECTION_MANAGED_SOURCES: SourceType[] = [
  ...SQL_HOSTS, 'mongodb', 'redis', 'firestore', 'dynamodb', 'elasticsearch', 'snowflake',
]
