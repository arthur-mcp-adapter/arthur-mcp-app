import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ColorModeProvider } from './theme/ColorModeContext'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </React.StrictMode>,
)
