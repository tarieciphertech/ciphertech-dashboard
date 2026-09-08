import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock3, Mail, MessageSquare, Plus, RefreshCw, Search, Trash2, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed']

const emptyForm = { name: '', email: '', phone: '', service: '', budget: '', message: '', status: 'new', assigned_to: '', resolution: '' }

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusChip({ status }) {
  return <span className={`chip status-${status}`}>{status?.replace('_', ' ') || 'new'}</span>
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [staff, setStaff] = useState([])
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState([])
  const [activity, setActivity] = useState([])
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    setLoading(true); setError('')
    const [inquiryResult, staffResult] = await Promise.all([
      supabase.from('inquiries').select('*, assigned:profiles!inquiries_assigned_to_fkey(id, full_name, email: id)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').in('role', ['admin', 'staff']).order('full_name'),
    ])
    if (inquiryResult.error) setError(inquiryResult.error.message)
    else setInquiries(inquiryResult.data || [])
    if (staffResult.error) setError((current) => current || staffResult.error.message)
    else setStaff(staffResult.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openInquiry(inquiry) {
    setSelected(inquiry); setNote(''); setMessage(''); setError('')
    const [notesResult, activityResult] = await Promise.all([
      supabase.from('inquiry_notes').select('id, body, created_at, author:profiles!inquiry_notes_author_id_fkey(full_name)').eq('inquiry_id', inquiry.id).order('created_at', { ascending: false }),
      supabase.from('inquiry_activity').select('id, action, metadata, created_at, actor:profiles!inquiry_activity_actor_id_fkey(full_name)').eq('inquiry_id', inquiry.id).order('created_at', { ascending: false }).limit(50),
    ])
    if (notesResult.error) setError(notesResult.error.message); else setNotes(notesResult.data || [])
    if (activityResult.error) setError((current) => current || activityResult.error.message); else setActivity(activityResult.data || [])
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inquiries.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const haystack = [item.name, item.email, item.phone, item.service, item.budget, item.message].filter(Boolean).join(' ').toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [inquiries, search, statusFilter])

  const counts = useMemo(() => Object.fromEntries(['all', ...STATUSES].map((key) => [key, key === 'all' ? inquiries.length : inquiries.filter(x => x.status === key).length])), [inquiries])

  async function updateInquiry(patch) {
    if (!selected) return
    setBusy(selected.id); setError(''); setMessage('')
    const { data, error: updateError } = await supabase.from('inquiries').update(patch).eq('id', selected.id).select('*, assigned:profiles!inquiries_assigned_to_fkey(id, full_name)').single()
    if (updateError) setError(updateError.message)
    else { setSelected(data); setInquiries((items) => items.map(item => item.id === data.id ? data : item)); setMessage('Inquiry updated.'); await openInquiry(data) }
    setBusy('')
  }

  async function addNote(event) {
    event.preventDefault()
    if (!selected || !note.trim()) return
    setBusy(`note-${selected.id}`); setError(''); setMessage('')
    const { error: noteError } = await supabase.from('inquiry_notes').insert({ inquiry_id: selected.id, body: note.trim(), author_id: (await supabase.auth.getUser()).data.user?.id })
    if (noteError) setError(noteError.message)
    else { setNote(''); setMessage('Internal note added.'); await openInquiry(selected) }
    setBusy('')
  }

  async function createInquiry(event) {
    event.preventDefault(); setBusy('create'); setError(''); setMessage('')
    const payload = { ...form, assigned_to: form.assigned_to || null }
    const { data, error: createError } = await supabase.from('inquiries').insert(payload).select('*, assigned:profiles!inquiries_assigned_to_fkey(id, full_name)').single()
    if (createError) setError(createError.message)
    else { setInquiries(items => [data, ...items]); setForm(emptyForm); setShowCreate(false); setMessage('Inquiry created.'); setSelected(data); await openInquiry(data) }
    setBusy('')
  }

  async function deleteInquiry() {
    if (!selected || !window.confirm(`Delete the inquiry from ${selected.name || selected.email}? This cannot be undone.`)) return
    setBusy(`delete-${selected.id}`); setError('')
    const { error: deleteError } = await supabase.from('inquiries').delete().eq('id', selected.id)
    if (deleteError) setError(deleteError.message)
    else { setInquiries(items => items.filter(item => item.id !== selected.id)); setSelected(null); setMessage('Inquiry deleted.') }
    setBusy('')
  }

  return <div>
    <div className="page-intro">
      <div><p className="eyebrow">CLIENT INBOX</p><h1>Inquiries</h1><p className="muted">Manage incoming client enquiries from first contact through conversion or closure.</p></div>
      <div className="team-actions"><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button><button className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> New inquiry</button></div>
    </div>
    {message && <div className="alert success"><CheckCircle2 size={15}/> {message}</div>}
    {error && <div className="alert danger">{error}</div>}

    <div className="inquiry-tabs">{['all', ...STATUSES].map(status => <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>{status === 'all' ? 'All' : status}<strong>{counts[status]}</strong></button>)}</div>

    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">LIVE DATABASE</p><h3>{loading ? 'Loading inquiries…' : `${filtered.length} of ${inquiries.length} inquiries`}</h3></div><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, email, service…"/></div></div>
      {loading ? <div className="empty">Loading live inquiries…</div> : filtered.length === 0 ? <div className="empty"><MessageSquare size={25}/><p>No inquiries match the current filters.</p></div> : <div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Status</th><th>Assigned</th><th>Received</th><th></th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className="clickable-row" onClick={() => openInquiry(item)}><td><strong>{item.name || 'Unnamed client'}</strong><small className="table-sub">{item.email}</small></td><td>{item.service || 'General inquiry'}</td><td><StatusChip status={item.status}/></td><td>{item.assigned?.full_name || 'Unassigned'}</td><td>{formatDate(item.created_at)}</td><td><ChevronRight size={15}/></td></tr>)}</tbody></table></div>}
    </section>

    {selected && <div className="modal-backdrop inquiry-backdrop"><section className="inquiry-detail">
      <header className="detail-head"><div><p className="eyebrow">INQUIRY DETAIL</p><h2>{selected.name || 'Unnamed client'}</h2><p className="muted">Received {formatDate(selected.created_at)}</p></div><button className="icon-btn" onClick={() => setSelected(null)}><X size={18}/></button></header>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-card"><div className="detail-card-head"><h3>Client message</h3><StatusChip status={selected.status}/></div><p className="inquiry-message">{selected.message || 'No message provided.'}</p><div className="client-contact"><a href={`mailto:${selected.email}`}><Mail size={15}/>{selected.email}</a>{selected.phone && <a href={`tel:${selected.phone}`}><UserRound size={15}/>{selected.phone}</a>}</div></section>
          <section className="detail-card"><div className="detail-card-head"><h3>Internal notes</h3><span>{notes.length}</span></div><form onSubmit={addNote} className="note-form"><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a private staff note…"/><button className="primary" disabled={busy === `note-${selected.id}` || !note.trim()}>{busy === `note-${selected.id}` ? 'Saving…' : 'Add note'}</button></form>{notes.length ? <div className="notes-list">{notes.map(item => <article className="note-item" key={item.id}><p>{item.body}</p><small>{item.author?.full_name || 'Staff'} · {formatDate(item.created_at)}</small></article>)}</div> : <div className="empty">No internal notes yet.</div>}</section>
          <section className="detail-card"><div className="detail-card-head"><h3>Activity history</h3><Clock3 size={15}/></div>{activity.length ? <div className="activity-list">{activity.map(item => <div className="activity-item" key={item.id}><span/><div><strong>{item.action.replaceAll('_', ' ')}</strong><small>{item.actor?.full_name || 'Public submission'} · {formatDate(item.created_at)}</small></div></div>)}</div> : <div className="empty">No activity recorded.</div>}</section>
        </div>
        <aside className="detail-side">
          <section className="detail-card"><h3>Workflow</h3><label>Status<select value={selected.status} onChange={e => updateInquiry({ status: e.target.value })} disabled={busy === selected.id}>{STATUSES.map(x => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></label><label>Assign to<select value={selected.assigned_to || ''} onChange={e => updateInquiry({ assigned_to: e.target.value || null })} disabled={busy === selected.id}><option value="">Unassigned</option>{staff.map(person => <option key={person.id} value={person.id}>{person.full_name || person.role}</option>)}</select></label><label>Service<input value={selected.service || ''} onChange={e => setSelected({...selected, service:e.target.value})} onBlur={e => updateInquiry({ service:e.target.value })}/></label><label>Budget<input value={selected.budget || ''} onChange={e => setSelected({...selected, budget:e.target.value})} onBlur={e => updateInquiry({ budget:e.target.value })}/></label><label>Resolution<textarea value={selected.resolution || ''} onChange={e => setSelected({...selected, resolution:e.target.value})} onBlur={e => updateInquiry({ resolution:e.target.value })} placeholder="Outcome or closure details…"/></label></section>
          <section className="detail-card"><h3>Timeline</h3><div className="timeline"><p><span>Received</span><strong>{formatDate(selected.created_at)}</strong></p><p><span>Contacted</span><strong>{formatDate(selected.contacted_at)}</strong></p><p><span>Qualified</span><strong>{formatDate(selected.qualified_at)}</strong></p><p><span>Converted</span><strong>{formatDate(selected.converted_at)}</strong></p><p><span>Closed</span><strong>{formatDate(selected.closed_at)}</strong></p><p><span>Last updated</span><strong>{formatDate(selected.updated_at)}</strong></p></div></section>
          <button className="danger-btn" onClick={deleteInquiry} disabled={busy === `delete-${selected.id}`}><Trash2 size={15}/> {busy === `delete-${selected.id}` ? 'Deleting…' : 'Delete inquiry'}</button>
        </aside>
      </div>
    </section></div>}

    {showCreate && <div className="modal-backdrop"><form className="modal-card inquiry-form" onSubmit={createInquiry}><div className="panel-head"><div><p className="eyebrow">MANUAL ENTRY</p><h3>New inquiry</h3></div><button type="button" className="icon-btn" onClick={() => setShowCreate(false)}><X size={18}/></button></div><div className="form-two"><label>Name<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})}/></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/></label></div><div className="form-two"><label>Phone<input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/></label><label>Service<input value={form.service} onChange={e => setForm({...form, service:e.target.value})}/></label></div><div className="form-two"><label>Budget<input value={form.budget} onChange={e => setForm({...form, budget:e.target.value})}/></label><label>Assign to<select value={form.assigned_to} onChange={e => setForm({...form, assigned_to:e.target.value})}><option value="">Unassigned</option>{staff.map(person => <option key={person.id} value={person.id}>{person.full_name || person.role}</option>)}</select></label></div><label>Message<textarea required value={form.message} onChange={e => setForm({...form, message:e.target.value})}/></label><button className="primary full" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create inquiry'}</button></form></div>}
  </div>
}
