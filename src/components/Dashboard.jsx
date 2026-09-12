import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, RefreshCw, Wrench, WalletCards } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getDashboardData, money, dateTime } from '../lib/data'

export default function Dashboard() {
  const [state, setState] = useState({ overview: null, repairs: [], inquiries: [], activity: [], errors: [], loading: true })
  const load = async () => { setState(x => ({ ...x, loading: true })); const data = await getDashboardData(); setState({ ...data, loading: false }) }
  useEffect(() => { load() }, [])
  const o = state.overview || {}
  const metrics = [
    ['Today revenue', money(o.today_income), 'Confirmed income', '/finance'],
    ['Today expenses', money(o.today_expenses), 'Confirmed expenses', '/finance'],
    ['Net position', money(o.today_net_position), 'Income − expenses − deductions', '/finance'],
    ['Active repairs', o.active_repairs ?? '—', 'Repairs currently in progress', '/repairs'],
    ['Pending payments', o.repairs_with_balance ?? '—', 'Repairs with amount due', '/repairs'],
    ['Active projects', o.active_projects ?? '—', 'Planned / active delivery work', '/projects'],
    ['Open project tasks', o.open_project_tasks ?? '—', 'Tasks still requiring action', '/projects'],
    ['Deductions today', money(o.today_deductions), 'Owner, tax and bank deductions', '/finance'],
  ]
  return <div>
    <div className="page-intro"><div><p className="eyebrow">COMMAND CENTER</p><h1>Operations overview</h1><p className="muted">Live business position across repairs, customers, projects and finance.</p></div><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={16}/></button></div>
    {state.errors[0] && <div className="alert warning">{state.errors[0]}</div>}
    <div className="metric-grid">{metrics.map(([label,value,sub,to]) => <NavLink className="metric" to={to} key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon"><ArrowUpRight size={15}/></span></div><strong>{state.loading ? '—' : value}</strong><small>{sub}</small></NavLink>)}</div>
    <div className="section-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">REPAIRS</p><h3>Recent repair balances</h3></div><NavLink to="/repairs" className="text-link">Open repairs <ArrowUpRight size={14}/></NavLink></div>{state.repairs.length ? <div className="table-wrap"><table><thead><tr><th>Device</th><th>Status</th><th>Amount due</th><th>Updated</th></tr></thead><tbody>{state.repairs.map(r => <tr key={r.repair_id}><td><strong>{r.brand} {r.model}</strong><small className="table-sub">{r.device_type}</small></td><td><span className="chip">{r.repair_status}</span></td><td>{money(r.amount_due)}</td><td>{dateTime(r.updated_at)}</td></tr>)}</tbody></table></div> : <div className="empty"><Wrench size={18}/><p>No repair records yet.</p></div>}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">ACTIVITY</p><h3>Recent workflow</h3></div><NavLink to="/notifications" className="text-link">View all <ArrowUpRight size={14}/></NavLink></div>{state.activity.length ? <div className="activity-list">{state.activity.map(x => <div className="activity-item" key={x.id}><span/><div><strong>{x.type}</strong><small>{dateTime(x.created_at)}</small></div></div>)}</div> : <div className="empty">No recent activity.</div>}</section>
    </div>
    <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">INQUIRIES</p><h3>Latest incoming work</h3></div><NavLink to="/inquiries" className="text-link">View all <ArrowUpRight size={14}/></NavLink></div>{state.inquiries.length ? <div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Status</th><th>Updated</th></tr></thead><tbody>{state.inquiries.map(x => <tr key={x.id}><td>{x.name || x.email}</td><td>{x.service || 'General inquiry'}</td><td><span className="chip">{x.status}</span></td><td>{dateTime(x.updated_at || x.created_at)}</td></tr>)}</tbody></table></div> : <div className="empty">No inquiries yet.</div>}</section>
    <div className="security-note" style={{marginTop:14}}><WalletCards size={15}/> Financial cards are derived from the authoritative ledgers; the dashboard does not maintain mutable totals.</div>
  </div>
}
