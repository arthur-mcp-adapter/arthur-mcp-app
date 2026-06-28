import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import enLayout from './locales/en/layout.json'
import enAuth from './locales/en/auth.json'
import enServers from './locales/en/servers.json'
import enServerDetail from './locales/en/serverDetail.json'
import enPrompts from './locales/en/prompts.json'
import enSecrets from './locales/en/secrets.json'
import enSettings from './locales/en/settings.json'
import enDashboard from './locales/en/dashboard.json'
import enAudit from './locales/en/audit.json'
import enProfile from './locales/en/profile.json'
import enAiProviders from './locales/en/aiProviders.json'
import enObservability from './locales/en/observability.json'
import enErrorTracking from './locales/en/errorTracking.json'

import ptCommon from './locales/pt-BR/common.json'
import ptLayout from './locales/pt-BR/layout.json'
import ptAuth from './locales/pt-BR/auth.json'
import ptServers from './locales/pt-BR/servers.json'
import ptServerDetail from './locales/pt-BR/serverDetail.json'
import ptPrompts from './locales/pt-BR/prompts.json'
import ptSecrets from './locales/pt-BR/secrets.json'
import ptSettings from './locales/pt-BR/settings.json'
import ptDashboard from './locales/pt-BR/dashboard.json'
import ptAudit from './locales/pt-BR/audit.json'
import ptProfile from './locales/pt-BR/profile.json'
import ptAiProviders from './locales/pt-BR/aiProviders.json'
import ptObservability from './locales/pt-BR/observability.json'
import ptErrorTracking from './locales/pt-BR/errorTracking.json'

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        layout: enLayout,
        auth: enAuth,
        servers: enServers,
        serverDetail: enServerDetail,
        prompts: enPrompts,
        secrets: enSecrets,
        settings: enSettings,
        dashboard: enDashboard,
        audit: enAudit,
        profile: enProfile,
        aiProviders: enAiProviders,
        observability: enObservability,
        errorTracking: enErrorTracking,
      },
      'pt-BR': {
        common: ptCommon,
        layout: ptLayout,
        auth: ptAuth,
        servers: ptServers,
        serverDetail: ptServerDetail,
        prompts: ptPrompts,
        secrets: ptSecrets,
        settings: ptSettings,
        dashboard: ptDashboard,
        audit: ptAudit,
        profile: ptProfile,
        aiProviders: ptAiProviders,
        observability: ptObservability,
        errorTracking: ptErrorTracking,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
    interpolation: { escapeValue: false },
  })

export default i18next
