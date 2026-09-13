import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CircleAlert, RefreshCw, WalletCards, Wrench, FolderKanban, ClipboardList } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getDashboardData, money, dateTime } from '../lib/data'

const label=value=>String(value||'').replaceAll('_',' ')
const greeting=()=>{const hour=new Date().getHours();return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'}

export default function Dashboard(){
 const[state,setState]=useState({overview:null,repairs:[],inquiries:[],activity:[],errors:[],loading:true})
 const load=async()=>{setState(x=>({...x,loading:true}));const data=await getDashboardData();setState({...data,loading:false})}
 useEffect(()=>{load()},[])
 const o=state.overview||{}
 const attention=useMemo(()=>[
  {label:'Customers still owe',value:o.repairs_with_balance??0,to:'/repairs',icon:WalletCards},
  {label:'Tasks still open',value:o.open_project_tasks??0,to:'/tasks',icon:ClipboardList},
  {label:'Projects in progress',value:o.active_projects??0,to:'/projects',icon:FolderKanban},
 ],[o])
 return <div className="workspace workspace-overview">
  <div className="page-intro"><div><p className="eyebrow">YOUR WORKDAY</p><h1>{greeting}, Tarie.</h1><p className="muted">Here’s what’s happening across CypherTech. Start with what needs your attention, then get into the work.</p></div><button className="icon-btn" onClick={load} title="Refresh overview" aria-label="Refresh overview"><RefreshCw size={16}/></button></div>
  {state.errors[0]&&<div className="alert warning"><CircleAlert size={15}/>{state.errors[0]}</div>}

  <section className="workspace-hero"><div><p className="eyebrow">TODAY AT A GLANCE</p><h3>Where the business stands</h3><p className="muted">Money received today, less recorded expenses and deductions.</p></div><div className="hero-value">{state.loading?'—':money(o.today_net_position)}</div><NavLink to="/finance" className="secondary">See the finances <ArrowUpRight size={14}/></NavLink></section>

  <section className="overview-metrics">
   <NavLink to="/finance" className="metric"><span>Money received</span><strong>{state.loading?'—':money(o.today_income)}</strong><small>Confirmed payments today</small></NavLink>
   <NavLink to="/finance" className="metric"><span>Business costs</span><strong>{state.loading?'—':money(o.today_expenses)}</strong><small>Recorded expenses today</small></NavLink>
   <NavLink to="/repairs" className="metric"><span>Repairs underway</span><strong>{state.loading?'—':o.active_repairs??0}</strong><small>Jobs currently being worked on</small></NavLink>
   <NavLink to="/projects" className="metric"><span>Projects in progress</span><strong>{state.loading?'—':o.active_projects??0}</strong><small>Delivery work currently moving</small></NavLink>
  </section>

  <section className="attention-strip"><div><p className="eyebrow">NEEDS YOUR ATTENTION</p><h3>What’s waiting for you</h3><p className="muted">Each number takes you straight to the work behind it.</p></div>{attention.map(x=>{const Icon=x.icon;return <NavLink key={x.label} to={x.to} className="attention-item"><span className="attention-copy"><span>{x.label}</span><strong>{state.loading?'—':x.value}</strong></span><Icon size={16}/><ArrowUpRight size={14}/></NavLink>})}</section>

  <section className="section-grid overview-work-grid">
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">REPAIR DESK</p><h3>Customers with a balance</h3><p className="muted">These repairs still have money outstanding.</p></div><NavLink to="/repairs" className="text-link">Go to repairs <ArrowUpRight size={14}/></NavLink></div>{state.repairs.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Device</th><th>Still due</th><th>Repair</th></tr></thead><tbody>{state.repairs.slice(0,6).map(r=><tr key={r.repair_id}><td><strong>{r.customer_name||'Customer'}</strong></td><td>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'}<small className="table-sub">{r.device_type||'—'}</small></td><td><strong>{money(r.amount_due)}</strong></td><td><span className="chip">{label(r.repair_status)}</span></td></tr>)}</tbody></table></div>:<div className="empty"><Wrench size={18}/><p>Nothing is waiting on a customer payment.</p></div>}</section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">WHAT’S HAPPENING</p><h3>Recent activity</h3><p className="muted">The latest things recorded in the workspace.</p></div><NavLink to="/notifications" className="text-link">See everything <ArrowUpRight size={14}/></NavLink></div>{state.activity.length?<div className="activity-list">{state.activity.slice(0,7).map(x=><div className="activity-item" key={x.id}><span/><div><strong>{label(x.type)}</strong><small>{dateTime(x.created_at)}</small></div></div>)}</div>:<div className="empty">Nothing new has been recorded yet.</div>}</section>
  </section>

  <section className="panel"><div className="panel-head"><div><p className="eyebrow">CLIENT WORK</p><h3>People waiting to hear from us</h3><p className="muted">New client requests that may need a response or next step.</p></div><NavLink to="/inquiries" className="text-link">Open client requests <ArrowUpRight size={14}/></NavLink></div>{state.inquiries.length?<div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Where it stands</th><th>Last update</th></tr></thead><tbody>{state.inquiries.map(x=><tr key={x.id}><td><strong>{x.name||x.email}</strong><small className="table-sub">{x.email||'—'}</small></td><td>{x.service||'General inquiry'}</td><td><span className="chip">{label(x.status)}</span></td><td>{dateTime(x.updated_at||x.created_at)}</td></tr>)}</tbody></table></div>:<div className="empty">No new client requests are waiting.</div>}</section>
  <div className="security-note"><WalletCards size={15}/> This page is your starting point. To make changes, open the relevant workspace.</div>
 </div>
}
