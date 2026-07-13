import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/auth'
import { ServerNavProvider } from './context'
import { Layout } from './components/templates'
import type { RequireAuthProps } from './requireAuthProps.interface'
import type { RequireSetupProps } from './requireSetupProps.interface'


const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Servers = lazy(() => import('./pages/Servers'))
const NewServer = lazy(() => import('./pages/NewServer'))
const ServerDetail = lazy(() => import('./pages/ServerDetail'))
const McpDocs = lazy(() => import('./pages/McpDocs'))
const Profile = lazy(() => import('./pages/Profile'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))
const SetupWizard = lazy(() => import('./pages/SetupWizard'))
const SharePage = lazy(() => import('./pages/SharePage'))
const Templates = lazy(() => import('./pages/Templates'))
const Prompts = lazy(() => import('./pages/Prompts'))
const NewPrompt = lazy(() => import('./pages/NewPrompt'))
const PromptDetail = lazy(() => import('./pages/PromptDetail'))
const PromptTemplates = lazy(() => import('./pages/PromptTemplates'))
const Secrets = lazy(() => import('./pages/Secrets'))
const NewSecret = lazy(() => import('./pages/NewSecret'))
const SecretDetail = lazy(() => import('./pages/SecretDetail'))
const AiProviders = lazy(() => import('./pages/AiProviders'))
const NewAiProvider = lazy(() => import('./pages/NewAiProvider'))
const AiProviderDetail = lazy(() => import('./pages/AiProviderDetail'))
const Observability = lazy(() => import('./pages/Observability'))
const ErrorTracking = lazy(() => import('./pages/ErrorTracking'))

function RequireAuth({ children }: RequireAuthProps) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireSetup({ children }: RequireSetupProps) {
  const done = localStorage.getItem('setupComplete')
  return done ? <>{children}</> : <Navigate to="/setup" replace />
}

export default function App() {
  return (
    <AuthProvider>
    <ServerNavProvider>
    <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mcp-swagger/:slug" element={<SharePage />} />
        <Route path="/mcp-swagger/:slug/:token" element={<SharePage />} />
        <Route path="/share/:slug/:token" element={<SharePage />} />
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
    </Suspense>
    </BrowserRouter>
    </ServerNavProvider>
    </AuthProvider>
  )
}
