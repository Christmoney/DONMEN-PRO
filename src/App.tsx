import { useState } from 'react'
import type { FormEvent } from 'react'
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
import { clientSignupSchema, hairdresserSignupSchema } from './features/auth/validation'
import Bienvenue from './pages/Bienvenue'

const featureOptions = ['Tresses', 'Tissage', 'Coupe', 'Soins', 'Coloration']
const hairTypes = ['Lisses', 'Ondulés', 'Bouclés', 'Crépus']
const scalpTypes = ['Sec', 'Gras', 'Sensible']
const goals = ['Hydratation', 'Pousse', 'Réparation', 'Protéger mes tresses']
const signupValidationKeys: Record<string, string> = {
  username: 'username',
  firstName: 'firstName',
  phone: 'phone',
  password: 'password',
  gender: 'gender',
  acceptedTerms: 'terms',
  lastName: 'lastName',
  city: 'city',
  coverageAreas: 'areas',
  specialties: 'specialties',
  yearsExperience: 'experience',
}

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

function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  help,
  error,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  help?: string
  error?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        type={type}
        className="field-input"
        placeholder={placeholder}
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={help ? `${id}-help` : undefined}
      />
      {help ? <small id={`${id}-help`} className="field-help">{help}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
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

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login, configured } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [showResetMessage, setShowResetMessage] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(username, password)
      const state = location.state as { from?: { pathname?: string } } | null
      navigate(state?.from?.pathname || '/', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.incorrectCredentials'))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <BrandMark showBack onBack={() => navigate('/bienvenue')} />
      <div className="auth-panel">
        <h1>{t('auth.reconnect')}</h1>
        <p>{t('auth.loginSubtitle')}</p>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <Field label={t('auth.usernameOrPhone')} value={username} onChange={setUsername} />
          <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} />
          {error ? <div className="error-banner" role="alert">{error}</div> : null}
          {!configured ? <p className="auth-note" role="status">{t('auth.supabaseLoginSetup')}</p> : null}
          <Button fullWidth type="submit" disabled={pending || !configured}>{pending ? t('auth.connecting') : t('auth.loginAction')}</Button>
        </form>
        <button type="button" className="link-button" onClick={() => setShowResetMessage(true)}>{t('auth.forgotPassword')}</button>
        {showResetMessage ? <p className="auth-note" role="status">{t('auth.resetMessage')}</p> : null}
        <p className="welcome-footer">
          {t('auth.notRegistered')} <button type="button" className="link-button" onClick={() => navigate('/bienvenue')}>{t('auth.createAccount')}</button>
        </p>
      </div>
    </main>
  )
}

function SignupPage({ role }: { role: 'client' | 'hairdresser' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signup, configured } = useAuth()
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'female' | 'male' | ''>('')
  const [city, setCity] = useState('')
  const [coverageAreas, setCoverageAreas] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [yearsExperience, setYearsExperience] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const values = {
      username,
      firstName,
      phone,
      password,
      gender,
      acceptedTerms: accepted,
      ...(role === 'hairdresser'
        ? {
            lastName,
            city,
            coverageAreas,
            specialties,
            yearsExperience: yearsExperience === '' ? Number.NaN : Number(yearsExperience),
          }
        : {}),
    }
    const parsed = (role === 'client' ? clientSignupSchema : hairdresserSignupSchema).safeParse(values)
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? '')
      setError(t(`auth.validation.${signupValidationKeys[field] ?? 'invalid'}`))
      return
    }

    setPending(true)
    try {
      await signup(parsed.data)
      navigate(role === 'client' ? '/' : '/pro', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Impossible de créer le compte.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <BrandMark showBack onBack={() => navigate('/bienvenue')} />
      <div className="auth-panel">
        <h1>{role === 'client' ? t('auth.clientTitle') : t('auth.hairdresserTitle')}</h1>
        <p>{role === 'client' ? t('auth.clientSubtitle') : t('auth.hairdresserSubtitle')}</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <Field label={t('auth.username')} value={username} onChange={setUsername} help={t('auth.usernameHelp')} />
          <Field label={t('auth.firstName')} value={firstName} onChange={setFirstName} placeholder={t('auth.firstNamePlaceholder')} help={t('auth.firstNameHint', { honorific: HONORIFIC })} />
          {role === 'hairdresser' ? <Field label={t('auth.lastName')} value={lastName} onChange={setLastName} placeholder={t('auth.lastNamePlaceholder')} /> : null}
          <Field label={t('auth.phone')} value={phone} onChange={setPhone} placeholder={t('auth.phonePlaceholder')} />
          <Field label={t('auth.password')} type="password" value={password} onChange={setPassword} help={t('auth.passwordHelp')} />
          <span className="field-label">{t('auth.gender')}</span>
          <div className="segment-row">
            <Chip selected={gender === 'female'} onClick={() => setGender('female')}>{t('auth.female')}</Chip>
            <Chip selected={gender === 'male'} onClick={() => setGender('male')}>{t('auth.male')}</Chip>
          </div>
          {role === 'hairdresser' ? (
            <>
              <Field label={t('auth.city')} value={city} onChange={setCity} placeholder="Ex. Douala" />
              <Field label={t('auth.areas')} value={coverageAreas} onChange={setCoverageAreas} placeholder="Ex. Bonanjo, Akwa" />
              <div className="field">
                <span className="field-label">{t('auth.specialties')}</span>
                <div className="feature-list">
                  {featureOptions.map((label) => {
                    const selected = specialties.includes(label)
                    return (
                      <Chip
                        key={label}
                        selected={selected}
                        onClick={() => setSpecialties((current) => selected ? current.filter((value) => value !== label) : [...current, label])}
                      >
                        {label}
                      </Chip>
                    )
                  })}
                </div>
              </div>
              <Field label={t('auth.experience')} type="number" value={yearsExperience} onChange={setYearsExperience} />
            </>
          ) : null}

          <label className="checkbox-row">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>{t('auth.terms')}</span>
          </label>
          {error ? <div className="error-banner" role="alert">{error}</div> : null}
          {!configured ? <p className="auth-note" role="status">{t('auth.supabaseSignupSetup')}</p> : null}
          <Button fullWidth type="submit" disabled={pending || !configured}>{pending ? t('auth.creating') : t('auth.createAccountAction')}</Button>
        </form>
        <p className="auth-note">{role === 'client' ? t('auth.notes') : t('auth.profileNote')}</p>
      </div>
    </main>
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

function ProfilePage({ profile, onLogout }: { profile: { first_name: string; username: string; phone: string } | null; onLogout: () => Promise<void> }) {
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
