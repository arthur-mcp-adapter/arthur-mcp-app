import { useState } from 'react'
import type { SecretEntry } from '../secretEntry.interface'
import { useEffect } from 'react'
import api from '../../../../api'

export function useSecrets() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<SecretEntry[]>('/secrets')
      .then((r) => setSecrets(r.data))
      .finally(() => setLoading(false))
  }, [])

  return { secrets, loading }
}
