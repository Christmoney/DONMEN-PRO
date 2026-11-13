import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import fr from './i18n/locales/fr.json'
import en from './i18n/locales/en.json'

const defaultLanguage = typeof window !== 'undefined' ? (localStorage.getItem('donmen-lang') ?? 'fr') : 'fr'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: defaultLanguage,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language
  i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language
    localStorage.setItem('donmen-lang', language)
  })
}

export default i18n
