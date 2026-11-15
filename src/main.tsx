import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/playfair-display/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import './styles/tokens.css'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    window.setInterval(() => {
      if (!navigator.onLine) return

      void registration.update().catch((error: unknown) => {
        console.error('Échec de la vérification des mises à jour DONMEN.', error)
      })
    }, 60_000)
  },
  onRegisterError(error) {
    console.error('Échec de l’enregistrement du Service Worker DONMEN.', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
