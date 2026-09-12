import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Mail, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

const zohoUsers = [
  { full_name: 'cypher technologies', email: 'cipher@cyphertech.co.zw', role: 'admin', phone: '26771493033', sourceRole: 'Super Administrator' },
  { full_name: 'Infomation', email: 'info@cyphertech.co.zw', role: 'admin', phone: '', sourceRole: 'Administrator' },
  { full_name: 'Nyarai Mpho Kaodza', email: 'mphonyarie@cyphertech.co.zw', role: 'admin', phone: '26771561706', sourceRole: 'Administrator' },
  { full_name: 'Shelton Moyo', email: 'shelton.moyo@cyphertech.co.zw', role: 'staff', phone: '', sourceRole: 'User' },
]

const ROLE_LABELS = {
  admin: 'Administrator',
  staff: 'Staff',
  client: 'Client',
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown'
}

export default function TeamPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'staff' })

  const load = async () => {
    setLoading(true); setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('team-admin', { body: { action: 'list' } })
    if (invokeError) setError(invokeError.message)
    else if (data?.error) setError(data.error)
    else setUsers(data?.users || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const byEmail = useMemo(() => new Map(users.map((u) => [u.email?.toLowerCase(), u])), [users])

  async function invite(person) {
    setBusy(person.email); setError(''); setMessage('')
    const { data, error: invokeError } = await supabase.functions.invoke('team-admin', {
      body: { action: 'invite', full_name: person.full_name, email: person.email, phone: person.phone, role: person.role, company: 'Cypher Technologies' },
    })
    if (invokeError || data?.error) setError(invokeError?.message || data.error)
    else { setMessage(`Invitation sent to ${person.email}.`); await load() }
    setBusy('')
  }

  async function submitInvite(event) {
    event.preventDefault(); await invite(form); setForm({ full_name: '', email: '', phone: '', role: 'staff' }); setShowInvite(false)
  }

  async function setRole(user, role) {
    setBusy(user.id); setError(''); setMessage('')
    const { data, error: invokeError } = await supabase.functions.invoke('team-admin', { body: { action: 'set_role', user_id: user.id, role } })
    if (invokeError || data?.error) setError(invokeError?.message || data.error)
    else { setMessage(`Role updated for ${user.email}.`); await load() }
    setBusy('')
  }

  return <div>
    <div className="page-intro">
      <div><p className="eyebrow">ACCESS CONTROL</p><h1>Team</h1><p className="muted">Manage authorized Cypher Technologies staff through Supabase Auth.</p></div>
      <div className="team-actions"><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button><button className="primary" onClick={() => setShowInvite(true)}><UserPlus size={16}/> Invite user</button></div>
    </div>
    {message && <div className="alert success"><CheckCircle2 size={15}/> {message}</div>}
    {error && <div className="alert danger">{error}</div>}

    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">ZOHO MAIL IMPORT</p><h3>Accounts from the supplied Zoho export</h3></div></div>
      <p className="muted team-note">These records are mapped to application roles. They become real application users only after a Supabase Auth invitation is accepted.</p>
      <div className="team-grid">{zohoUsers.map((person) => {
        const account = byEmail.get(person.email)
        return <div className="team-card" key={person.email}>
          <div className="team-card-head"><div className="avatar">{person.full_name.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase()}</div><div><strong>{person.full_name}</strong><small>{person.email}</small></div></div>
          <div className="team-meta"><span>{person.sourceRole}</span><span className="chip">{roleLabel(account?.profile?.role || person.role)}</span></div>
          {account ? <div className="team-state"><span className="state-dot"/> {account.confirmed ? 'Active account' : 'Invitation pending'}<small>{account.last_sign_in_at ? `Last sign-in: ${new Date(account.last_sign_in_at).toLocaleString()}` : 'No sign-in recorded'}</small></div> : <button className="primary full" disabled={busy === person.email} onClick={() => invite(person)}><Mail size={15}/> {busy === person.email ? 'Sending…' : 'Send invitation'}</button>}
        </div>
      })}</div>
    </section>

    <section className="panel team-list-panel">
      <div className="panel-head"><div><p className="eyebrow">SUPABASE AUTH</p><h3>{loading ? 'Loading accounts…' : `${users.length} authenticated account${users.length === 1 ? '' : 's'}`}</h3></div></div>
      {users.length === 0 && !loading ? <div className="empty">No authenticated accounts returned.</div> : <div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Action</th></tr></thead><tbody>{users.map((user) => {
        const actualRole = user.profile?.role || 'unknown'
        return <tr key={user.id}><td><strong>{user.profile?.full_name || 'Unnamed user'}</strong><br/><small>{user.email}</small></td><td><select className="role-select" value={actualRole} onChange={(e) => setRole(user, e.target.value)} disabled={busy === user.id}><option value="admin">Administrator</option><option value="staff">Staff</option><option value="client">Client</option></select></td><td>{user.confirmed ? <span className="chip">confirmed</span> : <span className="chip">pending</span>}</td><td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</td><td>{actualRole === 'admin' && <ShieldCheck size={16}/>}</td></tr>
      })}</tbody></table></div>}
    </section>

    {showInvite && <div className="modal-backdrop"><form className="modal-card" onSubmit={submitInvite}><div className="panel-head"><div><p className="eyebrow">NEW ACCOUNT</p><h3>Invite team member</h3></div><button type="button" className="icon-btn" onClick={() => setShowInvite(false)}>×</button></div><label>Full name<input required value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})}/></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/></label><label>Application role<select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option value="staff">Staff</option><option value="admin">Administrator</option><option value="client">Client</option></select></label><button className="primary full" disabled={busy}>{busy ? 'Sending invitation…' : 'Send invitation'}</button></form></div>}
  </div>
}
