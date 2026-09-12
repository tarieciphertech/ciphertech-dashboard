import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CircleAlert, RefreshCw, Wrench } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RepairsPage from './RepairsPage'

export default function RepairDeskWorkspace(){
 const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');const{data,error:e}=await supabase.from('repair_financial_control').select('repair_id,repair_status,settlement_status,customer_total,actual_money_received,balance_due').order('intake_date',{ascending:false});if(e)setError(e.message);else setRows(data||[]);setLoading(false)}
 useEffect(()=>{load()},[])
 const stats=useMemo(()=>({active:rows.filter(x=>!['completed','cancelled'].includes(x.repair_status)).length,due:rows.filter(x=>Number(x.balance_due||0)>0).length,ready:rows.filter(x=>x.settlement_status==='READY TO CLOSE').length,review:rows.filter(x=>['REVIEW','OVERPAID','COSTS INCOMPLETE'].includes(x.settlement_status)).length}),[rows])
 return <div className="workspace workspace-repairs">
  <div className="page-intro"><div><p className="eyebrow">REPAIR DESK</p><h1>Repairs</h1><p className="muted">Run technical work here. Financial settlement is handed to Finance when the job is complete.</p></div><button className="icon-btn" onClick={load} title="Refresh repair desk"><RefreshCw size={16}/></button></div>
  {error&&<div className="alert danger"><CircleAlert size={15}/>{error}</div>}
  <section className="workspace-grid workspace-grid-four"><div className="metric"><span>Active jobs</span><strong>{loading?'—':stats.active}</strong><small>Technical work not yet completed</small></div><div className="metric"><span>Balances due</span><strong>{loading?'—':stats.due}</strong><small>Customer payments still outstanding</small></div><NavLink to="/finance" className="metric"><span>Ready to close</span><strong>{loading?'—':stats.ready}</strong><small>Paid and reconciled repairs</small></NavLink><NavLink to="/finance" className="metric"><span>Review</span><strong>{loading?'—':stats.review}</strong><small>Settlement exceptions</small></NavLink></section>
  <section className="workspace-hero"><div><p className="eyebrow">REPAIR LIFECYCLE</p><h3>Intake → diagnose → repair → collect</h3><p className="muted">The desk owns customer intake, technical status, costing and payment capture. Finance owns reconciliation and financial closure.</p></div><NavLink to="/finance" className="secondary">Open settlement <ArrowUpRight size={14}/></NavLink></section>
  <RepairsPage/>
  <div className="security-note"><Wrench size={15}/> Financially closed repairs are locked by the database control layer.</div>
 </div>
}
