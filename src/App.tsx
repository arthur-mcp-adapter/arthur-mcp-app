import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ServerNavProvider } from './context/ServerNavContext'
import { Layout } from './components/templates'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Servers from './pages/Servers'
import NewServer from './pages/NewServer'
import ServerDetail from './pages/ServerDetail'
import McpDocs from './pages/McpDocs'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import AuditLogs from './pages/AuditLogs'
import SetupWizard from './pages/SetupWizard'
import SharePage from './pages/SharePage'
import Templates from './pages/Templates'
import Prompts from './pages/Prompts'
import NewPrompt from './pages/NewPrompt'
import PromptDetail from './pages/PromptDetail'
import PromptTemplates from './pages/PromptTemplates'
import Secrets from './pages/Secrets'
import NewSecret from './pages/NewSecret'
import SecretDetail from './pages/SecretDetail'
import AiProviders from './pages/AiProviders'
import NewAiProvider from './pages/NewAiProvider'
import AiProviderDetail from './pages/AiProviderDetail'
import Observability from './pages/Observability'
import ErrorTracking from './pages/ErrorTracking'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireSetup({ children }: { children: React.ReactNode }) {
  const done = localStorage.getItem('setupComplete')
  return done ? <>{children}</> : <Navigate to="/setup" replace />
}

export default function App() {
  return (
    <AuthProvider>
    <ServerNavProvider>
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/share/:token" element={<SharePage />} />

        {/* Setup wizard — shown once after first login */}
        <Route path="/setup" element={
          <RequireAuth><SetupWizard /></RequireAuth>
        } />

        {/* Protected app */}
        <Route path="/*" element={
          <RequireAuth>
            <RequireSetup>
              <Layout>
                <Routes>
                  <Route path="/" element={<Servers />} />
                  <Route path="/servers/new" element={<NewServer />} />
                  <Route path="/servers/:id" element={<ServerDetail />} />
                  <Route path="/servers/:id/docs" element={<McpDocs />} />
<Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/prompts" element={<Prompts />} />
                  <Route path="/prompts/new" element={<NewPrompt />} />
                  <Route path="/prompts/:id" element={<PromptDetail />} />
                  <Route path="/prompt-templates" element={<PromptTemplates />} />
                  <Route path="/secrets" element={<Secrets />} />
                  <Route path="/secrets/new" element={<NewSecret />} />
                  <Route path="/secrets/:id" element={<SecretDetail />} />
                  <Route path="/ai-providers" element={<AiProviders />} />
                  <Route path="/ai-providers/new" element={<NewAiProvider />} />
                  <Route path="/ai-providers/:id" element={<AiProviderDetail />} />
                  <Route path="/observability" element={<Observability />} />
                  <Route path="/observability/new" element={<Navigate to="/observability" replace />} />
                  <Route path="/observability/:id" element={<Navigate to="/observability" replace />} />
                  <Route path="/error-tracking" element={<ErrorTracking />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </RequireSetup>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
    </ServerNavProvider>
    </AuthProvider>
  )
}
