import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CircleAlert, RefreshCw, WalletCards, Wrench, FolderKanban, ClipboardList } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getDashboardData, money, dateTime } from '../lib/data'

const label=value=>String(value||'').replaceAll('_',' ')

export default function Dashboard(){
 const[state,setState]=useState({overview:null,repairs:[],inquiries:[],activity:[],errors:[],loading:true})
 const load=async()=>{setState(x=>({...x,loading:true}));const data=await getDashboardData();setState({...data,loading:false})}
 useEffect(()=>{load()},[])
 const o=state.overview||{}
 const attention=useMemo(()=>[
  {label:'Repairs needing payment',value:o.repairs_with_balance??0,to:'/repairs',icon:WalletCards},
  {label:'Open project tasks',value:o.open_project_tasks??0,to:'/tasks',icon:ClipboardList},
  {label:'Active projects',value:o.active_projects??0,to:'/projects',icon:FolderKanban},
 ],[o])
 return <div className="workspace workspace-overview">
  <div className="page-intro"><div><p className="eyebrow">COMMAND CENTER</p><h1>Overview</h1><p className="muted">Start here. Today’s position first, then the work that needs action.</p></div><button className="icon-btn" onClick={load} title="Refresh overview"><RefreshCw size={16}/></button></div>
  {state.errors[0]&&<div className="alert warning"><CircleAlert size={15}/>{state.errors[0]}</div>}

  <section className="workspace-hero"><div><p className="eyebrow">TODAY</p><h3>Business position</h3><p className="muted">Confirmed money received minus confirmed expenses and deductions.</p></div><div className="hero-value">{state.loading?'—':money(o.today_net_position)}</div><NavLink to="/finance" className="secondary">Open finance <ArrowUpRight size={14}/></NavLink></section>

  <section className="overview-metrics">
   <NavLink to="/finance" className="metric"><span>Revenue received</span><strong>{state.loading?'—':money(o.today_income)}</strong><small>Confirmed income today</small></NavLink>
   <NavLink to="/finance" className="metric"><span>Expenses</span><strong>{state.loading?'—':money(o.today_expenses)}</strong><small>Confirmed business costs today</small></NavLink>
   <NavLink to="/repairs" className="metric"><span>Active repairs</span><strong>{state.loading?'—':o.active_repairs??0}</strong><small>Technical jobs in progress</small></NavLink>
   <NavLink to="/projects" className="metric"><span>Active projects</span><strong>{state.loading?'—':o.active_projects??0}</strong><small>Delivery work in motion</small></NavLink>
  </section>

  <section className="attention-strip"><div><p className="eyebrow">ACTION QUEUE</p><h3>What needs attention</h3><p className="muted">Jump directly into the work behind each number.</p></div>{attention.map(x=>{const Icon=x.icon;return <NavLink key={x.label} to={x.to} className="attention-item"><span className="attention-copy"><span>{x.label}</span><strong>{state.loading?'—':x.value}</strong></span><Icon size={16}/><ArrowUpRight size={14}/></NavLink>})}</section>

  <section className="section-grid overview-work-grid">
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">REPAIR DESK</p><h3>Payment attention</h3><p className="muted">Repairs with an outstanding customer balance.</p></div><NavLink to="/repairs" className="text-link">Open desk <ArrowUpRight size={14}/></NavLink></div>{state.repairs.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Device</th><th>Due</th><th>Status</th></tr></thead><tbody>{state.repairs.slice(0,6).map(r=><tr key={r.repair_id}><td><strong>{r.customer_name||'Customer'}</strong></td><td>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'}<small className="table-sub">{r.device_type||'—'}</small></td><td><strong>{money(r.amount_due)}</strong></td><td><span className="chip">{label(r.repair_status)}</span></td></tr>)}</tbody></table></div>:<div className="empty"><Wrench size={18}/><p>No outstanding repair balances.</p></div>}</section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">WORKFLOW</p><h3>Recent activity</h3></div><NavLink to="/notifications" className="text-link">View all <ArrowUpRight size={14}/></NavLink></div>{state.activity.length?<div className="activity-list">{state.activity.slice(0,7).map(x=><div className="activity-item" key={x.id}><span/><div><strong>{label(x.type)}</strong><small>{dateTime(x.created_at)}</small></div></div>)}</div>:<div className="empty">No recent workflow activity.</div>}</section>
  </section>

  <section className="panel"><div className="panel-head"><div><p className="eyebrow">CLIENT WORK</p><h3>Incoming inquiries</h3><p className="muted">Client requests before they become delivery projects.</p></div><NavLink to="/inquiries" className="text-link">Open inquiries <ArrowUpRight size={14}/></NavLink></div>{state.inquiries.length?<div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Stage</th><th>Updated</th></tr></thead><tbody>{state.inquiries.map(x=><tr key={x.id}><td><strong>{x.name||x.email}</strong><small className="table-sub">{x.email||'—'}</small></td><td>{x.service||'General inquiry'}</td><td><span className="chip">{label(x.status)}</span></td><td>{dateTime(x.updated_at||x.created_at)}</td></tr>)}</tbody></table></div>:<div className="empty">No incoming client work.</div>}</section>
  <div className="security-note"><WalletCards size={15}/> Overview is intentionally read-only. Actions happen in the operational workspaces.</div>
 </div>
}
