import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { SLOGAN } from '../config/brand'

export default function Bienvenue() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <main className="welcome-screen">
      <div className="welcome-card">
        <picture className="welcome-logo">
          <source srcSet="/brand/donmen-logo-transparent.webp" type="image/webp" />
          <img
            className="welcome-logo-image"
            src="/brand/donmen-logo-transparent.png"
            alt="DONMEN"
            width="640"
            height="367"
            fetchPriority="high"
          />
        </picture>
        <div className="welcome-slogan">{SLOGAN}</div>
        <h1>{t('auth.welcome')}</h1>
        <p>{t('home.heroTitle')}</p>
        <div className="stacked-actions">
          <Link className="action-button primary full" to="/inscription/client">
            {t('auth.client')}
          </Link>
          <Link className="action-button secondary full" to="/inscription/coiffeur">
            {t('auth.hairdresser')}
          </Link>
        </div>
        <p className="welcome-footer">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link className="link-button" to="/connexion" state={location.state}>
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </main>
  )
}
