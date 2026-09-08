import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, FileText, Plus, RefreshCw, Save, Trash2, UserPlus, Users, X } from 'lucide-react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUSES = ['planned','active','on_hold','completed','cancelled']
const formatDate = value => value ? new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : '—'
const fileName = path => String(path || '').split('/').pop() || 'File'

export default function AdminProjectDetail() {
  const { projectId } = useParams(); const navigate = useNavigate()
  const [project,setProject] = useState(null), [members,setMembers] = useState([]), [staff,setStaff] = useState([]), [files,setFiles] = useState([]), [activity,setActivity] = useState([])
  const [loading,setLoading] = useState(true), [saving,setSaving] = useState(false), [busy,setBusy] = useState(''), [error,setError] = useState(''), [message,setMessage] = useState('')
  const [form,setForm] = useState({title:'',description:'',status:'planned',start_date:'',end_date:''})
  const [memberId,setMemberId] = useState(''), [memberRole,setMemberRole] = useState('member')

  async function load() {
    setLoading(true); setError('')
    const [projectResult,membersResult,staffResult,filesResult,activityResult] = await Promise.all([
      supabase.from('projects').select('id,title,description,status,start_date,end_date,owner_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(id,full_name,company)').eq('id',projectId).single(),
      supabase.from('project_members').select('project_id,profile_id,member_role,created_at,profile:profiles!project_members_profile_id_fkey(id,full_name,role,company)').eq('project_id',projectId).order('member_role'),
      supabase.from('profiles').select('id,full_name,role,company').in('role',['staff','admin']).order('full_name'),
      supabase.from('files').select('id,owner_id,bucket,storage_path,mime_type,size,visibility,created_at,project_id').eq('project_id',projectId).order('created_at',{ascending:false}),
      supabase.from('project_activity').select('id,actor_id,action,metadata,created_at,actor:profiles!project_activity_actor_id_fkey(full_name)').eq('project_id',projectId).order('created_at',{ascending:false}).limit(100),
    ])
    if(projectResult.error) setError(projectResult.error.message); else { setProject(projectResult.data); setForm({title:projectResult.data.title||'',description:projectResult.data.description||'',status:projectResult.data.status||'planned',start_date:projectResult.data.start_date||'',end_date:projectResult.data.end_date||''}) }
    if(membersResult.error) setError(x=>x||membersResult.error.message); else setMembers(membersResult.data||[])
    if(staffResult.error) setError(x=>x||staffResult.error.message); else setStaff(staffResult.data||[])
    if(filesResult.error) setError(x=>x||filesResult.error.message); else setFiles(filesResult.data||[])
    if(activityResult.error) setError(x=>x||activityResult.error.message); else setActivity(activityResult.data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[projectId])

  const availableStaff = useMemo(()=>staff.filter(person=>!members.some(member=>member.profile_id===person.id)),[staff,members])
  async function saveProject(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('')
    const {data,error:e2}=await supabase.from('projects').update({title:form.title.trim(),description:form.description||null,status:form.status,start_date:form.start_date||null,end_date:form.end_date||null}).eq('id',projectId).select('id,title,description,status,start_date,end_date,owner_id,created_at,updated_at,owner:profiles!projects_owner_id_fkey(id,full_name,company)').single()
    if(e2) setError(e2.message); else { setProject(data); setMessage('Project details saved.'); await load() }
    setSaving(false)
  }
  async function addMember(e) {
    e.preventDefault(); if(!memberId) return; setBusy('member'); setError(''); setMessage('')
    if(memberRole==='lead') { const {error:e1}=await supabase.from('project_members').update({member_role:'member'}).eq('project_id',projectId).eq('member_role','lead'); if(e1){setError(e1.message);setBusy('');return} }
    const {error:e2}=await supabase.from('project_members').upsert({project_id:projectId,profile_id:memberId,member_role:memberRole},{onConflict:'project_id,profile_id'})
    if(e2) setError(e2.message); else { setMemberId(''); setMemberRole('member'); setMessage('Project team updated.'); await load() }
    setBusy('')
  }
  async function removeMember(member) {
    if(!window.confirm(`Remove ${member.profile?.full_name||'this person'} from the project team?`)) return
    setBusy(`remove-${member.profile_id}`); setError('')
    const {error:e}=await supabase.from('project_members').delete().eq('project_id',projectId).eq('profile_id',member.profile_id)
    if(e) setError(e.message); else { setMessage('Team member removed.'); await load() }
    setBusy('')
  }
  async function changeRole(member,role) {
    setBusy(`role-${member.profile_id}`); setError('')
    if(role==='lead'){const {error:e1}=await supabase.from('project_members').update({member_role:'member'}).eq('project_id',projectId).eq('member_role','lead');if(e1){setError(e1.message);setBusy('');return}}
    const {error:e2}=await supabase.from('project_members').update({member_role:role}).eq('project_id',projectId).eq('profile_id',member.profile_id)
    if(e2)setError(e2.message);else{setMessage('Team role updated.');await load()}
    setBusy('')
  }
  async function uploadFile(e) {
    const file=e.target.files?.[0]; e.target.value=''; if(!file) return
    setBusy('file'); setError(''); setMessage('')
    const user=(await supabase.auth.getUser()).data.user; if(!user){setError('Authentication required.');setBusy('');return}
    const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-'); const path=`${projectId}/${Date.now()}-${safe}`
    const {error:uploadError}=await supabase.storage.from('project-docs').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'})
    if(uploadError){setError(uploadError.message);setBusy('');return}
    const {error:metaError}=await supabase.from('files').insert({owner_id:user.id,bucket:'project-docs',storage_path:path,mime_type:file.type||null,size:file.size,visibility:'private',project_id:projectId})
    if(metaError){await supabase.storage.from('project-docs').remove([path]);setError(metaError.message)}else{setMessage('File uploaded to this project.');await load()}
    setBusy('')
  }
  async function downloadFile(file) {
    setBusy(`download-${file.id}`); setError('')
    const {data,error:e}=await supabase.storage.from(file.bucket).download(file.storage_path)
    if(e){setError(e.message);setBusy('');return}
    const url=URL.createObjectURL(data); const a=document.createElement('a'); a.href=url; a.download=fileName(file.storage_path); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setBusy('')
  }
  async function deleteFile(file) {
    if(!window.confirm(`Delete ${fileName(file.storage_path)} from this project?`)) return
    setBusy(`delete-file-${file.id}`); setError('')
    const {error:storageError}=await supabase.storage.from(file.bucket).remove([file.storage_path])
    if(storageError){setError(storageError.message);setBusy('');return}
    const {error:metaError}=await supabase.from('files').delete().eq('id',file.id)
    if(metaError)setError(metaError.message);else{setMessage('File deleted.');await load()}
    setBusy('')
  }

  if(loading) return <div className="empty">Loading project workspace…</div>
  if(!project) return <div className="empty"><h3>Project not found</h3><NavLink className="text-link" to="/projects">← Back to projects</NavLink></div>
  return <div>
    <div className="page-intro"><div><NavLink className="text-link" to="/projects"><ArrowLeft size={15}/> Projects</NavLink><p className="eyebrow">PROJECT OPERATIONS</p><h1>{project.title}</h1><p className="muted">Customer: {project.owner?.full_name||'—'}{project.owner?.company?` · ${project.owner.company}`:''}</p></div><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div>
    {message&&<div className="alert success">{message}</div>}{error&&<div className="alert danger">{error}</div>}
    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">DELIVERY</p><h3>Project details</h3></div></div><form className="modal-card" onSubmit={saveProject}><label>Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><div className="form-two"><label>Start date<input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label><label>End date<input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></label></div><button className="primary" disabled={saving}><Save size={15}/>{saving?'Saving…':'Save project'}</button></form></section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">TEAM</p><h3>Project team</h3></div><Users size={17}/></div><form className="form-two" onSubmit={addMember}><select value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Add staff member…</option>{availableStaff.map(x=><option key={x.id} value={x.id}>{x.full_name||x.role}{x.company?` — ${x.company}`:''}</option>)}</select><div className="form-two"><select value={memberRole} onChange={e=>setMemberRole(e.target.value)}><option value="member">Member</option><option value="lead">Lead</option></select><button className="primary" disabled={!memberId||busy==='member'}><UserPlus size={15}/>{busy==='member'?'Adding…':'Add'}</button></div></form>{members.length?<div className="notes-list">{members.map(member=><article className="note-item" key={member.profile_id}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><strong>{member.profile?.full_name||'Unknown'}</strong><small>{member.profile?.role||'staff'}{member.profile?.company?` · ${member.profile.company}`:''}</small></div><div style={{display:'flex',gap:8,alignItems:'center'}}><select value={member.member_role} onChange={e=>changeRole(member,e.target.value)} disabled={busy===`role-${member.profile_id}`}><option value="member">Member</option><option value="lead">Lead</option></select><button className="icon-btn" title="Remove" onClick={()=>removeMember(member)} disabled={busy===`remove-${member.profile_id}`}><Trash2 size={15}/></button></div></div></article>)}</div>:<div className="empty">No team members assigned yet.</div>}</section>
    </div>
    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">FILES</p><h3>Project files</h3></div><label className="primary" style={{cursor:'pointer'}}><Plus size={15}/> {busy==='file'?'Uploading…':'Upload file'}<input type="file" hidden onChange={uploadFile} disabled={busy==='file'}/></label></div>{files.length?<div className="table-wrap"><table><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Added</th><th></th></tr></thead><tbody>{files.map(file=><tr key={file.id}><td><FileText size={15}/> {fileName(file.storage_path)}</td><td>{file.mime_type||'—'}</td><td>{file.size?`${Math.round(file.size/1024)} KB`:'—'}</td><td>{formatDate(file.created_at)}</td><td><button className="text-link" onClick={()=>downloadFile(file)} disabled={busy===`download-${file.id}`}><Download size={14}/> {busy===`download-${file.id}`?'…':'Download'}</button> <button className="text-link" onClick={()=>deleteFile(file)} disabled={busy===`delete-file-${file.id}`}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>:<div className="empty">No project files yet.</div>}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">ACTIVITY</p><h3>Project activity</h3></div></div>{activity.length?<div className="activity-list">{activity.map(item=><div className="activity-item" key={item.id}><span/><div><strong>{item.action.replaceAll('_',' ')}</strong><small>{item.actor?.full_name||'System'} · {formatDate(item.created_at)}</small></div></div>)}</div>:<div className="empty">No project activity yet.</div>}</section>
    </div>
  </div>
}
