import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, CircleDollarSign, ClipboardCheck, Clock3, FolderKanban, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { money, dateTime, dateOnly } from '../lib/data'

const empty = { finance: null, repairs: [], projects: [], tasks: [], inquiries: [], tickets: [], notifications: [], errors: [] }

export default function OverviewPage() {
  const [state, setState] = useState({ ...empty, loading: true })

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!supabase) { if (mounted) setState({ ...empty, loading: false, errors: ['Supabase is not configured.'] }); return }
      const queries = await Promise.all([
        supabase.from('finance_control_summary').select('*').single(),
        supabase.from('repairs').select('id,brand,model,issue_reported,repair_status,priority,total_amount,expected_completion_date,completed_at,updated_at,customers(full_name)').order('updated_at', { ascending: false }).limit(20),
        supabase.from('projects').select('id,title,status,start_date,end_date,updated_at').order('updated_at', { ascending: false }).limit(20),
        supabase.from('project_tasks').select('id,title,status,priority,due_date,updated_at,projects(title)').order('due_date', { ascending: true, nullsFirst: false }).limit(30),
        supabase.from('inquiries').select('id,name,service,status,updated_at').order('updated_at', { ascending: false }).limit(10),
        supabase.from('tickets').select('id,subject,status,priority,updated_at').order('updated_at', { ascending: false }).limit(10),
        supabase.from('notifications').select('id,type,payload,created_at,read_at').order('created_at', { ascending: false }).limit(8),
      ])
      if (!mounted) return
      setState({ finance: queries[0].data || null, repairs: queries[1].data || [], projects: queries[2].data || [], tasks: queries[3].data || [], inquiries: queries[4].data || [], tickets: queries[5].data || [], notifications: queries[6].data || [], errors: queries.filter(item => item.error).map(item => item.error.message), loading: false })
    }
    load(); return () => { mounted = false }
  }, [])

  const activeRepairs = useMemo(() => state.repairs.filter(r => !['completed', 'cancelled'].includes(r.repair_status)), [state.repairs])
  const completedRepairs = useMemo(() => state.repairs.filter(r => r.repair_status === 'completed'), [state.repairs])
  const activeProjects = useMemo(() => state.projects.filter(p => ['planned', 'active', 'on_hold'].includes(p.status)), [state.projects])
  const completedProjects = useMemo(() => state.projects.filter(p => p.status === 'completed'), [state.projects])
  const openTasks = useMemo(() => state.tasks.filter(t => ['todo', 'in_progress', 'blocked'].includes(t.status)), [state.tasks])
  const blockedTasks = useMemo(() => openTasks.filter(t => t.status === 'blocked'), [openTasks])
  const attentionInquiries = useMemo(() => state.inquiries.filter(i => ['new', 'qualified'].includes(i.status)), [state.inquiries])
  const openTickets = useMemo(() => state.tickets.filter(t => !['resolved', 'closed'].includes(t.status)), [state.tickets])
  const today = new Date().toISOString().slice(0, 10)
  const completedToday = completedRepairs.filter(r => (r.completed_at || r.updated_at)?.slice(0, 10) === today)
  const dueSoon = openTasks.filter(t => t.due_date && t.due_date <= today).slice(0, 6)

  const cash = Number(state.finance?.actual_business_cash_position || 0)
  const received = Number(state.finance?.actual_money_received || 0)
  const charges = Number(state.finance?.repair_customer_charges || 0)
  const outstanding = Math.max(charges - received, 0)
  const parts = Number(state.finance?.part_costs || 0)
  const labor = Number(state.finance?.labor_costs || 0)
  const repairMargin = charges - parts - labor
  const expenses = Number(state.finance?.business_wide_expenses || 0)

  const attention = [
    ...attentionInquiries.map(i => ({ key: `inquiry-${i.id}`, icon: ClipboardCheck, title: `${i.status === 'new' ? 'New' : 'Qualified'} inquiry`, detail: `${i.name || 'Client'} · ${i.service || 'General enquiry'}` })),
    ...blockedTasks.map(t => ({ key: `task-${t.id}`, icon: AlertTriangle, title: 'Blocked task', detail: `${t.title}${t.projects?.title ? ` · ${t.projects.title}` : ''}` })),
    ...dueSoon.filter(t => t.status !== 'blocked').map(t => ({ key: `due-${t.id}`, icon: Clock3, title: 'Task due', detail: `${t.title}${t.projects?.title ? ` · ${t.projects.title}` : ''}` })),
    ...openTickets.map(t => ({ key: `ticket-${t.id}`, icon: AlertTriangle, title: `${t.priority === 'urgent' ? 'Urgent ' : ''}ticket`, detail: t.subject })),
  ].slice(0, 8)

  return <div>
    <div className="page-intro"><div><p className="eyebrow">COMMAND CENTER</p><h1>Today at Cypher Technologies</h1><p className="muted">A quick view of money, work in progress, completed work, and anything that needs attention.</p></div><div className="live"><Activity size={16}/> LIVE DATA</div></div>
    {state.errors.length > 0 && <div className="alert warning"><strong>Some live data could not be loaded.</strong> {state.errors[0]}</div>}

    <div className="metric-grid">
      <Metric icon={CircleDollarSign} label="Cash position" value={state.loading ? '—' : money(cash)} sub="Actual business cash after confirmed expenses" />
      <Metric icon={CircleDollarSign} label="Cash received" value={state.loading ? '—' : money(received)} sub={`${money(outstanding)} still outstanding`} />
      <Metric icon={Wrench} label="Repairs" value={state.loading ? '—' : `${activeRepairs.length} active`} sub={`${completedRepairs.length} completed · ${money(charges)} charged`} />
      <Metric icon={FolderKanban} label="Projects" value={state.loading ? '—' : `${activeProjects.length} active`} sub={`${completedProjects.length} completed`} />
    </div>

    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">ATTENTION</p><h3>What needs your attention</h3></div></div>{state.loading ? <div className="empty">Checking today's work…</div> : attention.length ? <div className="workflow">{attention.map(item => <div key={item.key}><span className="metric-icon"><item.icon size={16}/></span><p><strong>{item.title}</strong><small>{item.detail}</small></p></div>)}</div> : <div className="empty"><CheckCircle2 size={24}/><p>Nothing urgent is waiting right now.</p></div>}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">FINANCE SNAPSHOT</p><h3>Business position</h3></div></div>{state.loading ? <div className="empty">Loading finance…</div> : <div className="workflow"><div><span className="metric-icon"><CircleDollarSign size={16}/></span><p><strong>{money(cash)} actual cash</strong><small>Confirmed income minus confirmed expenses and deductions.</small></p></div><div><span className="metric-icon"><Wrench size={16}/></span><p><strong>{money(repairMargin)} repair margin on charges</strong><small>{money(charges)} charged − {money(parts)} parts − {money(labor)} labor cost.</small></p></div><div><span className="metric-icon"><CircleDollarSign size={16}/></span><p><strong>{money(expenses)} business expenses</strong><small>Includes the recorded repair part purchases and operating costs.</small></p></div></div>}</section>
    </div>

    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">REPAIRS</p><h3>Work happening now</h3></div></div>{state.loading ? <div className="empty">Loading repairs…</div> : activeRepairs.length ? <div className="table-wrap"><table><thead><tr><th>Device</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead><tbody>{activeRepairs.map(r => <tr key={r.id}><td><strong>{r.brand || ''} {r.model || 'Device'}</strong><small className="table-sub">{r.issue_reported || 'No issue recorded'}</small></td><td><span className="chip">{r.repair_status.replaceAll('_', ' ')}</span></td><td>{r.priority}</td><td>{dateOnly(r.expected_completion_date)}</td></tr>)}</tbody></table></div> : <div className="empty"><Wrench size={24}/><p>No repairs are currently underway.</p></div>}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">COMPLETED</p><h3>Recently finished</h3></div></div>{state.loading ? <div className="empty">Loading completed work…</div> : completedRepairs.length ? <div className="workflow">{completedRepairs.slice(0, 5).map(r => <div key={r.id}><span className="metric-icon"><CheckCircle2 size={16}/></span><p><strong>{r.brand || ''} {r.model || 'Repair'}</strong><small>{r.customers?.full_name || 'Customer'} · completed {dateTime(r.completed_at || r.updated_at)}</small></p></div>)}</div> : <div className="empty">No completed repairs yet.</div>}</section>
    </div>

    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">PROJECTS & TASKS</p><h3>Delivery pipeline</h3></div></div>{activeProjects.length ? <div className="workflow">{activeProjects.slice(0, 5).map(p => <div key={p.id}><span className="metric-icon"><FolderKanban size={16}/></span><p><strong>{p.title}</strong><small>{p.status.replaceAll('_', ' ')} · {p.end_date ? `due ${dateOnly(p.end_date)}` : 'no end date'}</small></p></div>)}</div> : <div className="empty"><FolderKanban size={24}/><p>No projects are currently active.</p></div>}<div className="muted" style={{marginTop:12}}><strong>{openTasks.length}</strong> open tasks · {blockedTasks.length} blocked</div></section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">TODAY</p><h3>Daily summary</h3></div></div><div className="workflow"><div><span>01</span><p><strong>{completedToday.length} repairs completed today</strong><small>Based on completion status and latest repair activity.</small></p></div><div><span>02</span><p><strong>{activeRepairs.length} active repairs</strong><small>Repairs not yet completed or cancelled.</small></p></div><div><span>03</span><p><strong>{activeProjects.length} active projects</strong><small>Planned, active, or on-hold project work.</small></p></div><div><span>04</span><p><strong>{openTasks.length} open tasks</strong><small>{blockedTasks.length} currently blocked.</small></p></div><div><span>05</span><p><strong>{attention.length} attention items</strong><small>New/qualified inquiries, due or blocked tasks, and open tickets.</small></p></div></div></section>
    </div>

    <section className="panel"><div className="panel-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Latest system activity</h3></div></div>{state.notifications.length ? <div className="workflow">{state.notifications.slice(0, 6).map(n => <div key={n.id}><span className="metric-icon"><Activity size={16}/></span><p><strong>{String(n.type || 'Notification').replaceAll('_', ' ')}</strong><small>{dateTime(n.created_at)}</small></p></div>)}</div> : <div className="empty">No recent notifications.</div>}</section>

    <p className="muted" style={{marginTop:14}}>Milestone bonuses or subscription bonuses are not treated as ordinary operating income; they belong to the project-success milestone flow and only become relevant after the qualifying work succeeds.</p>
  </div>
}

function Metric({ icon: Icon, label, value, sub }) { return <div className="metric"><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={16}/></span></div><strong>{value}</strong><small>{sub}</small></div> }
