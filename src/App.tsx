import { useState } from 'react'
import {
  CalendarRange,
  Droplets,
  House,
  MapPin,
  Scissors,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { HONORIFIC } from './config/brand'
import BrandMark from './components/brand/BrandMark'
import { hairdressers, services, timeSlots } from './data/mock'
import { useAuth } from './features/auth/AuthProvider'
import type { AppRole } from './features/auth/AuthProvider'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from './features/auth/AuthPages'
import Bienvenue from './pages/Bienvenue'

const hairTypes = ['Lisses', 'Ondulés', 'Bouclés', 'Crépus']
const scalpTypes = ['Sec', 'Gras', 'Sensible']
const goals = ['Hydratation', 'Pousse', 'Réparation', 'Protéger mes tresses']

function App() {
  const { user, profile, loading, error, logout } = useAuth()

  if (loading) {
    return <main className="auth-shell"><p>Chargement de votre session…</p></main>
  }

  if (user && !profile) {
    return <AuthProfileUnavailable error={error} onLogout={logout} />
  }

  const session = {
    loggedIn: Boolean(user && profile),
    role: profile?.role ?? 'client',
    firstName: profile?.first_name ?? '',
  }

  return (
    <Routes>
      <Route path="/bienvenue" element={<PublicOnly session={session}><Bienvenue /></PublicOnly>} />
      <Route path="/connexion" element={<PublicOnly session={session}><LoginPage /></PublicOnly>} />
      <Route path="/inscription/client" element={<PublicOnly session={session}><SignupPage role="client" /></PublicOnly>} />
      <Route path="/inscription/coiffeur" element={<PublicOnly session={session}><SignupPage role="hairdresser" /></PublicOnly>} />
      <Route path="/mot-de-passe-oublie" element={<PublicOnly session={session}><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

      <Route path="/" element={<ProtectedRoute session={session} allowedRoles={['client']}><ClientHomePage firstName={session.firstName} /></ProtectedRoute>} />
      <Route path="/coiffeurs" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairdressersPage /></ProtectedRoute>} />
      <Route path="/coiffeurs/:id" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairdresserDetailPage /></ProtectedRoute>} />
      <Route path="/reserver/:coiffeurId" element={<ProtectedRoute session={session} allowedRoles={['client']}><BookingPage /></ProtectedRoute>} />
      <Route path="/mes-rdv" element={<ProtectedRoute session={session} allowedRoles={['client']}><AppointmentsPage /></ProtectedRoute>} />
      <Route path="/mes-cheveux" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairProfilePage /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute session={session} allowedRoles={['client']}><ProfilePage profile={profile} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/pro" element={<ProtectedRoute session={session} allowedRoles={['hairdresser']}><ProPage firstName={session.firstName} /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute session={session} allowedRoles={['admin']}><AdminPlaceholder onLogout={logout} /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={session.loggedIn ? (session.role === 'client' ? '/' : session.role === 'hairdresser' ? '/pro' : '/admin') : '/bienvenue'} replace />} />
    </Routes>
  )
}

function PublicOnly({ session, children }: { session: { loggedIn: boolean; role: AppRole }; children: React.ReactNode }) {
  if (session.loggedIn) {
    return <Navigate to={session.role === 'client' ? '/' : session.role === 'hairdresser' ? '/pro' : '/admin'} replace />
  }
  return <>{children}</>
}

function ProtectedRoute({ session, allowedRoles, children }: { session: { loggedIn: boolean; role: AppRole }; allowedRoles: AppRole[]; children: React.ReactNode }) {
  const location = useLocation()
  if (!session.loggedIn) {
    return <Navigate to="/bienvenue" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={session.role === 'client' ? '/' : session.role === 'hairdresser' ? '/pro' : '/admin'} replace />
  }

  return <>{children}</>
}

function Greeting({ firstName, subtitle }: { firstName: string; subtitle?: string }) {
  const { isNewSignup } = useAuth()
  const { t } = useTranslation()
  return (
    <div className="greeting-wrap">
      <h2 className="greeting-title">
        {isNewSignup && firstName
          ? t('home.welcomeGreeting', { honorific: HONORIFIC, firstName })
          : firstName
            ? t('home.greeting', { honorific: HONORIFIC, firstName })
            : t('home.greetingEmpty', { honorific: HONORIFIC })}
      </h2>
      <p className="greeting-subtitle">{subtitle ?? t('home.ready')}</p>
    </div>
  )
}

function Button({ children, variant = 'primary', fullWidth = false, type = 'button', onClick, disabled = false }: { children: React.ReactNode; variant?: 'primary' | 'secondary'; fullWidth?: boolean; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type={type} className={`action-button ${variant} ${fullWidth ? 'full' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function Chip({ selected, children, onClick }: { selected?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className={`chip ${selected ? 'selected' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function BottomNav() {
  const navItems = [
    { label: 'Accueil', to: '/', icon: House },
    { label: 'Coiffeurs', to: '/coiffeurs', icon: Scissors },
    { label: 'Mes cheveux', to: '/mes-cheveux', icon: Droplets },
    { label: 'Mes RDV', to: '/mes-rdv', icon: CalendarRange },
    { label: 'Profil', to: '/profil', icon: UserRound },
  ]

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {navItems.map(({ label, to, icon: Icon }) => (
        <NavLink key={label} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function ClientHomePage({ firstName }: { firstName: string }) {
  const navigate = useNavigate()

  return (
    <main className="page-shell client-page">
      <BrandMark />
      <div className="page-body">
        <Greeting firstName={firstName} />
        <section className="hero-card">
          <h3>Votre coiffeur, chez vous.</h3>
          <p>Réservez en moins de 3 minutes.</p>
          <Button onClick={() => navigate('/coiffeurs')}>Réserver un coiffeur</Button>
        </section>

        <div className="title-row">
          <h3>Coiffeurs en vedette</h3>
        </div>
        <div className="hairdresser-grid">
          {hairdressers.slice(0, 2).map((hairdresser) => (
            <article key={hairdresser.id} className="hairdresser-card" onClick={() => navigate(`/coiffeurs/${hairdresser.id}`)}>
              <div className="hairdresser-top">
                <div className="avatar">{hairdresser.avatar}</div>
                <div>
                  <strong>{hairdresser.name}</strong>
                  <div className="meta-line"><Star size={14} /> {hairdresser.rating}/5</div>
                </div>
              </div>
              <p className="card-copy">{hairdresser.specialties.join(' · ')} · {hairdresser.zone}</p>
            </article>
          ))}
        </div>

        <section className="info-card">
          <h4>Votre fiche cheveux</h4>
          <p>Dites-nous quel type de cheveux vous avez : on vous conseille les bons soins.</p>
          <Button variant="secondary" onClick={() => navigate('/mes-cheveux')}>Compléter</Button>
        </section>
      </div>
      <BottomNav />
    </main>
  )
}

function HairdressersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <input
          className="search-box"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un coiffeur ou un service"
          aria-label="Rechercher un coiffeur ou un service"
        />
        <div className="segment-row">
          <Chip>Zone</Chip>
          <Chip>Prix</Chip>
          <Chip>Note</Chip>
          <Chip>Disponible</Chip>
        </div>

        {hairdressers.map((hairdresser) => (
          <article key={hairdresser.id} className="list-card" onClick={() => navigate(`/coiffeurs/${hairdresser.id}`)}>
            <div className="avatar">{hairdresser.avatar}</div>
            <div className="list-card-body">
              <div className="list-row">
                <strong>{hairdresser.name}</strong>
                <div className="fee-box">
                  <span>{hairdresser.rating}/5</span>
                  <small>dès {hairdresser.price.toLocaleString('fr-FR')} FCFA</small>
                </div>
              </div>
              <p>{hairdresser.specialties.join(' · ')} · {hairdresser.zone}</p>
            </div>
          </article>
        ))}
      </div>
      <BottomNav />
    </main>
  )
}

function HairdresserDetailPage() {
  const { id } = useParams()
  const hairdresser = hairdressers.find((entry) => entry.id === Number(id)) ?? hairdressers[0]
  const navigate = useNavigate()

  return (
    <main className="page-shell detail-page">
      <BrandMark showBack onBack={() => navigate('/coiffeurs')} />
      <div className="page-body compact">
        <div className="detail-header">
          <div className="avatar large">{hairdresser.avatar}</div>
          <div>
            <h2>{hairdresser.name}</h2>
            <div className="meta-line"><Star size={14} /> {hairdresser.rating}/5</div>
            <p>{hairdresser.bio}</p>
          </div>
        </div>

        <div className="gallery-grid">
          {['A', 'B', 'C'].map((slot) => (
            <div key={slot} className="gallery-card">{slot}</div>
          ))}
        </div>

        <div className="service-list">
          {services.map((service) => (
            <div key={service.id} className="service-row">
              <div>
                <strong>{service.name}</strong>
                <small>{service.duration}</small>
              </div>
              <span>{service.price.toLocaleString('fr-FR')} FCFA</span>
            </div>
          ))}
        </div>

        <Button fullWidth onClick={() => navigate(`/reserver/${hairdresser.id}`)}>Réserver</Button>
      </div>
    </main>
  )
}

function BookingPage() {
  const { coiffeurId } = useParams()
  const navigate = useNavigate()
  const hairdresser = hairdressers.find((entry) => entry.id === Number(coiffeurId)) ?? hairdressers[0]

  return (
    <main className="page-shell booking-shell">
      <div className="page-body compact booking-body">
        <div className="booking-head">
          <span>Étape 3 sur 5</span>
          <h2>Date et heure</h2>
        </div>
        <div className="stepper">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={`step ${index < 2 ? 'done' : ''}`} />
          ))}
        </div>

        <div className="days-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((day, index) => (
            <Chip key={day} selected={index === 2}>{day}</Chip>
          ))}
        </div>

        <div className="booking-section-title">Créneaux libres</div>
        <div className="slots-grid">
          {timeSlots.map((slot) => (
            <Chip key={slot}>{slot}</Chip>
          ))}
        </div>
      </div>
      <div className="booking-footer">
        <div>
          <span>Tresses · 2 h 30</span>
          <strong>{hairdresser.price.toLocaleString('fr-FR')} FCFA</strong>
        </div>
        <Button onClick={() => navigate('/mes-rdv')}>Continuer</Button>
      </div>
    </main>
  )
}

function AppointmentsPage() {
  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <div className="segment-row">
          <Chip selected>À venir</Chip>
          <Chip>Passés</Chip>
        </div>

        <div className="appointment-card">
          <div className="appointment-header">
            <strong>Samedi 14 juin · 08:30</strong>
            <span className="status-badge accepted">Accepté</span>
          </div>
          <p>Tresses · 2 h 30</p>
          <div className="timeline">
            {['Demande envoyée', 'Acceptée', 'Coiffeur en route', 'Prestation en cours', 'Terminée'].map((step, index) => (
              <div key={step} className="timeline-item">
                <span className={`timeline-dot ${index < 2 ? 'done' : ''}`} />
                <span>{step}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => {}}>Annuler</Button>
        </div>

        <div className="last-card">
          <div className="title-row">
            <h3>Dernier rendez-vous</h3>
          </div>
          <div className="service-box">Terminé · avec Aline</div>
          <Button onClick={() => {}}>Réserver à nouveau</Button>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}

function HairProfilePage() {
  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <h2>Ma fiche cheveux</h2>
        <p className="muted">Aide votre coiffeur et nous permet de vous conseiller.</p>
        <div className="feature-group">
          <h4>Type de cheveux</h4>
          <div className="segment-row wrap">
            {hairTypes.map((type) => <Chip key={type}>{type}</Chip>)}
          </div>
        </div>
        <div className="feature-group">
          <h4>Cuir chevelu</h4>
          <div className="segment-row wrap">
            {scalpTypes.map((type) => <Chip key={type}>{type}</Chip>)}
          </div>
        </div>
        <div className="feature-group">
          <h4>Objectifs</h4>
          <div className="segment-row wrap">
            {goals.map((goal) => <Chip key={goal}>{goal}</Chip>)}
          </div>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" defaultChecked />
          <span>J'accepte que ces informations servent à mieux me conseiller.</span>
        </label>
        <Button fullWidth>Enregistrer</Button>
      </div>
      <BottomNav />
    </main>
  )
}

function ProfilePage({ profile, onLogout }: { profile: { first_name: string; username: string; phone: string | null } | null; onLogout: () => Promise<void> }) {
  const [message, setMessage] = useState('')

  const handleLogout = async () => {
    setMessage('')
    try {
      await onLogout()
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : 'La déconnexion a échoué.')
    }
  }

  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <div className="profile-box">
          <div className="avatar large">{profile?.first_name.slice(0, 1).toUpperCase() ?? '?'}</div>
          <div>
            <h3>{profile?.first_name ?? ''}</h3>
            <p>@{profile?.username ?? ''}</p>
            <p>{profile?.phone ?? ''}</p>
          </div>
        </div>
        <div className="profile-list">
          <div className="profile-item"><MapPin size={16} /> Adresse enregistrée</div>
          <div className="profile-item"><ShieldCheck size={16} /> Langue FR / EN</div>
          <button type="button" className="text-button" onClick={() => void handleLogout()}>Se déconnecter</button>
          <button type="button" className="text-button danger" onClick={() => setMessage('La demande de suppression de compte sera disponible prochainement.')}>Demander la suppression de mon compte</button>
          {message ? <p className="auth-note" role="status">{message}</p> : null}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}

function ProPage({ firstName }: { firstName: string }) {
  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <Greeting firstName={firstName} subtitle="Voici votre espace DONMEN." />
        <div className="info-card accent">
          <h4>Profil en cours de vérification</h4>
          <p>Votre profil est en cours de vérification avant d'apparaître aux clients.</p>
        </div>
      </div>
    </main>
  )
}

function AdminPlaceholder({ onLogout }: { onLogout: () => Promise<void> }) {
  const [error, setError] = useState('')

  const handleLogout = async () => {
    setError('')
    try {
      await onLogout()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'La déconnexion a échoué.')
    }
  }

  return (
    <main className="auth-shell">
      <BrandMark />
      <div className="auth-panel">
        <h1>Espace administrateur</h1>
        <p>Le back-office sera disponible dans la phase 5.</p>
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <Button fullWidth onClick={() => void handleLogout()}>Se déconnecter</Button>
      </div>
    </main>
  )
}

function AuthProfileUnavailable({ error, onLogout }: { error: string | null; onLogout: () => Promise<void> }) {
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    setLogoutError('')
    try {
      await onLogout()
    } catch (caughtError) {
      setLogoutError(caughtError instanceof Error ? caughtError.message : 'La déconnexion a échoué.')
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <h1>Profil indisponible</h1>
        <p>{error ?? 'Impossible de charger votre profil.'}</p>
        {logoutError ? <div className="error-banner" role="alert">{logoutError}</div> : null}
        <Button fullWidth onClick={() => void handleLogout()}>Se déconnecter</Button>
      </div>
    </main>
  )
}

export default App
