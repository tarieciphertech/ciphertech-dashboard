import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CircleAlert, RefreshCw, WalletCards, Wrench } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getDashboardData, money, dateTime } from '../lib/data'

const statusLabel=value=>String(value||'').replaceAll('_',' ')

export default function Dashboard(){
 const[state,setState]=useState({overview:null,repairs:[],inquiries:[],activity:[],errors:[],loading:true})
 const load=async()=>{setState(x=>({...x,loading:true}));const data=await getDashboardData();setState({...data,loading:false})}
 useEffect(()=>{load()},[])
 const o=state.overview||{}
 const attention=useMemo(()=>[
  {label:'Payments due',value:o.repairs_with_balance??0,to:'/repairs',tone:Number(o.repairs_with_balance||0)>0?'warning':'success'},
  {label:'Open tasks',value:o.open_project_tasks??0,to:'/tasks',tone:Number(o.open_project_tasks||0)>0?'warning':'success'},
  {label:'Active projects',value:o.active_projects??0,to:'/projects',tone:'neutral'},
 ],[o])
 const finance=[
  ['Today revenue',money(o.today_income),'Confirmed income','/finance'],
  ['Today expenses',money(o.today_expenses),'Confirmed expenses','/finance'],
  ['Today net',money(o.today_net_position),'Income − expenses − deductions','/finance'],
 ]
 return <div className="workspace workspace-overview">
  <div className="page-intro"><div><p className="eyebrow">COMMAND CENTER</p><h1>Operations overview</h1><p className="muted">The few numbers and queues that need attention today.</p></div><button className="icon-btn" onClick={load} title="Refresh workspace"><RefreshCw size={16}/></button></div>
  {state.errors[0]&&<div className="alert warning"><CircleAlert size={15}/>{state.errors[0]}</div>}

  <section className="workspace-hero">
   <div><p className="eyebrow">TODAY</p><h3>Business position</h3><p className="muted">Confirmed ledger activity, separated from customer charges and repair profitability.</p></div>
   <div className="hero-value">{state.loading?'—':money(o.today_net_position)}</div>
   <NavLink to="/finance" className="secondary">Open finance <ArrowUpRight size={14}/></NavLink>
  </section>

  <section className="workspace-grid workspace-grid-finance">
   {finance.map(([label,value,sub,to])=><NavLink key={label} to={to} className="metric"><span>{label}</span><strong>{state.loading?'—':value}</strong><small>{sub}</small></NavLink>)}
  </section>

  <section className="attention-strip"><div><p className="eyebrow">WORK QUEUE</p><h3>What needs attention</h3></div>{attention.map(x=><NavLink key={x.label} to={x.to} className="attention-item"><span>{x.label}</span><strong>{state.loading?'—':x.value}</strong><ArrowUpRight size={14}/></NavLink>)}</section>

  <div className="section-grid">
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">REPAIR DESK</p><h3>Latest balances</h3></div><NavLink to="/repairs" className="text-link">Open repairs <ArrowUpRight size={14}/></NavLink></div>{state.repairs.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Device</th><th>Settlement</th><th>Due</th></tr></thead><tbody>{state.repairs.slice(0,6).map(r=><tr key={r.repair_id}><td><strong>{r.customer_name||'Customer'}</strong></td><td>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'}<small className="table-sub">{r.device_type||'—'}</small></td><td><span className="chip">{statusLabel(r.repair_status)}</span></td><td>{money(r.amount_due)}</td></tr>)}</tbody></table></div>:<div className="empty"><Wrench size={18}/><p>No repair balances yet.</p></div>}</section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">ACTIVITY</p><h3>Recent workflow</h3></div><NavLink to="/notifications" className="text-link">View all <ArrowUpRight size={14}/></NavLink></div>{state.activity.length?<div className="activity-list">{state.activity.slice(0,6).map(x=><div className="activity-item" key={x.id}><span/><div><strong>{statusLabel(x.type)}</strong><small>{dateTime(x.created_at)}</small></div></div>)}</div>:<div className="empty">No recent activity.</div>}</section>
  </div>

  <section className="panel"><div className="panel-head"><div><p className="eyebrow">CLIENT WORK</p><h3>Latest inquiries</h3><p className="muted">New work enters here before it becomes delivery work.</p></div><NavLink to="/inquiries" className="text-link">Open inquiries <ArrowUpRight size={14}/></NavLink></div>{state.inquiries.length?<div className="table-wrap"><table><thead><tr><th>Client</th><th>Service</th><th>Stage</th><th>Updated</th></tr></thead><tbody>{state.inquiries.map(x=><tr key={x.id}><td><strong>{x.name||x.email}</strong><small className="table-sub">{x.email||'—'}</small></td><td>{x.service||'General inquiry'}</td><td><span className="chip">{statusLabel(x.status)}</span></td><td>{dateTime(x.updated_at||x.created_at)}</td></tr>)}</tbody></table></div>:<div className="empty">No incoming client work.</div>}</section>

  <div className="security-note"><WalletCards size={15}/> Overview is read-only. Totals come from the authoritative finance and operational views.</div>
 </div>
}
