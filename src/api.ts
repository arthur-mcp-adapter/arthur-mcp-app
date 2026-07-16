import axios from 'axios'
import { API_BASE_URL } from './config/urls'
import { supabase } from './supabaseClient'

const api = axios.create({ baseURL: API_BASE_URL })
let handlingUnauthorized = false

function isMcpClientRequest(url: unknown): boolean {
  return typeof url === 'string' && /(^|\/)mcp\//.test(url)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // MCP transport authentication is independent from the signed-in Arthur session.
    // A missing/invalid MCP API key must stay inside the test result instead of signing
    // the user out of Supabase.
    const isAppSessionUnauthorized = err.response?.status === 401 && !isMcpClientRequest(err.config?.url)
    if (isAppSessionUnauthorized && !handlingUnauthorized) {
      handlingUnauthorized = true
      // Also sign out of Supabase, not just clear the mirrored token — otherwise its own
      // session store still holds a (backend-rejected) session and resurrects `token` on reload.
      localStorage.removeItem('token')
      await supabase.auth.signOut()

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      } else {
        handlingUnauthorized = false
      }
    }
    return Promise.reject(err)
  },
)

export default api
