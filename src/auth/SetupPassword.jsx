import { useEffect, useState } from 'react'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'

export default function SetupPassword() {
  const { session, profile, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function establishSession() {
      if (!supabase) return
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) {
        if (!cancelled) setReady(true)
        return
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (!cancelled) {
        if (exchangeError) setError(exchangeError.message)
        setReady(true)
      }
    }
    establishSession()
    return () => { cancelled = true }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!session) { setError('This invitation is no longer active. Please request a new invitation.'); return }
    if (!['admin', 'staff'].includes(profile?.role)) { setError('This account is not authorized for the Cypher Technologies internal workspace.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      await updatePassword(password)
      window.location.replace('/')
    } catch (err) {
      setError(err.message || 'Unable to set your password.')
      setBusy(false)
    }
  }

  if (loading || !ready) return <div className="loading">Verifying your invitation…</div>

  if (!session) return <div className="auth-shell"><div className="auth-grid"/><div className="login-card">
    <div className="brand-mark"><span>⚡</span> CYPHER TECHNOLOGIES</div>
    <p className="eyebrow">STAFF INVITATION</p>
    <h1>Invitation required</h1>
    <p className="muted">This invitation link is missing, expired, or has already been used. Ask a Cypher Technologies administrator to send a new invitation.</p>
    {error && <div className="alert danger">{error}</div>}
  </div></div>

  return <div className="auth-shell"><div className="auth-grid"/><form className="login-card" onSubmit={submit}>
    <div className="brand-mark"><span>⚡</span> CYPHER TECHNOLOGIES</div>
    <p className="eyebrow">STAFF INVITATION</p>
    <h1>Set up your account</h1>
    <p className="muted">Create the password you will use to access the Cypher Technologies internal workspace.</p>
    <div className="security-note"><ShieldCheck size={16}/> Signed in as {session.user.email}. Access is controlled by your Supabase profile role.</div>
    {error && <div className="alert danger">{error}</div>}
    <label>New password<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required/></label>
    <label>Confirm password<input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" autoComplete="new-password" minLength={8} required/></label>
    <button className="primary full" disabled={busy}>{busy ? 'Setting up account…' : 'Set password'} <ChevronRight size={17}/></button>
    <div className="security-note"><ShieldCheck size={16}/> Your password is managed securely by Supabase Auth. Your invitation does not determine your role.</div>
  </form></div>
}
