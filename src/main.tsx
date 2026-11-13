import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/playfair-display/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './styles/tokens.css'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
