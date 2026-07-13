export async function fetchCatalogJson<T>(relativePath: string): Promise<T> {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  const response = await fetch(`${baseUrl}catalogs/${relativePath}`)

  if (!response.ok) {
    throw new Error(`Template catalog request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}
