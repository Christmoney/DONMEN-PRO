import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SLOGAN } from '../../config/brand'

type BrandMarkProps = {
  showBack?: boolean
  onBack?: () => void
}

export default function BrandMark({ showBack = false, onBack }: BrandMarkProps) {
  const { t } = useTranslation()

  return (
    <header className={`brand-header ${showBack ? 'with-back' : ''}`}>
      {showBack ? (
        <button type="button" className="back-button" onClick={onBack} aria-label={t('auth.back')}>
          <ChevronLeft size={18} />
          <span>{t('auth.back')}</span>
        </button>
      ) : null}
      <div className="brand-mark" aria-label="DONMEN brand">
        <img
          className="brand-crown"
          src="/brand/donmen-couronne-transparent.png"
          alt=""
          width="38"
          height="38"
        />
        <div className="brand-text-group">
          <div className="brand-name">DONMEN</div>
          <div className="brand-slogan">{SLOGAN}</div>
        </div>
      </div>
    </header>
  )
}
