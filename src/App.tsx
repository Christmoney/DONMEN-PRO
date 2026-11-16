import { lazy, Suspense, useEffect, useState } from 'react'
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
import {
  cancelBooking,
  createBooking,
  getAvailableSlots,
  getClientBookings,
  getHairdresserServices,
  getPublishedHairdressers,
} from './features/hairdressers/api'
import type { ClientBooking, Hairdresser, HairdresserService } from './features/hairdressers/types'
import { useAuth } from './features/auth/AuthProvider'
import type { AppRole } from './features/auth/AuthProvider'
import { supabase } from './lib/supabase'
const LoginPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./features/auth/AuthPages').then((module) => ({ default: module.ResetPasswordPage })))
const ProWorkspace = lazy(() => import('./features/pro/ProWorkspace'))
const Bienvenue = lazy(() => import('./pages/Bienvenue'))

const hairTypes = ['Lisses', 'Ondulés', 'Bouclés', 'Crépus']
const scalpTypes = ['Sec', 'Gras', 'Sensible']
const goals = ['Hydratation', 'Pousse', 'Réparation', 'Protéger mes tresses']

function getLocalDateString() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

function App() {
  const { user, profile, loading, error, logout } = useAuth()
  const [directoryResult, setDirectoryResult] = useState<{ userId: string; hairdressers: Hairdresser[]; error: string } | null>(null)

  useEffect(() => {
    if (!user?.id || profile?.role !== 'client') return

    let active = true
    const refreshDirectory = () => {
      void getPublishedHairdressers()
        .then((publishedHairdressers) => {
          if (active) setDirectoryResult({ userId: user.id, hairdressers: publishedHairdressers, error: '' })
        })
        .catch((caughtError: unknown) => {
          if (active) {
            setDirectoryResult({
              userId: user.id,
              hairdressers: [],
              error: caughtError instanceof Error ? caughtError.message : 'Impossible de charger les profils publics.',
            })
          }
        })
    }

    refreshDirectory()
    const intervalId = window.setInterval(refreshDirectory, 30_000)
    window.addEventListener('focus', refreshDirectory)
    const channel = supabase?.channel(`public-hairdressers-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hairdresser_public_profiles' }, refreshDirectory)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, refreshDirectory)
      .subscribe()

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshDirectory)
      if (channel && supabase) void supabase.removeChannel(channel)
    }
  }, [user?.id, profile?.role])

  const currentDirectory = directoryResult?.userId === user?.id ? directoryResult : null
  const directoryError = currentDirectory?.error ?? ''
  const directoryLoading = profile?.role === 'client' && Boolean(user?.id) && directoryResult?.userId !== user?.id
  const clientHairdressers = currentDirectory?.hairdressers ?? []

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
    userId: user?.id ?? '',
  }

  return (
    <Suspense fallback={<main className="auth-shell"><p>Chargement…</p></main>}>
      <Routes>
      <Route path="/bienvenue" element={<PublicOnly session={session}><Bienvenue /></PublicOnly>} />
      <Route path="/connexion" element={<PublicOnly session={session}><LoginPage /></PublicOnly>} />
      <Route path="/inscription/client" element={<PublicOnly session={session}><SignupPage role="client" /></PublicOnly>} />
      <Route path="/inscription/coiffeur" element={<PublicOnly session={session}><SignupPage role="hairdresser" /></PublicOnly>} />
      <Route path="/mot-de-passe-oublie" element={<PublicOnly session={session}><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

      <Route path="/" element={<ProtectedRoute session={session} allowedRoles={['client']}><ClientHomePage firstName={session.firstName} hairdressers={clientHairdressers} directoryError={directoryError} directoryLoading={directoryLoading} /></ProtectedRoute>} />
      <Route path="/coiffeurs" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairdressersPage hairdressers={clientHairdressers} directoryError={directoryError} directoryLoading={directoryLoading} /></ProtectedRoute>} />
      <Route path="/coiffeurs/:id" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairdresserDetailPage hairdressers={clientHairdressers} directoryLoading={directoryLoading} /></ProtectedRoute>} />
      <Route path="/reserver/:coiffeurId" element={<ProtectedRoute session={session} allowedRoles={['client']}><BookingPage hairdressers={clientHairdressers} directoryLoading={directoryLoading} /></ProtectedRoute>} />
      <Route path="/mes-rdv" element={<ProtectedRoute session={session} allowedRoles={['client']}><AppointmentsPage /></ProtectedRoute>} />
      <Route path="/mes-cheveux" element={<ProtectedRoute session={session} allowedRoles={['client']}><HairProfilePage /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute session={session} allowedRoles={['client']}><ProfilePage profile={profile} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/pro" element={<ProtectedRoute session={session} allowedRoles={['hairdresser']}><ProPage firstName={session.firstName} userId={session.userId} /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute session={session} allowedRoles={['admin']}><AdminPlaceholder onLogout={logout} /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={session.loggedIn ? (session.role === 'client' ? '/' : session.role === 'hairdresser' ? '/pro' : '/admin') : '/bienvenue'} replace />} />
      </Routes>
    </Suspense>
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

function HairdresserAvatar({ name, initial, photoUrl, large = false }: {
  name: string
  initial: string
  photoUrl?: string
  large?: boolean
}) {
  return (
    <div className={`avatar ${large ? 'large' : ''}`}>
      {photoUrl ? <img src={photoUrl} alt={`Photo de ${name}`} /> : initial}
    </div>
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

function ClientHomePage({ firstName, hairdressers: directory, directoryError, directoryLoading }: {
  firstName: string
  hairdressers: Hairdresser[]
  directoryError: string
  directoryLoading: boolean
}) {
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
          {directory.slice(0, 2).map((hairdresser) => (
            <article key={hairdresser.id} className="hairdresser-card" onClick={() => navigate(`/coiffeurs/${hairdresser.id}`)}>
              <div className="hairdresser-top">
                <HairdresserAvatar name={hairdresser.name} initial={hairdresser.avatar} photoUrl={hairdresser.avatarUrl} />
                <div>
                  <strong>{hairdresser.name}</strong>
                  <div className="meta-line"><Star size={14} /> {hairdresser.rating ? `${hairdresser.rating}/5` : 'Nouveau'}</div>
                </div>
              </div>
              <p className="card-copy">{hairdresser.specialties.join(' · ')} · {hairdresser.zone}</p>
            </article>
          ))}
          {!directory.length ? <p className="muted">
            {directoryLoading ? 'Chargement des coiffeurs disponibles…'
              : directoryError ? `Impossible de charger les coiffeurs : ${directoryError}`
                : 'Aucun coiffeur disponible pour le moment. Revenez bientôt découvrir les profils DONMEN.'}
          </p> : null}
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

function HairdressersPage({ hairdressers: directory, directoryError, directoryLoading }: {
  hairdressers: Hairdresser[]
  directoryError: string
  directoryLoading: boolean
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const visibleHairdressers = directory.filter((hairdresser) => [
    hairdresser.name,
    hairdresser.zone,
    ...hairdresser.specialties,
    ...(hairdresser.serviceNames ?? []),
  ].some((value) => value.toLocaleLowerCase('fr-FR').includes(search.trim().toLocaleLowerCase('fr-FR'))))

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

        {directoryError ? <p className="auth-note" role="alert">Impossible de charger les coiffeurs : {directoryError}</p> : null}
        {directoryLoading ? <p className="muted" role="status">Actualisation des coiffeurs…</p> : null}
        {visibleHairdressers.map((hairdresser) => (
          <article key={hairdresser.id} className="list-card" onClick={() => navigate(`/coiffeurs/${hairdresser.id}`)}>
            <HairdresserAvatar name={hairdresser.name} initial={hairdresser.avatar} photoUrl={hairdresser.avatarUrl} />
            <div className="list-card-body">
              <div className="list-row">
                <strong>{hairdresser.name}</strong>
                <div className="fee-box">
                  <span>{hairdresser.rating ? `${hairdresser.rating}/5` : 'Nouveau'}</span>
                  <small>{hairdresser.price ? `dès ${hairdresser.price.toLocaleString('fr-FR')} FCFA` : 'Prestations à venir'}</small>
                </div>
              </div>
              <p>{hairdresser.specialties.join(' · ')} · {hairdresser.zone}</p>
            </div>
          </article>
        ))}
        {!directoryLoading && !directoryError && !visibleHairdressers.length
          ? <p className="muted">{search.trim()
            ? 'Aucun coiffeur ne correspond à votre recherche.'
            : 'Aucun coiffeur disponible pour le moment dans ce quartier. Soyez le premier à réserver dès qu’un pro s’inscrit !'}</p>
          : null}
      </div>
      <BottomNav />
    </main>
  )
}

function HairdresserDetailPage({ hairdressers: directory, directoryLoading }: { hairdressers: Hairdresser[]; directoryLoading: boolean }) {
  const { id } = useParams()
  const hairdresser = directory.find((entry) => String(entry.id) === id)
  const navigate = useNavigate()
  const hairdresserId = hairdresser?.id
  const [servicesResult, setServicesResult] = useState<{
    hairdresserId: string
    services: HairdresserService[]
    error: string
  } | null>(null)

  useEffect(() => {
    if (!hairdresserId) return
    let active = true
    void getHairdresserServices(hairdresserId)
      .then((services) => {
        if (active) setServicesResult({ hairdresserId, services, error: '' })
      })
      .catch((error: unknown) => {
        if (active) {
          setServicesResult({
            hairdresserId,
            services: [],
            error: error instanceof Error ? error.message : 'Impossible de charger le catalogue.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [hairdresserId])

  const currentServices = servicesResult?.hairdresserId === hairdresserId ? servicesResult : null
  const hairdresserServices = currentServices?.services ?? []
  const servicesLoading = Boolean(hairdresserId) && !currentServices
  const servicesError = currentServices?.error ?? ''

  if (!hairdresser) {
    return <main className="page-shell"><BrandMark showBack onBack={() => navigate('/coiffeurs')} /><div className="page-body compact"><p className="muted">{directoryLoading ? 'Chargement du profil…' : 'Ce profil de coiffeur est indisponible.'}</p></div></main>
  }
  const servicePhotos = hairdresserServices.filter((service) => service.photo)

  return (
    <main className="page-shell detail-page">
      <BrandMark showBack onBack={() => navigate('/coiffeurs')} />
      <div className="page-body compact">
        <div className="detail-header">
          <HairdresserAvatar name={hairdresser.name} initial={hairdresser.avatar} photoUrl={hairdresser.avatarUrl} large />
          <div>
            <h2>{hairdresser.name}</h2>
            <div className="meta-line"><Star size={14} /> {hairdresser.rating ? `${hairdresser.rating}/5` : 'Nouveau'}</div>
            <p>{hairdresser.bio}</p>
          </div>
        </div>

        {servicePhotos.length ? <div className="gallery-grid">
          {servicePhotos.map((service) => (
            <img key={service.id} className="gallery-card" src={service.photo} alt={service.name} />
          ))}
        </div> : null}

        <div className="service-list">
          {hairdresserServices.map((service) => (
            <div key={service.id} className="service-row">
              <div>
                <strong>{service.name}</strong>
                <small>{service.duration}</small>
              </div>
              <span>{service.price.toLocaleString('fr-FR')} FCFA</span>
            </div>
          ))}
          {servicesLoading ? <p className="muted" role="status">Chargement du catalogue…</p> : null}
          {servicesError ? <p className="auth-note" role="alert">Impossible de charger les prestations : {servicesError}</p> : null}
          {!servicesLoading && !servicesError && !hairdresserServices.length
            ? <p className="muted">Aucune prestation n’est encore publiée par ce coiffeur.</p>
            : null}
        </div>

        <Button fullWidth disabled={servicesLoading || !hairdresserServices.length} onClick={() => navigate(`/reserver/${hairdresser.id}`)}>
          {hairdresserServices.length ? 'Réserver' : 'Réservation indisponible'}
        </Button>
      </div>
    </main>
  )
}

function BookingPage({ hairdressers: directory, directoryLoading }: { hairdressers: Hairdresser[]; directoryLoading: boolean }) {
  const { coiffeurId } = useParams()
  const navigate = useNavigate()
  const hairdresser = directory.find((entry) => String(entry.id) === coiffeurId)
  const hairdresserId = hairdresser?.id
  const [catalogResult, setCatalogResult] = useState<{
    hairdresserId: string
    services: HairdresserService[]
    error: string
  } | null>(null)
  const [selectedServicesState, setSelectedServicesState] = useState<{ hairdresserId: string; ids: string[] } | null>(null)
  const [date, setDate] = useState(getLocalDateString)
  const [minimumDate] = useState(date)
  const [slotResult, setSlotResult] = useState<{ key: string; slots: string[]; error: string } | null>(null)
  const [selectedSlotState, setSelectedSlotState] = useState<{ key: string; slot: string } | null>(null)
  const [address, setAddress] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [slotRefresh, setSlotRefresh] = useState(0)
  const currentCatalog = catalogResult?.hairdresserId === hairdresserId ? catalogResult : null
  const hairdresserServices = currentCatalog?.services ?? []
  const servicesLoading = Boolean(hairdresserId) && !currentCatalog
  const servicesError = currentCatalog?.error ?? ''
  const selectedServiceIds = selectedServicesState?.hairdresserId === hairdresserId ? selectedServicesState.ids : []
  const selectedIdsKey = [...selectedServiceIds].sort().join(',')
  const slotKey = `${hairdresserId ?? ''}|${date}|${selectedIdsKey}|${slotRefresh}`
  const currentSlotResult = slotResult?.key === slotKey ? slotResult : null
  const slots = currentSlotResult?.slots ?? []
  const slotsLoading = Boolean(hairdresserId && selectedIdsKey) && !currentSlotResult
  const slotError = currentSlotResult?.error ?? ''
  const selectedSlot = selectedSlotState?.key === slotKey ? selectedSlotState.slot : ''

  useEffect(() => {
    if (!hairdresserId) return
    let active = true
    void getHairdresserServices(hairdresserId)
      .then((services) => {
        if (!active) return
        setCatalogResult({ hairdresserId, services, error: '' })
        setSelectedServicesState({ hairdresserId, ids: services[0] ? [services[0].id] : [] })
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setCatalogResult({
            hairdresserId,
            services: [],
            error: caughtError instanceof Error ? caughtError.message : 'Impossible de charger les prestations.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [hairdresserId])

  useEffect(() => {
    if (!hairdresserId || !selectedIdsKey) return
    let active = true
    void getAvailableSlots(hairdresserId, date, selectedIdsKey.split(','))
      .then((availableSlots) => {
        if (active) setSlotResult({ key: slotKey, slots: availableSlots, error: '' })
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setSlotResult({
            key: slotKey,
            slots: [],
            error: caughtError instanceof Error ? caughtError.message : 'Impossible de charger les créneaux.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [date, hairdresserId, selectedIdsKey, slotKey])

  const selectedServices = hairdresserServices.filter((service) => selectedServiceIds.includes(service.id))
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0)
  const totalDuration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0)

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hairdresserId || !selectedServiceIds.length || !selectedSlot || !address.trim()) return
    setSubmitting(true)
    setBookingError('')
    try {
      await createBooking({
        hairdresserId,
        serviceIds: selectedServiceIds,
        scheduledAt: selectedSlot,
        address,
        accessNotes,
      })
      navigate('/mes-rdv', { replace: true })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : ''
      if (message.includes('SLOT_TAKEN')) {
        setBookingError('Ce créneau vient d’être réservé. Choisissez-en un autre.')
        setSlotRefresh((value) => value + 1)
      } else if (message.includes('HAIRDRESSER_UNAVAILABLE')) {
        setBookingError('Ce coiffeur n’est plus disponible. Actualisez la liste des coiffeurs.')
      } else if (message.includes('SERVICE_UNAVAILABLE')) {
        setBookingError('Une prestation sélectionnée n’est plus disponible. Rechargez le catalogue.')
      } else {
        setBookingError(message || 'Impossible d’enregistrer la demande de réservation.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!hairdresser) {
    return <main className="page-shell"><div className="page-body compact"><p className="muted">{directoryLoading ? 'Chargement du profil…' : 'Ce profil de coiffeur est indisponible.'}</p><Button variant="secondary" onClick={() => navigate('/coiffeurs')}>Retour aux coiffeurs</Button></div></main>
  }

  return (
    <main className="page-shell booking-shell">
      <form onSubmit={(event) => void submitBooking(event)}>
        <div className="page-body compact booking-body">
          <div className="booking-head">
            <span>Réservation · {hairdresser.name}</span>
            <h2>Choisissez vos prestations et un créneau</h2>
          </div>
          <div className="booking-section-title">Prestations</div>
          {hairdresserServices.map((service) => {
            const selected = selectedServiceIds.includes(service.id)
            return (
              <button
                type="button"
                key={service.id}
                className={`service-row booking-service ${selected ? 'selected' : ''}`}
                aria-pressed={selected}
                onClick={() => {
                  setBookingError('')
                  setSelectedServicesState((current) => {
                    const ids = current?.hairdresserId === hairdresserId ? current.ids : []
                    return {
                      hairdresserId: hairdresserId ?? '',
                      ids: selected ? ids.filter((id) => id !== service.id) : [...ids, service.id],
                    }
                  })
                }}
              >
                <span><strong>{service.name}</strong><small>{service.duration}</small></span>
                <strong>{service.price.toLocaleString('fr-FR')} FCFA</strong>
              </button>
            )
          })}
          {servicesLoading ? <p className="muted" role="status">Chargement des prestations…</p> : null}
          {servicesError ? <p className="auth-note" role="alert">{servicesError}</p> : null}
          {!servicesLoading && !hairdresserServices.length ? <p className="muted">Ce coiffeur n’a pas encore publié de prestation.</p> : null}

          <label className="booking-field">
            <span>Date du rendez-vous</span>
            <input type="date" min={minimumDate} value={date} onChange={(event) => { setBookingError(''); setDate(event.target.value) }} required />
          </label>

          <div className="booking-section-title">Créneaux disponibles</div>
          {slotsLoading ? <p className="muted" role="status">Recherche des créneaux disponibles…</p> : null}
          {slotError ? <p className="auth-note" role="alert">{slotError}</p> : null}
          {!slotsLoading && slots.length ? <div className="slots-grid">
            {slots.map((slot) => (
              <Chip key={slot} selected={selectedSlot === slot} onClick={() => { setBookingError(''); setSelectedSlotState({ key: slotKey, slot }) }}>
                {new Date(slot).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' })}
              </Chip>
            ))}
          </div> : null}
          {!slotsLoading && selectedIdsKey && !slots.length ? <p className="muted">Aucun créneau disponible à cette date. Essayez un autre jour.</p> : null}

          <label className="booking-field">
            <span>Adresse de la prestation</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required placeholder="Quartier, rue et repères" />
          </label>
          <label className="booking-field">
            <span>Informations d’accès <small>(facultatif)</small></span>
            <textarea value={accessNotes} onChange={(event) => setAccessNotes(event.target.value)} rows={2} placeholder="Immeuble, étage, indications…" />
          </label>
          {bookingError ? <p className="auth-note" role="alert">{bookingError}</p> : null}
        </div>
        <div className="booking-footer">
          <div>
            <span>{selectedServices.length ? `${selectedServices.length} prestation(s) · ${formatDuration(totalDuration)}` : 'Sélectionnez une prestation'}</span>
            <strong>{totalPrice.toLocaleString('fr-FR')} FCFA</strong>
          </div>
          <Button type="submit" disabled={submitting || servicesLoading || slotsLoading || !selectedServices.length || !selectedSlot || !address.trim()}>
            {submitting ? 'Envoi…' : 'Confirmer la demande'}
          </Button>
        </div>
      </form>
    </main>
  )
}

function AppointmentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookingResult, setBookingResult] = useState<{
    userId: string
    bookings: ClientBooking[]
    error: string
    fetchedAt: number
  } | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [actionError, setActionError] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const bookings = bookingResult?.userId === user?.id ? bookingResult.bookings : []
  const loading = Boolean(user?.id) && bookingResult?.userId !== user.id
  const error = bookingResult?.userId === user?.id ? bookingResult.error : ''

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const refresh = () => {
      void getClientBookings()
        .then((items) => {
          if (active) setBookingResult({ userId: user.id, bookings: items, error: '', fetchedAt: Date.now() })
        })
        .catch((caughtError: unknown) => {
          if (active) setBookingResult((current) => ({
            userId: user.id,
            bookings: current?.userId === user.id ? current.bookings : [],
            error: caughtError instanceof Error ? caughtError.message : 'Impossible de charger vos rendez-vous.',
            fetchedAt: Date.now(),
          }))
        })
    }
    refresh()
    const intervalId = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
    }
  }, [user?.id])

  const upcoming = bookings.filter((booking) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(booking.status)
    && Date.parse(booking.scheduledAt) >= (bookingResult?.fetchedAt ?? 0))
  const past = bookings.filter((booking) => !upcoming.some((item) => item.id === booking.id))
  const visibleBookings = tab === 'upcoming' ? upcoming : past
  const cancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    setActionError('')
    try {
      await cancelBooking(bookingId)
      const items = await getClientBookings()
      setBookingResult((current) => ({
        userId: user?.id ?? '',
        bookings: items,
        error: '',
        fetchedAt: current?.fetchedAt ?? 0,
      }))
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : ''
      setActionError(message.includes('CANCELLATION_WINDOW_CLOSED')
        ? 'L’annulation en ligne n’est plus possible dans ce délai. Contactez DONMEN pour demander de l’aide.'
        : message || 'Impossible d’annuler ce rendez-vous.')
    } finally {
      setCancellingId('')
    }
  }

  return (
    <main className="page-shell">
      <BrandMark />
      <div className="page-body compact">
        <div className="segment-row">
          <Chip selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>À venir</Chip>
          <Chip selected={tab === 'past'} onClick={() => setTab('past')}>Passés</Chip>
        </div>
        {error ? <p className="auth-note" role="alert">{error}</p> : null}
        {actionError ? <p className="auth-note" role="alert">{actionError}</p> : null}
        {loading ? <p className="muted" role="status">Chargement de vos rendez-vous…</p> : null}
        {!loading && !error && !visibleBookings.length ? <p className="muted">
          {tab === 'upcoming' ? 'Vous n’avez pas encore de rendez-vous à venir.' : 'Aucun rendez-vous passé pour le moment.'}
        </p> : null}
        {visibleBookings.map((booking) => (
          <article className="appointment-card" key={booking.id}>
            <div className="appointment-header">
              <strong>{formatAppointmentDate(booking.scheduledAt)}</strong>
              <span className={`status-badge status-${booking.status}`}>{bookingStatusLabel(booking.status)}</span>
            </div>
            <p>Avec {booking.hairdresserName}</p>
            {booking.services.map((service, index) => (
              <p className="appointment-service" key={`${booking.id}-${index}`}>
                {service.name} · {formatDuration(service.durationMinutes)}
              </p>
            ))}
            <div className="appointment-total">{booking.totalPrice.toLocaleString('fr-FR')} FCFA</div>
            {['pending', 'accepted'].includes(booking.status)
              ? <Button variant="secondary" disabled={cancellingId === booking.id} onClick={() => void cancel(booking.id)}>
                {cancellingId === booking.id ? 'Annulation…' : 'Annuler le rendez-vous'}
              </Button>
              : null}
            {tab === 'past' ? <Button variant="secondary" onClick={() => navigate(`/coiffeurs/${booking.hairdresserId}`)}>Réserver à nouveau</Button> : null}
          </article>
        ))}
      </div>
      <BottomNav />
    </main>
  )
}

function formatDuration(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (!hours) return `${minutes} min`
  return minutes ? `${hours} h ${minutes}` : `${hours} h`
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    timeZone: 'Africa/Douala',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function bookingStatusLabel(status: ClientBooking['status']) {
  const labels: Record<ClientBooking['status'], string> = {
    pending: 'En attente',
    accepted: 'Accepté',
    on_the_way: 'Coiffeur en route',
    in_progress: 'Prestation en cours',
    completed: 'Terminé',
    declined: 'Refusé',
    cancelled: 'Annulé',
    expired: 'Expiré',
  }
  return labels[status]
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
          <div className="profile-item"><MapPin size={16} /> Adresse renseignée lors de la réservation</div>
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

function ProPage({ firstName, userId }: { firstName: string; userId: string }) {
  return <ProWorkspace key={userId} firstName={firstName} userId={userId} />
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
