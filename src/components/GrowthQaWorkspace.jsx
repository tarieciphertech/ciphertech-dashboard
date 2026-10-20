import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, CircleAlert, Plus, RefreshCw, Search, Target, Bug, ClipboardCheck } from 'lucide-react'

const TABS = [
  { id: 'leads', label: 'Marketing pipeline', icon: Target },
  { id: 'tests', label: 'Test cases', icon: ClipboardCheck },
  { id: 'defects', label: 'QA defects', icon: Bug },
]
const LEAD_STAGES = ['new','contacted','meeting_booked','proposal_sent','won','lost']
const TEST_STATUSES = ['planned','in_progress','passed','failed','blocked']
const DEFECT_STATUSES = ['open','triaged','in_progress','fixed','retest','closed','wont_fix']
const titleCase = value => String(value || '').replaceAll('_',' ').replace(/\b\w/g, x => x.toUpperCase())
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not set'

export default function GrowthQaWorkspace() {
  const [tab, setTab] = useState('leads')
  const [leads, setLeads] = useState([])
  const [tests, setTests] = useState([])
  const [defects, setDefects] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [staff, setStaff] = useState([])

  async function load() {
    setLoading(true); setError('')
    const results = await Promise.all([
      supabase.from('growth_leads').select('*, owner:profiles!growth_leads_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('qa_test_cases').select('*, project:projects(title), owner:profiles!qa_test_cases_assigned_to_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('qa_defects').select('*, project:projects(title), test_case:qa_test_cases(title)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,title').order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('id,full_name,role').in('role', ['admin','staff']).order('full_name'),
    ])
    const failed = results.find(result => result.error)
    if (failed) setError(failed.error.message)
    setLeads(results[0].data || [])
    setTests(results[1].data || [])
    setDefects(results[2].data || [])
    setProjects(results[3].data || [])
    setStaff(results[4].data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const rows = tab === 'leads' ? leads : tab === 'tests' ? tests : defects
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => [row.organization,row.contact_name,row.title,row.email,row.segment,row.stage,row.status,row.severity,row.description,row.project?.title].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [tab, leads, tests, defects, search])

  const stats = [
    { label: 'School prospects', value: leads.filter(x => x.segment === 'school' && !['won','lost'].includes(x.stage)).length },
    { label: 'Follow-ups due', value: leads.filter(x => x.next_follow_up && x.next_follow_up <= new Date().toISOString().slice(0,10) && !['won','lost'].includes(x.stage)).length },
    { label: 'Tests needing work', value: tests.filter(x => ['planned','in_progress','blocked'].includes(x.status)).length },
    { label: 'Open high-impact defects', value: defects.filter(x => ['open','triaged','in_progress','retest'].includes(x.status) && ['high','critical'].includes(x.severity)).length },
  ]

  function openCreate() {
    setError(''); setMessage('')
    setForm(tab === 'leads'
      ? { organization:'', contact_name:'', email:'', phone:'', segment:'school', stage:'new', next_follow_up:'', assigned_to:'', notes:'' }
      : tab === 'tests'
        ? { title:'', project_id:'', test_type:'functional', status:'planned', severity:'medium', assigned_to:'', due_date:'', steps:'', expected_result:'', actual_result:'', evidence_url:'' }
        : { title:'', test_case_id:'', project_id:'', severity:'medium', status:'open', description:'', reproduction_steps:'', assignee_id:'', evidence_url:'' })
    setShowForm(true)
  }

  async function createRecord(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const table = tab === 'leads' ? 'growth_leads' : tab === 'tests' ? 'qa_test_cases' : 'qa_defects'
    const payload = { ...form }
    for (const key of ['assigned_to','assignee_id','project_id','test_case_id']) if (payload[key] === '') payload[key] = null
    for (const key of ['next_follow_up','due_date']) if (payload[key] === '') payload[key] = null
    const { error: e } = await supabase.from(table).insert(payload)
    if (e) setError(e.message)
    else { setShowForm(false); setMessage('Record created successfully.'); await load() }
    setBusy(false)
  }

  async function updateStatus(table, id, status) {
    setError(''); setMessage('')
    const field = table === 'growth_leads' ? 'stage' : 'status'
    const { error: e } = await supabase.from(table).update({ [field]: status, updated_at: new Date().toISOString() }).eq('id', id)
    if (e) setError(e.message)
    else { setMessage('Workflow status updated.'); await load() }
  }

  return <div className="growth-workspace">
    <div className="page-intro"><div><p className="eyebrow">GROWTH + DELIVERY</p><h1>Growth &amp; QA workspace</h1><p className="muted">Track school-system opportunities, QA test execution and defects in one accountable workflow.</p></div><button className="icon-btn" onClick={load} aria-label="Refresh workspace" title="Refresh"><RefreshCw size={16}/></button></div>
    <div className="growth-stats">{stats.map(stat => <div className="metric" key={stat.label}><span>{stat.label}</span><strong>{loading ? '—' : stat.value}</strong><small>Live database count</small></div>)}</div>
    {message && <div className="alert success"><CheckCircle2 size={15}/>{message}</div>}
    {error && <div className="alert danger"><CircleAlert size={15}/>{error}</div>}
    <section className="panel">
      <div className="growth-toolbar"><div className="growth-tabs">{TABS.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setSearch(''); setMessage(''); setError('') }}><Icon size={15}/>{item.label}<strong>{item.id === 'leads' ? leads.length : item.id === 'tests' ? tests.length : defects.length}</strong></button> })}</div><button className="primary" onClick={openCreate}><Plus size={15}/> New {tab === 'leads' ? 'prospect' : tab === 'tests' ? 'test case' : 'defect'}</button></div>
      <div className="panel-head"><div><p className="eyebrow">LIVE WORK QUEUE</p><h3>{loading ? 'Loading…' : `${filtered.length} records`}</h3></div><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…"/></div></div>
      {loading ? <div className="empty">Loading live records…</div> : filtered.length === 0 ? <div className="empty">Nothing here yet. Create the first record to start tracking work.</div> : <div className="table-wrap"><table><thead><tr>{tab === 'leads' ? <><th>Organization</th><th>Segment</th><th>Stage</th><th>Owner</th><th>Next follow-up</th><th>Contact</th></> : tab === 'tests' ? <><th>Test case</th><th>Project</th><th>Type</th><th>Severity</th><th>Owner</th><th>Due</th><th>Status</th></> : <><th>Defect</th><th>Project</th><th>Severity</th><th>Owner</th><th>Status</th><th>Evidence</th></>}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}>{tab === 'leads' ? <><td><strong>{row.organization}</strong><small className="table-sub">{row.contact_name || 'Contact not added'}</small></td><td>{titleCase(row.segment)}</td><td><select className="workflow-select" value={row.stage} onChange={e => { const next = e.target.value; setLeads(xs => xs.map(x => x.id === row.id ? {...x,stage:next} : x)); updateStatus('growth_leads', row.id, next).catch(() => {}) }} aria-label={`Stage for ${row.organization}`}>{LEAD_STAGES.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></td><td>{row.owner?.full_name || 'Unassigned'}</td><td>{dateLabel(row.next_follow_up)}</td><td>{row.email || row.phone || '—'}</td></> : tab === 'tests' ? <><td><strong>{row.title}</strong><small className="table-sub">{row.steps || 'No test steps added'}</small></td><td>{row.project?.title || 'General QA'}</td><td>{titleCase(row.test_type)}</td><td><span className={`chip severity-${row.severity}`}>{titleCase(row.severity)}</span></td><td>{row.owner?.full_name || 'Unassigned'}</td><td>{dateLabel(row.due_date)}</td><td><select className="workflow-select" value={row.status} onChange={e => updateStatus('qa_test_cases', row.id, e.target.value)} aria-label={`Status for ${row.title}`}>{TEST_STATUSES.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></td></> : <><td><strong>{row.title}</strong><small className="table-sub">{row.test_case?.title || row.description}</small></td><td>{row.project?.title || 'General QA'}</td><td><span className={`chip severity-${row.severity}`}>{titleCase(row.severity)}</span></td><td>{row.assignee_id ? (staff.find(x => x.id === row.assignee_id)?.full_name || 'Assigned') : 'Unassigned'}</td><td><select className="workflow-select" value={row.status} onChange={e => updateStatus('qa_defects', row.id, e.target.value)} aria-label={`Status for ${row.title}`}>{DEFECT_STATUSES.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}</select></td><td>{row.evidence_url ? <a className="text-link" href={row.evidence_url} target="_blank" rel="noreferrer">Open evidence</a> : '—'}</td></>}</tr>)}</tbody></table></div>}
    </section>
    {showForm && <div className="modal-backdrop"><form className="modal-card growth-form" onSubmit={createRecord}><div className="panel-head"><div><p className="eyebrow">CREATE WORK ITEM</p><h3>{tab === 'leads' ? 'New marketing prospect' : tab === 'tests' ? 'New QA test case' : 'Report a defect'}</h3></div><button type="button" className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
      {tab === 'leads' ? <><div className="form-two"><label>School / organization<input required value={form.organization || ''} onChange={e => setForm({...form,organization:e.target.value})}/></label><label>Contact person<input value={form.contact_name || ''} onChange={e => setForm({...form,contact_name:e.target.value})}/></label></div><div className="form-two"><label>Email<input type="email" value={form.email || ''} onChange={e => setForm({...form,email:e.target.value})}/></label><label>Phone<input value={form.phone || ''} onChange={e => setForm({...form,phone:e.target.value})}/></label></div><div className="form-two"><label>Opportunity type<select value={form.segment} onChange={e => setForm({...form,segment:e.target.value})}>{['school','software_qa','software_development','other'].map(x => <option key={x} value={x}>{titleCase(x)}</option>)}</select></label><label>Stage<select value={form.stage} onChange={e => setForm({...form,stage:e.target.value})}>{LEAD_STAGES.map(x => <option key={x} value={x}>{titleCase(x)}</option>)}</select></label></div><div className="form-two"><label>Next follow-up<input type="date" value={form.next_follow_up || ''} onChange={e => setForm({...form,next_follow_up:e.target.value})}/></label><label>Assign owner<select value={form.assigned_to || ''} onChange={e => setForm({...form,assigned_to:e.target.value})}><option value="">Unassigned</option>{staff.map(x => <option key={x.id} value={x.id}>{x.full_name || x.role}</option>)}</select></label></div><label>Notes / next action<textarea value={form.notes || ''} onChange={e => setForm({...form,notes:e.target.value})}/></label></> : tab === 'tests' ? <><label>Test case title<input required value={form.title || ''} onChange={e => setForm({...form,title:e.target.value})}/></label><div className="form-two"><label>Project<select value={form.project_id || ''} onChange={e => setForm({...form,project_id:e.target.value})}><option value="">General QA / no project</option>{projects.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label>Test type<select value={form.test_type} onChange={e => setForm({...form,test_type:e.target.value})}>{['functional','regression','usability','security','performance','acceptance','other'].map(x => <option key={x} value={x}>{titleCase(x)}</option>)}</select></label></div><div className="form-two"><label>Severity<select value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}>{['low','medium','high','critical'].map(x => <option key={x} value={x}>{titleCase(x)}</option>)}</select></label><label>Assigned tester<select value={form.assigned_to || ''} onChange={e => setForm({...form,assigned_to:e.target.value})}><option value="">Unassigned</option>{staff.map(x => <option key={x.id} value={x.id}>{x.full_name || x.role}</option>)}</select></label></div><label>Due date<input type="date" value={form.due_date || ''} onChange={e => setForm({...form,due_date:e.target.value})}/></label><label>Steps to reproduce / execute<textarea value={form.steps || ''} onChange={e => setForm({...form,steps:e.target.value})}/></label><label>Expected result<textarea value={form.expected_result || ''} onChange={e => setForm({...form,expected_result:e.target.value})}/></label><label>Actual result<textarea value={form.actual_result || ''} onChange={e => setForm({...form,actual_result:e.target.value})}/></label><label>Evidence URL<input type="url" value={form.evidence_url || ''} onChange={e => setForm({...form,evidence_url:e.target.value})}/></label></> : <><label>Defect title<input required value={form.title || ''} onChange={e => setForm({...form,title:e.target.value})}/></label><div className="form-two"><label>Project<select value={form.project_id || ''} onChange={e => setForm({...form,project_id:e.target.value})}><option value="">General QA / no project</option>{projects.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label>Related test case<select value={form.test_case_id || ''} onChange={e => setForm({...form,test_case_id:e.target.value})}><option value="">Not linked</option>{tests.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div><div className="form-two"><label>Severity<select value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}>{['low','medium','high','critical'].map(x => <option key={x} value={x}>{titleCase(x)}</option>)}</select></label><label>Assigned to<select value={form.assignee_id || ''} onChange={e => setForm({...form,assignee_id:e.target.value})}><option value="">Unassigned</option>{staff.map(x => <option key={x.id} value={x.id}>{x.full_name || x.role}</option>)}</select></label></div><label>Description<textarea required value={form.description || ''} onChange={e => setForm({...form,description:e.target.value})}/></label><label>Reproduction steps<textarea value={form.reproduction_steps || ''} onChange={e => setForm({...form,reproduction_steps:e.target.value})}/></label><label>Evidence URL<input type="url" value={form.evidence_url || ''} onChange={e => setForm({...form,evidence_url:e.target.value})}/></label></>}
      <button className="primary full" disabled={busy}>{busy ? 'Saving…' : 'Save work item'}</button></form></div>}
  </div>
}
