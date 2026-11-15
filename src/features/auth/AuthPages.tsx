import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Crown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { HONORIFIC } from '../../config/brand'
import './auth.css'
import { useAuth } from './AuthProvider'
import {
  requestPasswordReset,
  signInWithOAuth,
  updatePassword,
} from './api'
import type { OAuthProvider } from './api'
import { clientSignupSchema } from './validation'

const signupValidationKeys: Record<string, string> = {
  username: 'username',
  email: 'email',
  password: 'password',
  confirmPassword: 'passwordMismatch',
}

type AuthFrameProps = {
  children: ReactNode
  eyebrow: string
}

function AuthFrame({ children, eyebrow }: AuthFrameProps) {
  return (
    <main className="donmen-auth">
      <section className="donmen-auth-card">
        <div className="donmen-auth-brand" aria-label="DONMEN">
          <span className="donmen-auth-monogram" aria-hidden="true">D</span>
          <Crown className="donmen-auth-crown" size={22} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <p className="donmen-auth-eyebrow">{eyebrow}</p>
        {children}
      </section>
    </main>
  )
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <label className="donmen-auth-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SocialOptions() {
  const { t } = useTranslation()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState('')
  const providers: { id: OAuthProvider; label: string; mark: string }[] = [
    { id: 'google', label: 'Google', mark: 'G' },
    { id: 'apple', label: 'Apple', mark: '' },
    { id: 'facebook', label: 'Facebook', mark: 'f' },
  ]

  const handleOAuth = async (provider: OAuthProvider) => {
    setError('')
    setPending(provider)
    try {
      await signInWithOAuth(provider)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.socialError'))
      setPending(null)
    }
  }

  return (
    <div className="donmen-auth-social">
      <div className="donmen-auth-divider"><span>{t('auth.continueWith')}</span></div>
      <div className="donmen-auth-social-row">
        {providers.map(({ id, label, mark }) => (
          <button
            key={id}
            className="donmen-auth-social-button"
            type="button"
            aria-label={t('auth.continueWithProvider', { provider: label })}
            disabled={pending !== null}
            onClick={() => void handleOAuth(id)}
          >
            <span className={`donmen-auth-social-mark ${id}`} aria-hidden="true">{mark}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {error ? <p className="donmen-auth-error" role="alert">{error}</p> : null}
    </div>
  )
}

function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="donmen-auth-footer">{children}</p>
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(email, password)
      const state = location.state as { from?: { pathname?: string } } | null
      navigate(state?.from?.pathname || '/', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.incorrectCredentials'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame eyebrow={t('auth.loginEyebrow')}>
      <h1>{t('auth.reconnect')}</h1>
      <p className="donmen-auth-subtitle">{t('auth.loginSubtitle')}</p>
      {(location.state as { emailConfirmationSent?: boolean } | null)?.emailConfirmationSent ? (
        <p className="donmen-auth-success" role="status">{t('auth.emailConfirmationSent')}</p>
      ) : null}
      <form className="donmen-auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField id="login-email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField id="login-password" label={t('auth.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button className="donmen-auth-inline-link" type="button" onClick={() => navigate('/mot-de-passe-oublie')}>
          {t('auth.forgotPassword')}
        </button>
        {error ? <p className="donmen-auth-error" role="alert">{error}</p> : null}
        {!configured ? <p className="donmen-auth-error" role="alert">{t('auth.supabaseLoginSetup')}</p> : null}
        <button className="donmen-auth-submit" type="submit" disabled={pending || !configured}>
          {pending ? t('auth.connecting') : t('auth.loginAction')}
        </button>
      </form>
      <SocialOptions />
      <AuthFooter>
        {t('auth.notRegistered')}{' '}
        <button type="button" className="donmen-auth-inline-link" onClick={() => navigate('/inscription/client')}>
          {t('auth.signUpLink')}
        </button>
      </AuthFooter>
    </AuthFrame>
  )
}

export function SignupPage({ role }: { role: 'client' | 'hairdresser' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signup, configured } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const parsed = clientSignupSchema.safeParse({ username, email, password, confirmPassword })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const field = String(issue?.path[0] ?? '')
      const validationKey = field === 'confirmPassword' && issue?.code === 'custom'
        ? 'passwordMismatch'
        : signupValidationKeys[field] ?? 'invalid'
      setError(t(`auth.validation.${validationKey}`))
      return
    }

    setPending(true)
    try {
      const result = await signup(parsed.data, role)
      if (result.confirmationRequired) {
        navigate('/connexion', { replace: true, state: { emailConfirmationSent: true } })
        return
      }
      navigate(role === 'client' ? '/' : '/pro', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.signupError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame eyebrow={t('auth.signupEyebrow')}>
      <h1>{t('auth.signupTitle')}</h1>
      <p className="donmen-auth-subtitle">{t('auth.signupSubtitle')}</p>
      <form className="donmen-auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField id="signup-username" label={t('auth.username')} value={username} onChange={setUsername} autoComplete="username" />
        <p className="donmen-auth-greeting">
          {t('auth.usernameHelp', { honorific: HONORIFIC, username: username.trim() || '…' })}
        </p>
        <AuthField id="signup-email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField id="signup-password" label={t('auth.password')} type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <AuthField id="signup-confirm-password" label={t('auth.confirmPassword')} type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        {error ? <p className="donmen-auth-error" role="alert">{error}</p> : null}
        {!configured ? <p className="donmen-auth-error" role="alert">{t('auth.supabaseSignupSetup')}</p> : null}
        <button className="donmen-auth-submit" type="submit" disabled={pending || !configured}>
          {pending ? t('auth.creating') : t('auth.signupAction')}
        </button>
      </form>
      <SocialOptions />
      <AuthFooter>
        {t('auth.alreadyHaveAccount')}{' '}
        <button type="button" className="donmen-auth-inline-link" onClick={() => navigate('/connexion')}>
          {t('auth.signInLink')}
        </button>
      </AuthFooter>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { configured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.resetError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame eyebrow={t('auth.resetEyebrow')}>
      <h1>{t('auth.forgotPassword')}</h1>
      <p className="donmen-auth-subtitle">{t('auth.resetSubtitle')}</p>
      {sent ? <p className="donmen-auth-success" role="status">{t('auth.resetSent')}</p> : null}
      <form className="donmen-auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField id="reset-email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" />
        {error ? <p className="donmen-auth-error" role="alert">{error}</p> : null}
        {!configured ? <p className="donmen-auth-error" role="alert">{t('auth.supabaseLoginSetup')}</p> : null}
        <button className="donmen-auth-submit" type="submit" disabled={pending || !configured}>
          {pending ? t('auth.sendingReset') : t('auth.sendResetLink')}
        </button>
      </form>
      <SocialOptions />
      <AuthFooter>
        <button type="button" className="donmen-auth-inline-link" onClick={() => navigate('/connexion')}>
          {t('auth.backToLogin')}
        </button>
      </AuthFooter>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError(t('auth.validation.passwordMismatch'))
      return
    }

    setPending(true)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('auth.resetError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame eyebrow={t('auth.resetEyebrow')}>
      <h1>{t('auth.choosePassword')}</h1>
      <p className="donmen-auth-subtitle">{t('auth.choosePasswordSubtitle')}</p>
      {!loading && !user ? (
        <p className="donmen-auth-error" role="alert">{t('auth.resetLinkExpired')}</p>
      ) : (
        <form className="donmen-auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <AuthField id="new-password" label={t('auth.password')} type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <AuthField id="new-password-confirm" label={t('auth.confirmPassword')} type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          {error ? <p className="donmen-auth-error" role="alert">{error}</p> : null}
          <button className="donmen-auth-submit" type="submit" disabled={pending || loading}>
            {pending ? t('auth.savingPassword') : t('auth.savePassword')}
          </button>
        </form>
      )}
      <AuthFooter>
        <button type="button" className="donmen-auth-inline-link" onClick={() => navigate('/connexion')}>
          {t('auth.backToLogin')}
        </button>
      </AuthFooter>
    </AuthFrame>
  )
}
