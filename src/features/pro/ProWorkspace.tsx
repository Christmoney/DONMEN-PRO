import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  ImagePlus,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Scissors,
  Settings2,
  ShieldCheck,
  Star,
  Wallet,
  X,
} from 'lucide-react'

import { getMyHairdresserPublicProfile, saveHairdresserPublicProfile } from '../hairdressers/api'
import { getHairdresserProfileCompletion } from '../hairdressers/profile'
import type { HairdresserCatalogCategory, HairdresserCatalogItem, HairdresserPublicProfile } from '../hairdressers/profile'
import './pro.css'

type RequestStatus = 'pending' | 'accepted' | 'on_way' | 'done' | 'refused' | 'cancelled'
type ProView = 'home' | 'requests' | 'agenda' | 'earnings' | 'profile' | 'catalog' | 'hours' | 'reviews' | 'appointment' | 'finish'
type ServiceCategory = HairdresserCatalogCategory

type ProRequest = {
  id: string
  name: string
  initials: string
  neighborhood: string
  service: string
  duration: string
  date: string
  time: string
  price: number
  status: RequestStatus
  phone: string
  address: string
  directions: string
  hairType: string
  sensitivity: string
  goals: string
  allergies: string
  note: string
  refusalReason?: string
  careNote?: string
  problemReport?: string
}

type ProService = HairdresserCatalogItem & { photo: string }
type ProProfile = HairdresserPublicProfile

type ProDayHours = {
  open: boolean
  start: string
  end: string
}

type ProData = {
  available: boolean
  requests: ProRequest[]
  services: ProService[]
  profile: ProProfile
  hours: ProDayHours[]
}

const STORAGE_KEY_PREFIX = 'donmen-pro-workspace-v1'
const categories: Array<'Tout' | ServiceCategory> = ['Tout', 'Tresses', 'Tissage', 'Coupe', 'Soins']
const durations = ['45 min', '1 h', '1 h 30', '2 h', '2 h 30', '3 h', '4 h+']

const initialData: ProData = {
  available: false,
  requests: [
    {
      id: 'demande-marie',
      name: 'Marie A.',
      initials: 'MA',
      neighborhood: 'Akwa',
      service: 'Knotless braids',
      duration: '3 h',
      date: "Aujourd'hui",
      time: '14:00',
      price: 18000,
      status: 'pending',
      phone: '+237 6 90 12 34 56',
      address: 'Rue Joss, Akwa, Douala',
      directions: 'Portail bleu, 2e étage',
      hairType: 'Crépus · type 4B',
      sensitivity: 'Cuir chevelu sensible',
      goals: 'Hydratation et protection',
      allergies: 'Ammoniaque',
      note: 'Préférer une coiffure qui ne tire pas trop.',
    },
    {
      id: 'rdv-jean',
      name: 'Jean K.',
      initials: 'JK',
      neighborhood: 'Bonapriso',
      service: 'Coupe + soin',
      duration: '1 h 30',
      date: "Aujourd'hui",
      time: '11:00',
      price: 12000,
      status: 'accepted',
      phone: '+237 6 77 23 45 67',
      address: 'Rue Njo-Njo, Bonapriso, Douala',
      directions: 'Résidence Les Palmiers, entrée côté jardin',
      hairType: 'Bouclés · type 3C',
      sensitivity: 'Aucune sensibilité signalée',
      goals: 'Hydratation',
      allergies: 'Aucune allergie renseignée',
      note: 'Merci de venir avec une tondeuse.',
    },
    {
      id: 'rdv-ines',
      name: 'Inès M.',
      initials: 'IM',
      neighborhood: 'Bonanjo',
      service: 'Tresses collées',
      duration: '2 h',
      date: "Aujourd'hui",
      time: '15:30',
      price: 15000,
      status: 'done',
      phone: '+237 6 99 10 20 30',
      address: 'Boulevard de la Liberté, Bonanjo',
      directions: 'Immeuble blanc, derrière la pharmacie',
      hairType: 'Crépus · type 4A',
      sensitivity: 'Aucune sensibilité signalée',
      goals: 'Protéger mes tresses',
      allergies: 'Aucune allergie renseignée',
      note: '',
      careNote: 'Huile de jojoba conseillée après le shampoing.',
    },
  ],
  services: [],
  profile: {
    photo: '',
    presentation: '',
    specialties: '',
    neighborhoods: '',
    experience: '',
    languages: '',
    social: '',
    bringKit: false,
  },
  hours: Array.from({ length: 7 }, () => ({ open: false, start: '08:00', end: '18:00' })),
}

function isProData(value: unknown): value is ProData {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<ProData>
  return typeof data.available === 'boolean'
    && Array.isArray(data.requests)
    && Array.isArray(data.services)
    && Array.isArray(data.hours)
    && data.hours.every((day) => day && typeof day === 'object'
      && typeof day.open === 'boolean'
      && typeof day.start === 'string'
      && typeof day.end === 'string')
    && Boolean(data.profile && typeof data.profile === 'object')
}

const money = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`

function loadWorkspace(storageKey: string) {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return { data: initialData, error: '' }
    const parsed: unknown = JSON.parse(saved)
    if (!isProData(parsed)) throw new Error('Les données enregistrées ne sont pas reconnues.')
    if (
      parsed.profile.presentation === 'Coiffeuse passionnée, je prends soin de vos cheveux naturels avec douceur et précision.'
      && parsed.profile.specialties === 'Tresses protectrices, soins capillaires, coupe'
      && parsed.profile.neighborhoods === 'Akwa, Bonapriso, Bonanjo'
      && parsed.services.length === 3
      && parsed.services.every((service, index) => service.id === `service-${index + 1}`)
    ) {
      return { data: { ...parsed, profile: initialData.profile, services: [] }, error: '' }
    }
    return { data: parsed, error: '' }
  } catch (error) {
    return {
      data: initialData,
      error: error instanceof Error ? error.message : 'Impossible de charger les données locales.',
    }
  }
}

function ProWorkspace({ firstName, userId }: { firstName: string; userId: string }) {
  const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`
  const [storedWorkspace] = useState(() => loadWorkspace(storageKey))
  const [data, setData] = useState<ProData>(storedWorkspace.data)
  const [view, setView] = useState<ProView>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refusalId, setRefusalId] = useState<string | null>(null)
  const [refusalReason, setRefusalReason] = useState('')
  const [problemRequestId, setProblemRequestId] = useState<string | null>(null)
  const [problemReport, setProblemReport] = useState('')
  const [storageError, setStorageError] = useState(storedWorkspace.error)
  const [publicProfileLoaded, setPublicProfileLoaded] = useState(false)
  const [publicProfileError, setPublicProfileError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    let active = true
    void getMyHairdresserPublicProfile(userId)
      .then((publicProfile) => {
        if (!active) return
        if (publicProfile) {
          setData((previous) => ({
            ...previous,
            profile: { ...previous.profile, ...publicProfile.profile },
            services: publicProfile.services.map((service) => ({ ...service, photo: service.photo ?? '' })),
            available: publicProfile.available,
            hours: publicProfile.hours,
          }))
        }
        setPublicProfileLoaded(true)
        setPublicProfileError('')
      })
      .catch((error: unknown) => {
        if (active) {
          setPublicProfileError(error instanceof Error ? error.message : 'Impossible de charger le profil partagé.')
        }
      })

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    if (storageError) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible d’enregistrer les modifications.'
      window.setTimeout(() => setStorageError(message), 0)
    }
  }, [data, storageError, storageKey])

  useEffect(() => {
    if (!publicProfileLoaded) return
    void saveHairdresserPublicProfile(userId, firstName, data.profile, data.services, data.available, data.hours)
      .then((saved) => {
        setData((previous) => {
          if (JSON.stringify(previous.profile) === JSON.stringify(saved.profile)
            && JSON.stringify(previous.services) === JSON.stringify(saved.services)) return previous
          return {
            ...previous,
            profile: saved.profile,
            services: saved.services,
          }
        })
        setPublicProfileError('')
      })
      .catch((error: unknown) => {
        setPublicProfileError(error instanceof Error ? error.message : 'Impossible de publier le profil côté client.')
      })
  }, [data.available, data.hours, data.profile, data.services, firstName, publicProfileLoaded, userId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selectedRequest = data.requests.find((request) => request.id === selectedId)
  const pendingRequests = data.requests.filter((request) => request.status === 'pending')
  const todayAppointments = data.requests.filter((request) => ['accepted', 'on_way'].includes(request.status) && request.date === "Aujourd'hui")
  const totalEarnings = data.requests.filter((request) => request.status === 'done').reduce((total, request) => total + request.price, 0)
  const currentTab: ProView = ['catalog', 'hours', 'reviews'].includes(view) ? 'profile' : view === 'appointment' || view === 'finish' ? 'home' : view

  const updateData = (updater: (previous: ProData) => ProData) => setData((previous) => updater(previous))
  const openRequest = (id: string) => {
    setSelectedId(id)
    setView('appointment')
  }
  const acceptRequest = (id: string) => {
    updateData((previous) => ({
      ...previous,
      requests: previous.requests.map((request) => request.id === id ? { ...request, status: 'accepted' } : request),
    }))
    setToast('Demande acceptée. Le rendez-vous est ajouté à votre agenda.')
  }
  const confirmRefusal = () => {
    if (!refusalId || !refusalReason) return
    updateData((previous) => ({
      ...previous,
      requests: previous.requests.map((request) => request.id === refusalId
        ? { ...request, status: 'refused', refusalReason }
        : request),
    }))
    setRefusalId(null)
    setRefusalReason('')
    setToast('Demande refusée.')
  }
  const setRequestStatus = (id: string, status: RequestStatus) => updateData((previous) => ({
    ...previous,
    requests: previous.requests.map((request) => request.id === id ? { ...request, status } : request),
  }))
  const finishAppointment = (id: string, careNote: string) => {
    updateData((previous) => ({
      ...previous,
      requests: previous.requests.map((request) => request.id === id ? { ...request, status: 'done', careNote } : request),
    }))
    setView('home')
    setToast('Prestation terminée et paiement confirmé.')
  }

  return (
    <main className="pro-app">
      <header className="pro-header">
        <div className="pro-brand">
          <img src="/brand/donmen-couronne-transparent.png" alt="" />
          <div><strong>DONMEN</strong><span>ESPACE PRO</span></div>
        </div>
        <button className={`pro-status ${data.available ? 'is-available' : ''}`} type="button" onClick={() => updateData((previous) => ({ ...previous, available: !previous.available }))}>
          <span className="pro-status-dot" />
          {data.available ? 'Disponible' : 'Indisponible'}
        </button>
      </header>

      <div className="pro-content">
        {storageError ? <div className="pro-storage-warning" role="alert">Sauvegarde locale indisponible : {storageError}. Vos modifications restent actives jusqu’à la fermeture de cette page.</div> : null}
        {publicProfileError ? <div className="pro-storage-warning" role="alert">Synchronisation client indisponible : {publicProfileError}. Le profil n’est pas encore partagé dans l’espace client.</div> : null}
        {view === 'home' ? <Dashboard firstName={firstName} data={data} pendingCount={pendingRequests.length} todayCount={todayAppointments.length} earnings={totalEarnings} openRequest={openRequest} setView={setView} toggleAvailability={() => updateData((previous) => ({ ...previous, available: !previous.available }))} /> : null}
        {view === 'requests' ? <Requests data={data} openRequest={openRequest} onAccept={acceptRequest} onRefuse={(id) => { setRefusalId(id); setRefusalReason('') }} /> : null}
        {view === 'agenda' ? <Agenda data={data} openRequest={openRequest} onHours={() => setView('hours')} /> : null}
        {view === 'earnings' ? <Earnings data={data} earnings={totalEarnings} /> : null}
        {view === 'profile' ? <Profile firstName={firstName} userId={userId} data={data} setView={setView} updateData={updateData} /> : null}
        {view === 'catalog' ? <Catalog services={data.services} onBack={() => setView('profile')} onChange={(services) => updateData((previous) => ({ ...previous, services }))} /> : null}
        {view === 'hours' ? <Hours hours={data.hours} onBack={() => setView('profile')} onChange={(hours) => updateData((previous) => ({ ...previous, hours }))} /> : null}
        {view === 'reviews' ? <Reviews onBack={() => setView('profile')} /> : null}
        {view === 'appointment' && selectedRequest ? (
          <Appointment
            request={selectedRequest}
            onBack={() => setView(selectedRequest.status === 'pending' ? 'requests' : 'home')}
            onAccept={() => acceptRequest(selectedRequest.id)}
            onRefuse={() => { setRefusalId(selectedRequest.id); setRefusalReason('') }}
            onStatusChange={(status) => setRequestStatus(selectedRequest.id, status)}
            onFinish={() => setView('finish')}
            onReport={() => { setProblemRequestId(selectedRequest.id); setProblemReport('') }}
          />
        ) : null}
        {view === 'finish' && selectedRequest ? <Finish request={selectedRequest} onBack={() => setView('appointment')} onFinish={(note) => finishAppointment(selectedRequest.id, note)} /> : null}
      </div>

      <nav className="pro-bottom-nav" aria-label="Navigation de l’espace professionnel">
        {([
          { id: 'home' as const, label: "Aujourd'hui", icon: CalendarDays },
          { id: 'requests' as const, label: 'Demandes', icon: BriefcaseBusiness, count: pendingRequests.length },
          { id: 'agenda' as const, label: 'Agenda', icon: Clock3 },
          { id: 'earnings' as const, label: 'Gains', icon: Wallet },
          { id: 'profile' as const, label: 'Profil', icon: Scissors },
        ]).map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" className={`pro-nav-item ${currentTab === id ? 'active' : ''}`} aria-label={label} aria-current={currentTab === id ? 'page' : undefined} onClick={() => setView(id)}>
            <span className="pro-nav-icon"><Icon size={20} />{count ? <i>{count}</i> : null}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {toast ? <div className="pro-toast" role="status">{toast}</div> : null}
      {refusalId ? (
        <div className="pro-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRefusalId(null) }}>
          <section className="pro-modal" role="dialog" aria-modal="true" aria-labelledby="refusal-title">
            <button type="button" className="pro-icon-button pro-modal-close" aria-label="Fermer" onClick={() => setRefusalId(null)}><X size={20} /></button>
            <p className="pro-eyebrow">DEMANDE DE {data.requests.find((request) => request.id === refusalId)?.name}</p>
            <h2 id="refusal-title">Pourquoi refusez-vous ?</h2>
            <p>Cette raison sera communiquée à la cliente.</p>
            {['Indisponible', 'Trop loin', 'Autre'].map((reason) => (
              <button key={reason} type="button" className={`pro-reason-option ${refusalReason === reason ? 'selected' : ''}`} onClick={() => setRefusalReason(reason)}>
                <span className="pro-radio">{refusalReason === reason ? <Check size={14} /> : null}</span>{reason}
              </button>
            ))}
            <button className="pro-button pro-button-primary pro-button-full" type="button" disabled={!refusalReason} onClick={confirmRefusal}>Confirmer le refus</button>
          </section>
        </div>
      ) : null}
      {problemRequestId ? (
        <div className="pro-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProblemRequestId(null) }}>
          <form className="pro-modal" onSubmit={(event) => {
            event.preventDefault()
            if (!problemReport.trim()) return
            updateData((previous) => ({
              ...previous,
              requests: previous.requests.map((request) => request.id === problemRequestId ? { ...request, problemReport: problemReport.trim() } : request),
            }))
            setProblemRequestId(null)
            setToast('Votre signalement a été enregistré.')
          }}>
            <button type="button" className="pro-icon-button pro-modal-close" aria-label="Fermer" onClick={() => setProblemRequestId(null)}><X size={20} /></button>
            <p className="pro-eyebrow">ASSISTANCE DONMEN</p>
            <h2>Signaler un problème</h2>
            <p>Décrivez la difficulté rencontrée pour ce rendez-vous. Votre signalement sera conservé avec ses détails.</p>
            <label className="pro-field"><span>Description du problème</span><textarea required rows={4} value={problemReport} onChange={(event) => setProblemReport(event.target.value)} placeholder="Expliquez ce qui s’est passé…" /></label>
            <button className="pro-button pro-button-primary pro-button-full" type="submit">Envoyer le signalement</button>
          </form>
        </div>
      ) : null}
    </main>
  )
}

function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="pro-page-title">{eyebrow ? <p className="pro-eyebrow">{eyebrow}</p> : null}<div><h1>{title}</h1>{action}</div></div>
}

function Dashboard({ firstName, data, pendingCount, todayCount, earnings, openRequest, setView, toggleAvailability }: {
  firstName: string
  data: ProData
  pendingCount: number
  todayCount: number
  earnings: number
  openRequest: (id: string) => void
  setView: (view: ProView) => void
  toggleAvailability: () => void
}) {
  const pending = data.requests.find((request) => request.status === 'pending')
  const next = data.requests
    .filter((request) => ['accepted', 'on_way'].includes(request.status) && request.date === "Aujourd'hui")
    .sort((a, b) => a.time.localeCompare(b.time))[0]
  const todayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return (
    <>
      <div className="pro-greeting">
        <div><p className="pro-eyebrow">{todayLabel.toLocaleUpperCase('fr-FR')} · DOUALA</p><h1>Salut DON {firstName || 'Pro'} !</h1><p>Voici votre journée.</p></div>
        <div className="pro-greeting-avatar">{(firstName || 'P').slice(0, 1).toUpperCase()}</div>
      </div>

      <button type="button" className={`pro-availability-card ${data.available ? 'available' : 'unavailable'}`} onClick={toggleAvailability} aria-pressed={data.available}>
        <span className="pro-availability-icon"><CheckCircle2 size={22} /></span>
        <span><strong>{data.available ? 'Vous êtes disponible' : 'Vous êtes indisponible'}</strong><small>{data.available ? 'Les clients peuvent vous réserver' : 'Les clients ne peuvent pas vous réserver'}</small></span>
        <span className="pro-switch" aria-hidden="true"><i /></span>
      </button>

      {pending ? (
        <section className="pro-card pro-request-alert">
          <div className="pro-alert-heading"><span className="pro-alert-dot" /> NOUVELLE DEMANDE <span className="pro-countdown">12 min</span></div>
          <div className="pro-alert-body"><div className="pro-avatar">{pending.initials}</div><div><h2>{pending.name} · {pending.neighborhood}</h2><p>{pending.service} · {pending.duration}</p><strong>{money(pending.price)}</strong></div></div>
          <button type="button" className="pro-button pro-button-primary pro-button-full" onClick={() => openRequest(pending.id)}>Voir la demande <ArrowRight size={17} /></button>
        </section>
      ) : (
        <section className="pro-card pro-empty-card"><CheckCircle2 size={20} /><span>Aucune demande en attente. Votre prochaine cliente n’est pas loin !</span></section>
      )}

      <div className="pro-section-heading"><h2>Prochain rendez-vous</h2><button type="button" className="pro-text-link" onClick={() => setView('agenda')}>Tout voir</button></div>
      {next ? <NextAppointment request={next} openRequest={openRequest} /> : <section className="pro-card pro-empty-card"><CalendarDays size={20} /><span>Pas encore de rendez-vous accepté aujourd’hui.</span></section>}

      <div className="pro-section-heading"><h2>Résumé du jour</h2><span className="pro-muted">Aujourd’hui</span></div>
      <div className="pro-summary-grid">
        <SummaryCard value={String(pendingCount)} label="Demandes" icon={<BriefcaseBusiness size={17} />} />
        <SummaryCard value={String(todayCount)} label="Rendez-vous" icon={<CalendarDays size={17} />} />
        <SummaryCard value={money(earnings)} label="Gains encaissés" icon={<Wallet size={17} />} />
      </div>
    </>
  )
}

function SummaryCard({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return <article className="pro-card pro-summary-card"><span className="pro-summary-icon">{icon}</span><strong>{value}</strong><small>{label}</small></article>
}

function NextAppointment({ request, openRequest }: { request: ProRequest; openRequest: (id: string) => void }) {
  return (
    <section className="pro-card pro-next-card">
      <div className="pro-next-time"><strong>{request.time}</strong><span>{request.duration}</span></div>
      <div className="pro-next-info"><h3>{request.service}</h3><p>{request.name} · {request.neighborhood}</p><span><MapPin size={14} /> {request.address}</span></div>
      <div className="pro-inline-actions">
        <a className="pro-button pro-button-secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address)}`} target="_blank" rel="noreferrer"><Navigation size={16} /> Y aller</a>
        <a className="pro-button pro-button-plain" href={`https://wa.me/${request.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Message</a>
        <button className="pro-button pro-button-plain" type="button" aria-label={`Détails du rendez-vous de ${request.name}`} onClick={() => openRequest(request.id)}><ChevronRight size={18} /></button>
      </div>
    </section>
  )
}

function Requests({ data, openRequest, onAccept, onRefuse }: {
  data: ProData
  openRequest: (id: string) => void
  onAccept: (id: string) => void
  onRefuse: (id: string) => void
}) {
  const [tab, setTab] = useState<'pending' | 'past'>('pending')
  const requests = data.requests.filter((request) => tab === 'pending'
    ? request.status === 'pending'
    : ['accepted', 'on_way', 'done', 'refused', 'cancelled'].includes(request.status))
  return (
    <>
      <PageTitle eyebrow="VOTRE ACTIVITÉ" title="Demandes" />
      <div className="pro-tabs" role="tablist" aria-label="Filtrer les demandes">
        <button type="button" role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'selected' : ''} onClick={() => setTab('pending')}>En attente <span>{data.requests.filter((request) => request.status === 'pending').length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'selected' : ''} onClick={() => setTab('past')}>Passées</button>
      </div>
      <div className="pro-list">
        {requests.map((request) => (
          <article className="pro-card pro-request-card" key={request.id}>
            <button type="button" className="pro-request-main" onClick={() => openRequest(request.id)}>
              <div className="pro-avatar">{request.initials}</div>
              <span className="pro-request-copy"><strong>{request.name}<small>{request.neighborhood} · {request.date} à {request.time}</small></strong><span className={`pro-status-label ${request.status}`}>{statusLabel(request.status)}</span></span>
            </button>
            <div className="pro-request-service"><Scissors size={15} /><span>{request.service} · {request.duration}</span><strong>{money(request.price)}</strong></div>
            {request.status === 'pending' ? <div className="pro-inline-actions">
              <button type="button" className="pro-button pro-button-outline-danger" onClick={() => onRefuse(request.id)}>Refuser</button>
              <button type="button" className="pro-button pro-button-primary" onClick={() => onAccept(request.id)}>Accepter</button>
            </div> : <button type="button" className="pro-button pro-button-secondary pro-button-full" onClick={() => openRequest(request.id)}>Voir le rendez-vous <ArrowRight size={16} /></button>}
          </article>
        ))}
        {!requests.length ? <EmptyState title={tab === 'pending' ? 'Tout est à jour' : 'Aucune demande passée'} description={tab === 'pending' ? 'Les nouvelles demandes apparaîtront ici.' : 'Vos rendez-vous acceptés et terminés seront listés ici.'} /> : null}
      </div>
    </>
  )
}

function statusLabel(status: RequestStatus) {
  const labels: Record<RequestStatus, string> = { pending: 'En attente', accepted: 'Accepté', on_way: 'En route', done: 'Terminé', refused: 'Refusé', cancelled: 'Annulé' }
  return labels[status]
}

function Appointment({ request, onBack, onAccept, onRefuse, onStatusChange, onFinish, onReport }: {
  request: ProRequest
  onBack: () => void
  onAccept: () => void
  onRefuse: () => void
  onStatusChange: (status: RequestStatus) => void
  onFinish: () => void
  onReport: () => void
}) {
  return (
    <>
      <button type="button" className="pro-back-button" onClick={onBack}><ArrowLeft size={17} /> Retour</button>
      <PageTitle eyebrow={`RENDEZ-VOUS · ${request.date.toUpperCase()} À ${request.time}`} title={request.service} />
      <section className="pro-card pro-detail-card">
        <div className="pro-detail-client"><div className="pro-avatar pro-avatar-large">{request.initials}</div><div><h2>{request.name}</h2><p><MapPin size={14} /> {request.neighborhood}, Douala</p></div><span className={`pro-status-label ${request.status}`}>{statusLabel(request.status)}</span></div>
        <div className="pro-inline-actions">
          <a className="pro-button pro-button-secondary" href={`tel:${request.phone}`}><Phone size={16} /> Appeler</a>
          <a className="pro-button pro-button-plain" href={`https://wa.me/${request.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Message</a>
        </div>
      </section>
      <section className="pro-card pro-detail-card">
        <h2>Détails de la prestation</h2>
        <DetailRow icon={<Scissors size={17} />} label="Prestation" value={`${request.service} · ${request.duration}`} />
        <DetailRow icon={<CreditCard size={17} />} label="Paiement" value="Espèces, à la fin de la prestation" />
        <DetailRow icon={<Wallet size={17} />} label="Montant à recevoir" value={money(request.price)} strong />
      </section>
      <section className="pro-card pro-detail-card">
        <h2>Adresse de la cliente</h2>
        <p className="pro-address">{request.address}</p><p className="pro-directions">{request.directions}</p>
        <a className="pro-button pro-button-secondary pro-button-full" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address)}`} target="_blank" rel="noreferrer"><Navigation size={16} /> Ouvrir l’itinéraire</a>
      </section>
      <section className="pro-card pro-detail-card pro-hair-card">
        <h2>Fiche cheveux de {request.name.split(' ')[0]}</h2>
        <DetailRow icon={<Scissors size={16} />} label="Type de cheveux" value={request.hairType} />
        <DetailRow icon={<ShieldCheck size={16} />} label="Sensibilité" value={request.sensitivity} />
        <DetailRow icon={<CheckCircle2 size={16} />} label="Objectifs" value={request.goals} />
        <DetailRow icon={<ShieldCheck size={16} />} label="Allergies signalées" value={request.allergies} alert={request.allergies.toLowerCase().includes('ammoniaque')} />
        {request.note ? <p className="pro-client-note">« {request.note} »</p> : null}
      </section>
      {request.status === 'pending' ? <div className="pro-inline-actions pro-detail-actions"><button type="button" className="pro-button pro-button-outline-danger" onClick={onRefuse}>Refuser</button><button type="button" className="pro-button pro-button-primary" onClick={onAccept}>Accepter la demande</button></div> : null}
      {request.status === 'accepted' ? <button type="button" className="pro-button pro-button-primary pro-button-full pro-detail-actions" onClick={() => onStatusChange('on_way')}><Navigation size={17} /> Je suis en route</button> : null}
      {request.status === 'on_way' ? <button type="button" className="pro-button pro-button-primary pro-button-full pro-detail-actions" onClick={onFinish}><CheckCircle2 size={17} /> Terminer la prestation</button> : null}
      {['accepted', 'on_way'].includes(request.status) ? <div className="pro-inline-actions pro-secondary-actions"><button type="button" className="pro-button pro-button-plain" onClick={onReport}>Signaler un problème</button><button type="button" className="pro-button pro-button-plain pro-danger-text" onClick={() => { if (window.confirm('Confirmer l’annulation de ce rendez-vous ?')) onStatusChange('cancelled') }}>Annuler</button></div> : null}
      {request.problemReport ? <section className="pro-card pro-detail-card"><h2>Signalement envoyé</h2><p>{request.problemReport}</p></section> : null}
      {request.status === 'done' && request.careNote ? <section className="pro-card pro-detail-card"><h2>Note de soin enregistrée</h2><p>{request.careNote}</p></section> : null}
    </>
  )
}

function DetailRow({ icon, label, value, strong = false, alert = false }: { icon: ReactNode; label: string; value: string; strong?: boolean; alert?: boolean }) {
  return <div className={`pro-detail-row ${alert ? 'alert' : ''}`}><span className="pro-detail-icon">{icon}</span><span><small>{label}</small><strong className={strong ? 'gold' : ''}>{value}</strong></span></div>
}

function Finish({ request, onBack, onFinish }: { request: ProRequest; onBack: () => void; onFinish: (note: string) => void }) {
  const [checked, setChecked] = useState(false)
  const [note, setNote] = useState('')
  return (
    <>
      <button type="button" className="pro-back-button" onClick={onBack}><ArrowLeft size={17} /> Retour au rendez-vous</button>
      <div className="pro-finish-icon"><CheckCircle2 size={34} /></div>
      <PageTitle eyebrow="DERNIÈRE ÉTAPE" title="Prestation terminée ?" />
      <p className="pro-finish-intro">Confirmez la réception du paiement pour clôturer le rendez-vous de {request.name}.</p>
      <label className="pro-cash-confirm"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span><strong>J’ai reçu {money(request.price)} en espèces</strong><small>La cliente a réglé le montant convenu.</small></span><b><Check size={18} /></b></label>
      <label className="pro-field"><span>Note de soin <small>Visible par vous et la cliente</small></span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Produits utilisés, conseils pour les prochains soins…" /></label>
      <button type="button" className="pro-button pro-button-primary pro-button-full" disabled={!checked} onClick={() => onFinish(note.trim())}><CheckCircle2 size={17} /> Terminé et encaissé</button>
      {!checked ? <p className="pro-form-hint">Cochez la confirmation d’encaissement pour continuer.</p> : null}
    </>
  )
}

function Agenda({ data, openRequest, onHours }: { data: ProData; openRequest: (id: string) => void; onHours: () => void }) {
  const [mode, setMode] = useState<'Jour' | 'Semaine'>('Jour')
  const events = [
    ...data.requests.filter((request) => ['accepted', 'on_way'].includes(request.status)).map((request) => ({ id: request.id, time: request.time, title: `${request.service} · ${request.name}`, location: request.neighborhood, kind: 'appointment' as const, duration: request.duration })),
    { id: 'pause', time: '13:00', title: 'Pause déjeuner', location: 'Temps personnel', kind: 'break' as const, duration: '45 min' },
    { id: 'trajet', time: '16:30', title: 'Trajet · Bonanjo', location: 'Déplacement', kind: 'travel' as const, duration: '30 min' },
  ].sort((a, b) => a.time.localeCompare(b.time))
  const weekDays = ['Lun 16', 'Mar 17', 'Mer 18', 'Jeu 19', 'Ven 20', 'Sam 21', 'Dim 22']
  return (
    <>
      <PageTitle eyebrow="ORGANISEZ VOTRE SEMAINE" title="Mon agenda" action={<button type="button" className="pro-icon-button" aria-label="Paramètres des horaires"><Settings2 size={19} /></button>} />
      <div className="pro-view-switch"><button type="button" className={mode === 'Jour' ? 'selected' : ''} onClick={() => setMode('Jour')}>Jour</button><button type="button" className={mode === 'Semaine' ? 'selected' : ''} onClick={() => setMode('Semaine')}>Semaine</button></div>
      {mode === 'Semaine' ? <div className="pro-week-strip">{weekDays.map((day, index) => <button key={day} type="button" className={index === 0 ? 'today' : ''}><small>{day.split(' ')[0]}</small><strong>{day.split(' ')[1]}</strong><i>{index === 0 ? '2' : index === 2 ? '1' : ''}</i></button>)}</div> : <div className="pro-agenda-date"><button type="button" aria-label="Jour précédent"><ArrowLeft size={16} /></button><strong>Lundi 16 novembre 2026</strong><button type="button" aria-label="Jour suivant"><ArrowRight size={16} /></button></div>}
      <div className="pro-agenda-legend"><span><i className="appt" /> Rendez-vous</span><span><i className="pause" /> Pause</span><span><i className="travel" /> Trajet</span></div>
      <div className="pro-timeline">
        {Array.from({ length: 11 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`).map((time) => {
          const event = events.find((item) => item.time.startsWith(time.slice(0, 2)))
          return <div className="pro-time-row" key={time}><span className="pro-time-label">{time}</span><div className="pro-time-slot">{event ? <button type="button" className={`pro-calendar-event ${event.kind}`} onClick={() => event.kind === 'appointment' ? openRequest(event.id) : undefined}><strong>{event.title}</strong><span><MapPin size={13} /> {event.location} · {event.duration}</span></button> : <span className="pro-open-slot">Disponible</span>}</div></div>
        })}
      </div>
      <button type="button" className="pro-button pro-button-secondary pro-button-full" onClick={onHours}>Modifier mes disponibilités</button>
    </>
  )
}

function Earnings({ data, earnings }: { data: ProData; earnings: number }) {
  const completed = data.requests.filter((request) => request.status === 'done')
  return (
    <>
      <PageTitle eyebrow="SUIVI DE VOTRE ACTIVITÉ" title="Mes gains" />
      <section className="pro-earnings-hero"><span><Wallet size={19} /> GAIN DU JOUR</span><strong>{money(earnings)}</strong><small>Les paiements en espèces sont confirmés après chaque prestation.</small></section>
      <div className="pro-earnings-stats"><SummaryCard value={String(completed.length)} label="Prestations terminées" icon={<CheckCircle2 size={17} />} /><SummaryCard value={money(earnings)} label="Total encaissé" icon={<Wallet size={17} />} /></div>
      <div className="pro-section-heading"><h2>Historique des prestations</h2><span className="pro-muted">Novembre</span></div>
      <div className="pro-list">
        {completed.map((request) => <article className="pro-card pro-earning-row" key={request.id}><div className="pro-avatar">{request.initials}</div><div><strong>{request.service}</strong><small>{request.name} · {request.date} · {request.time}</small></div><b>{money(request.price)}</b></article>)}
        {!completed.length ? <EmptyState title="Aucun encaissement" description="Vos prestations terminées apparaîtront dans cet historique." /> : null}
      </div>
      <p className="pro-footnote">DONMEN ne prélève pas de paiement dans l’application. Les règlements sont reçus directement auprès de vos clientes.</p>
    </>
  )
}

function Profile({ firstName, userId, data, setView, updateData }: {
  firstName: string
  userId: string
  data: ProData
  setView: (view: ProView) => void
  updateData: (updater: (previous: ProData) => ProData) => void
}) {
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState(data.profile)
  const [profileError, setProfileError] = useState('')
  const completion = getHairdresserProfileCompletion(firstName, data.profile, data.services)
  const readProfilePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError('Choisissez un fichier image valide.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('La photo doit faire moins de 2 Mo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setProfile((previous) => ({ ...previous, photo: result }))
    }
    reader.onerror = () => setProfileError('Impossible de lire cette image.')
    reader.readAsDataURL(file)
  }
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError('')
    updateData((previous) => ({ ...previous, profile }))
    setEditing(false)
  }
  const shareProfile = async () => {
    const link = `${window.location.origin}/coiffeurs/${userId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      window.prompt('Copiez votre lien public :', link)
    }
  }

  return (
    <>
      <PageTitle eyebrow="VOTRE VITRINE DONMEN" title="Mon profil" action={<button type="button" className="pro-icon-button" aria-label="Modifier le profil" onClick={() => setEditing(!editing)}><Settings2 size={19} /></button>} />
      <section className="pro-profile-card">
        <div className="pro-profile-cover"><span>DONMEN · LE ROI DU LOOK</span></div>
        <div className="pro-profile-main"><div className="pro-profile-avatar">{data.profile.photo ? <img src={data.profile.photo} alt="" /> : (firstName || 'P').slice(0, 1).toUpperCase()}</div><div><h2>{firstName || 'Coiffeur Pro'}</h2><p><Star size={15} fill="currentColor" /> 4,8 <span>· 12 avis</span></p><small><MapPin size={13} /> Douala, Cameroun</small></div><button type="button" className="pro-share-button" onClick={() => void shareProfile()} aria-label="Partager le lien WhatsApp"><MessageCircle size={19} /></button></div>
      </section>
      <section className="pro-card pro-completion">
        <div className="pro-completion-heading"><span>        <strong>Profil complété à {completion}%</strong><small>{completion >= 50 ? 'Votre profil peut apparaître dans l’espace client dès que vous êtes disponible.' : 'Complétez votre profil pour atteindre au moins 50 %.'}</small></span><Camera size={19} /></div>
        <div className="pro-progress"><span style={{ width: `${completion}%` }} /></div>
      </section>

      {editing ? <form className="pro-card pro-profile-form" onSubmit={saveProfile}>
        <div className="pro-section-heading"><h2>Profil public</h2><button type="button" className="pro-text-link" onClick={() => setEditing(false)}>Fermer</button></div>
        <label className="pro-upload-box pro-profile-photo-upload">{profile.photo ? <img src={profile.photo} alt="Aperçu de la photo de profil" /> : <><ImagePlus size={24} /><span>Ajouter une photo de profil</span><small>JPG ou PNG · 2 Mo max</small></>}<input type="file" accept="image/*" onChange={readProfilePhoto} /></label>
        <Field label="Présentation"><textarea rows={3} value={profile.presentation} onChange={(event) => setProfile({ ...profile, presentation: event.target.value })} /></Field>
        <Field label="Spécialités (séparées par des virgules)"><input value={profile.specialties} onChange={(event) => setProfile({ ...profile, specialties: event.target.value })} /></Field>
        <Field label="Quartiers couverts à Douala"><input value={profile.neighborhoods} onChange={(event) => setProfile({ ...profile, neighborhoods: event.target.value })} /></Field>
        <div className="pro-field-grid"><Field label="Années d’expérience"><input type="number" min="0" value={profile.experience} onChange={(event) => setProfile({ ...profile, experience: event.target.value })} /></Field><Field label="Langues parlées"><input value={profile.languages} onChange={(event) => setProfile({ ...profile, languages: event.target.value })} /></Field></div>
        <Field label="Lien réseaux sociaux"><input type="url" placeholder="https://instagram.com/…" value={profile.social} onChange={(event) => setProfile({ ...profile, social: event.target.value })} /></Field>
        <label className="pro-check-row"><input type="checkbox" checked={profile.bringKit} onChange={(event) => setProfile({ ...profile, bringKit: event.target.checked })} /><span>J’apporte mon matériel</span></label>
        {profileError ? <p className="pro-form-error" role="alert">{profileError}</p> : null}
        <button className="pro-button pro-button-primary pro-button-full" type="submit">Enregistrer mon profil</button>
      </form> : null}

      <div className="pro-menu-list">
        <MenuItem icon={<Scissors size={19} />} title="Mon profil public" detail="Présentation, spécialités et zones" onClick={() => setEditing(true)} />
        <MenuItem icon={<BriefcaseBusiness size={19} />} title="Mon catalogue de coiffures" detail={`${data.services.length} prestations proposées`} onClick={() => setView('catalog')} />
        <MenuItem icon={<CalendarDays size={19} />} title="Mes horaires" detail="Jours et disponibilités" onClick={() => setView('hours')} />
        <MenuItem icon={<Star size={19} />} title="Mes avis" detail="4,8/5 · 12 avis clients" onClick={() => setView('reviews')} />
        <MenuItem icon={<MessageCircle size={19} />} title={copied ? 'Lien copié !' : 'Partager mon lien WhatsApp'} detail="Invitez vos clientes à réserver" onClick={() => void shareProfile()} />
      </div>
      <p className="pro-profile-note"><ShieldCheck size={15} /> Votre profil, vos prestations et vos disponibilités sont synchronisés avec DONMEN.</p>
    </>
  )
}

function MenuItem({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button type="button" className="pro-menu-item" onClick={onClick}><span className="pro-menu-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>
}

function Catalog({ services, onBack, onChange }: { services: ProService[]; onBack: () => void; onChange: (services: ProService[]) => void }) {
  const [filter, setFilter] = useState<(typeof categories)[number]>('Tout')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProService | null>(null)
  const [error, setError] = useState('')
  const visible = services.filter((service) => filter === 'Tout' || service.category === filter)
  const startAdd = () => {
    setDraft({ id: crypto.randomUUID(), name: '', category: 'Tresses', price: 0, duration: '1 h', description: '', photo: '' })
    setEditingId('new')
    setError('')
  }
  const startEdit = (service: ProService) => {
    setDraft({ ...service })
    setEditingId(service.id)
    setError('')
  }
  const saveService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !draft.name.trim() || draft.price <= 0) {
      setError('Indiquez un nom et un prix supérieur à 0 FCFA.')
      return
    }
    onChange(editingId === 'new' ? [...services, { ...draft, name: draft.name.trim() }] : services.map((service) => service.id === draft.id ? { ...draft, name: draft.name.trim() } : service))
    setEditingId(null)
    setDraft(null)
  }
  const readPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !draft) return
    if (!file.type.startsWith('image/')) {
      setError('Choisissez un fichier image valide.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La photo doit faire moins de 2 Mo.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setDraft((previous) => previous ? { ...previous, photo: result } : previous)
    }
    reader.onerror = () => setError('Impossible de lire cette image.')
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button type="button" className="pro-back-button" onClick={onBack}><ArrowLeft size={17} /> Mon profil</button>
      <PageTitle eyebrow="VOTRE OFFRE" title="Mon catalogue" action={<button type="button" className="pro-icon-button" aria-label="Ajouter une coiffure" onClick={startAdd}><Plus size={20} /></button>} />
      <div className="pro-filter-row">{categories.map((category) => <button key={category} type="button" className={filter === category ? 'selected' : ''} onClick={() => setFilter(category)}>{category}</button>)}</div>
      {editingId && draft ? <form className="pro-card pro-service-form" onSubmit={saveService}>
        <div className="pro-section-heading"><h2>{editingId === 'new' ? 'Ajouter une coiffure' : 'Modifier la prestation'}</h2><button type="button" className="pro-icon-button" aria-label="Fermer le formulaire" onClick={() => setEditingId(null)}><X size={18} /></button></div>
        <label className="pro-upload-box">{draft.photo ? <img src={draft.photo} alt="Aperçu de la coiffure" /> : <><ImagePlus size={24} /><span>Ajouter une photo</span><small>JPG ou PNG · 2 Mo max</small></>}<input type="file" accept="image/*" onChange={readPhoto} /></label>
        <Field label="Nom de la coiffure"><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex. Knotless braids" /></Field>
        <Field label="Catégorie"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ServiceCategory })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></Field>
        <div className="pro-field-grid"><Field label="Prix (FCFA)"><input type="number" min="1" required value={draft.price || ''} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></Field><Field label="Durée"><select value={draft.duration} onChange={(event) => setDraft({ ...draft, duration: event.target.value })}>{durations.map((duration) => <option key={duration}>{duration}</option>)}</select></Field></div>
        <Field label="Description"><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Décrivez la prestation…" /></Field>
        {error ? <p className="pro-form-error" role="alert">{error}</p> : null}
        <button className="pro-button pro-button-primary pro-button-full" type="submit">Enregistrer la prestation</button>
      </form> : null}
      <div className="pro-catalog-list">
        {visible.map((service) => <article className="pro-card pro-catalog-card" key={service.id}>
          {service.photo ? <img className="pro-catalog-photo" src={service.photo} alt="" /> : <div className="pro-catalog-placeholder"><Scissors size={22} /></div>}
          <div className="pro-catalog-copy"><span className="pro-eyebrow">{service.category.toUpperCase()} · {service.duration}</span><h2>{service.name}</h2><p>{service.description}</p><strong>{money(service.price)}</strong></div>
          <button type="button" className="pro-text-link" onClick={() => startEdit(service)}>Modifier</button>
          <button type="button" className="pro-icon-button pro-delete-button" aria-label={`Supprimer ${service.name}`} onClick={() => { if (window.confirm(`Supprimer « ${service.name} » du catalogue ?`)) onChange(services.filter((item) => item.id !== service.id)) }}><X size={17} /></button>
        </article>)}
        {!visible.length ? <EmptyState title="Aucune coiffure dans cette catégorie" description="Ajoutez une prestation ou choisissez un autre filtre." /> : null}
      </div>
      <button type="button" className="pro-button pro-button-secondary pro-button-full" onClick={startAdd}><Plus size={17} /> Ajouter une coiffure</button>
    </>
  )
}

function Hours({ hours, onBack, onChange }: {
  hours: ProDayHours[]
  onBack: () => void
  onChange: (hours: ProDayHours[]) => void
}) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const updateDay = (index: number, patch: Partial<ProDayHours>) => onChange(hours.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day))
  return (
    <>
      <button type="button" className="pro-back-button" onClick={onBack}><ArrowLeft size={17} /> Mon profil</button>
      <PageTitle eyebrow="VOS DISPONIBILITÉS" title="Mes horaires" />
      <p className="pro-page-intro">Définissez vos créneaux habituels. Vous pouvez ajuster votre disponibilité à tout moment depuis l’accueil.</p>
      <div className="pro-hours-list">{days.map((day, index) => {
        const schedule = hours[index] ?? { open: false, start: '08:00', end: '18:00' }
        return <article className="pro-card pro-hours-row" key={day}><label><input type="checkbox" checked={schedule.open} onChange={(event) => updateDay(index, { open: event.target.checked })} /><strong>{day}</strong></label><div><input aria-label={`${day} heure de début`} type="time" disabled={!schedule.open} value={schedule.start} onChange={(event) => updateDay(index, { start: event.target.value })} /><span>—</span><input aria-label={`${day} heure de fin`} type="time" disabled={!schedule.open} value={schedule.end} onChange={(event) => updateDay(index, { end: event.target.value })} /></div></article>
      })}</div>
      <p className="pro-footnote">Vos horaires sont synchronisés avec votre profil public DONMEN.</p>
    </>
  )
}

function Reviews({ onBack }: { onBack: () => void }) {
  const reviews = [
    { name: 'Clarisse N.', date: 'Il y a 2 jours', rating: 5, text: 'Très douce et professionnelle, mes tresses sont magnifiques !' },
    { name: 'Estelle B.', date: 'Il y a 1 semaine', rating: 5, text: 'Ponctuelle, à l’écoute et le résultat est exactement ce que je voulais.' },
    { name: 'Carole M.', date: 'Il y a 2 semaines', rating: 4, text: 'Très bonne prestation et de bons conseils pour mes cheveux.' },
  ]
  return (
    <>
      <button type="button" className="pro-back-button" onClick={onBack}><ArrowLeft size={17} /> Mon profil</button>
      <PageTitle eyebrow="CE QUE PENSENT VOS CLIENTES" title="Mes avis" />
      <section className="pro-rating-summary"><strong>4,8</strong><span><span className="pro-stars">★★★★★</span><small>12 avis vérifiés</small></span></section>
      <div className="pro-list">{reviews.map((review) => <article className="pro-card pro-review-card" key={review.name}><div className="pro-review-heading"><div className="pro-avatar">{review.name.slice(0, 1)}</div><span><strong>{review.name}</strong><small>{review.date}</small></span><span className="pro-stars">{'★'.repeat(review.rating)}<i>{'★'.repeat(5 - review.rating)}</i></span></div><p>« {review.text} »</p></article>)}</div>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="pro-field"><span>{label}</span>{children}</label>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="pro-empty-state"><span><CheckCircle2 size={22} /></span><strong>{title}</strong><p>{description}</p></section>
}

export default ProWorkspace
