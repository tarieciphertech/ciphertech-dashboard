import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, FolderKanban, RefreshCw, Search, Ticket, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const nameOf = p => String(p || '').split('/').pop() || 'File'
const dateOf = v => v ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const emptyUpload = { relation: 'project', project_id: '', ticket_id: '' }

export default function AdminFilesPage() {
  const [files, setFiles] = useState([]), [projects, setProjects] = useState([]), [tickets, setTickets] = useState([])
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [showUpload, setShowUpload] = useState(false), [upload, setUpload] = useState(emptyUpload), [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef(null)

  const load = async () => {
    setLoading(true); setError('')
    const [{ data: f, error: fe }, { data: p, error: pe }, { data: t, error: te }] = await Promise.all([
      supabase.from('files').select('id,owner_id,bucket,storage_path,mime_type,size,visibility,project_id,ticket_id,created_at,owner:profiles!files_owner_id_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,title').order('updated_at', { ascending: false }),
      supabase.from('tickets').select('id,subject').order('updated_at', { ascending: false }),
    ])
    if (fe) setError(fe.message); else setFiles(f || [])
    if (pe) setError(x => x || pe.message); else setProjects(p || [])
    if (te) setError(x => x || te.message); else setTickets(t || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(x => [x.id, x.title])), [projects])
  const ticketMap = useMemo(() => Object.fromEntries(tickets.map(x => [x.id, x.subject])), [tickets])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return files.filter(f => {
      const kind = f.project_id ? 'project' : f.ticket_id ? 'ticket' : 'unassociated'
      return (filter === 'all' || kind === filter) && (!q || `${nameOf(f.storage_path)} ${f.mime_type || ''} ${projectMap[f.project_id] || ''} ${ticketMap[f.ticket_id] || ''} ${f.owner?.full_name || ''}`.toLowerCase().includes(q))
    })
  }, [files, search, filter, projectMap, ticketMap])

  function closeUpload() {
    if (busy === 'upload') return
    setShowUpload(false); setUpload(emptyUpload); setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function uploadFile(event) {
    event.preventDefault()
    if (!selectedFile) { setError('Choose a file to upload.'); return }
    if (upload.relation === 'project' && !upload.project_id) { setError('Select a project for this file.'); return }
    if (upload.relation === 'ticket' && !upload.ticket_id) { setError('Select a ticket for this file.'); return }

    setBusy('upload'); setError(''); setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session has expired. Please sign in again.'); setBusy(''); return }

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const bucket = upload.relation === 'ticket' ? 'ticket-attachments' : 'project-docs'
    const relationId = upload.relation === 'project' ? upload.project_id : upload.relation === 'ticket' ? upload.ticket_id : 'unassociated'
    const storagePath = `${user.id}/${Date.now()}-${relationId}-${safeName}`

    const { error: storageError } = await supabase.storage.from(bucket).upload(storagePath, selectedFile, { contentType: selectedFile.type || 'application/octet-stream', upsert: false })
    if (storageError) { setError(storageError.message); setBusy(''); return }

    const metadata = {
      owner_id: user.id,
      bucket,
      storage_path: storagePath,
      mime_type: selectedFile.type || null,
      size: selectedFile.size,
      visibility: 'private',
      project_id: upload.relation === 'project' ? upload.project_id : null,
      ticket_id: upload.relation === 'ticket' ? upload.ticket_id : null,
    }
    const { data, error: metadataError } = await supabase.from('files').insert(metadata).select('id,owner_id,bucket,storage_path,mime_type,size,visibility,project_id,ticket_id,created_at,owner:profiles!files_owner_id_fkey(full_name)').single()
    if (metadataError) {
      await supabase.storage.from(bucket).remove([storagePath])
      setError(metadataError.message); setBusy(''); return
    }
    setFiles(items => [data, ...items]); setMessage(`${selectedFile.name} uploaded successfully.`); closeUpload(); setBusy('')
  }

  async function download(f) {
    setBusy(`d-${f.id}`); setError('')
    const { data, error: e } = await supabase.storage.from(f.bucket).download(f.storage_path)
    if (e) setError(e.message)
    else { const u = URL.createObjectURL(data); const a = document.createElement('a'); a.href = u; a.download = nameOf(f.storage_path); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u) }
    setBusy('')
  }

  async function remove(f) {
    if (!window.confirm(`Delete ${nameOf(f.storage_path)}?`)) return
    setBusy(`x-${f.id}`); setError('')
    const { error: se } = await supabase.storage.from(f.bucket).remove([f.storage_path])
    if (se) { setError(se.message); setBusy(''); return }
    const { error: de } = await supabase.from('files').delete().eq('id', f.id)
    if (de) setError(de.message); else { setFiles(xs => xs.filter(x => x.id !== f.id)); setMessage('File deleted.') }
    setBusy('')
  }

  return <div>
    <div className="page-intro"><div><p className="eyebrow">DOCUMENT CONTROL</p><h1>Files</h1><p className="muted">Private project and ticket documents with database relationships preserved.</p></div><div className="team-actions"><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button><button className="primary" onClick={() => { setShowUpload(true); setError('') }}><Upload size={16}/> Upload file</button></div></div>
    {message && <div className="alert success">{message}</div>}{error && <div className="alert danger">{error}</div>}
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE STORAGE INDEX</p><h3>{loading ? 'Loading…' : `${visible.length} file${visible.length === 1 ? '' : 's'}`}</h3></div><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search file, project, ticket…"/></div></div><div className="inquiry-tabs">{[['all','All'],['project','Projects'],['ticket','Tickets'],['unassociated','Unassociated']].map(([v,l]) => <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>)}</div>{loading ? <div className="empty">Loading files…</div> : visible.length === 0 ? <div className="empty"><FileText size={25}/><p>No files match the current filters.</p></div> : <div className="table-wrap"><table><thead><tr><th>File</th><th>Relationship</th><th>Owner</th><th>Type</th><th>Size</th><th>Added</th><th></th></tr></thead><tbody>{visible.map(f => <tr key={f.id}><td><strong>{nameOf(f.storage_path)}</strong><small className="table-sub">{f.bucket}</small></td><td>{f.project_id ? <span><FolderKanban size={14}/> {projectMap[f.project_id] || 'Project'}</span> : f.ticket_id ? <span><Ticket size={14}/> {ticketMap[f.ticket_id] || 'Ticket'}</span> : 'Unassociated'}</td><td>{f.owner?.full_name || '—'}</td><td>{f.mime_type || '—'}</td><td>{f.size ? `${Math.max(1, Math.round(f.size / 1024))} KB` : '—'}</td><td>{dateOf(f.created_at)}</td><td><button className="text-link" onClick={() => download(f)} disabled={busy === `d-${f.id}`}><Download size={14}/> {busy === `d-${f.id}` ? '…' : 'Download'}</button><button className="text-link" onClick={() => remove(f)} disabled={busy === `x-${f.id}`}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>}</section>
    {showUpload && <div className="modal-backdrop"><form className="modal-card inquiry-form" onSubmit={uploadFile}><div className="panel-head"><div><p className="eyebrow">DOCUMENT UPLOAD</p><h3>Upload file</h3><p className="muted">Choose where this private document belongs.</p></div><button type="button" className="icon-btn" onClick={closeUpload}><X size={18}/></button></div><label>File<input ref={inputRef} type="file" required onChange={e => setSelectedFile(e.target.files?.[0] || null)}/></label><label>Relationship<select value={upload.relation} onChange={e => setUpload({ relation: e.target.value, project_id: '', ticket_id: '' })}><option value="project">Project</option><option value="ticket">Ticket</option><option value="unassociated">Unassociated</option></select></label>{upload.relation === 'project' && <label>Project<select required value={upload.project_id} onChange={e => setUpload({ ...upload, project_id: e.target.value })}><option value="">Select project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}{upload.relation === 'ticket' && <label>Ticket<select required value={upload.ticket_id} onChange={e => setUpload({ ...upload, ticket_id: e.target.value })}><option value="">Select ticket…</option>{tickets.map(t => <option key={t.id} value={t.id}>{t.subject || 'Support ticket'}</option>)}</select></label>}<div className="alert"><strong>Storage:</strong> {upload.relation === 'ticket' ? 'ticket-attachments' : 'project-docs'} · private access</div><button className="primary full" disabled={busy === 'upload'}>{busy === 'upload' ? 'Uploading…' : 'Upload file'}</button></form></div>}
  </div>
}
