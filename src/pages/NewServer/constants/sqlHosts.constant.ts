import type { SourceType } from '../sourceType.type'

export // Databases that use the standard host/port/database/user/password/SSL form
const SQL_HOSTS: SourceType[] = ['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'cockroachdb', 'clickhouse', 'cassandra']
