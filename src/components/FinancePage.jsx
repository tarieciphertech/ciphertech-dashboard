import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFinanceSummary, getRepairProfitability, money, dateTime, dateOnly } from '../lib/data'
import { useAuth } from '../auth/AuthProvider'

const incomeCategories=['repair_payment','project_payment','service_income','product_sale','consulting','other']
const expenseCategories=['parts','equipment','transport','internet','hosting','software','rent','utilities','marketing','office','maintenance','other']
const deductionCategories=['owner_withdrawal','tax','bank_charges','other']
const methods=['cash','ecocash','bank_transfer','card','paypal','other']

export default function FinancePage(){
 const{profile}=useAuth()
 const[tab,setTab]=useState('income')
 const[rows,setRows]=useState([])
 const[summary,setSummary]=useState({daily:[],monthly:[]})
 const[profitability,setProfitability]=useState(null)
 const[repairs,setRepairs]=useState([])
 const[modal,setModal]=useState(false)
 const[form,setForm]=useState({amount:'',category:'repair_payment',description:'',payment_method:'cash',reference:'',status:'confirmed'})
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const[message,setMessage]=useState('')
 const isAdmin=profile?.role==='admin'

 const load=async()=>{
  setLoading(true);setError('')
  const[s,finance,p]=await Promise.all([
   getFinanceSummary(),
   supabase.from(tab).select('*').order(tab==='income'?'income_date':tab==='expenses'?'expense_date':'deduction_date',{ascending:false}).limit(100),
   getRepairProfitability(),
  ])
  const errors=[...(s.errors||[]),...(p.errors||[]),finance.error?.message].filter(Boolean)
  setSummary(s);setProfitability(null)
  if(errors.length)setError(errors.join(' • '))
  setRows(finance.data||[]);setRepairs(p.rows||[]);setLoading(false)
 }
 useEffect(()=>{load()},[tab])

 const config=tab==='income'?{title:'Income',cats:incomeCategories,date:'income_date',desc:'Money actually recognized as received.'}:tab==='expenses'?{title:'Expenses',cats:expenseCategories,date:'expense_date',desc:'Confirmed business costs.'}:{title:'Deductions',cats:deductionCategories,date:'deduction_date',desc:'Owner, tax and bank deductions.'}
 const totals=useMemo(()=>{
  const r=repairs.reduce((a,x)=>({revenue:a.revenue+Number(x.revenue_received||0),costs:a.costs+Number(x.parts_cost||0)+Number(x.labor_cost||0)+Number(x.other_direct_costs||0),profit:a.profit+Number(x.realized_profit||0)}),{revenue:0,costs:0,profit:0})
  return {...r,margin:r.revenue?((r.profit/r.revenue)*100):0}
 },[repairs])
 const latestDay=summary.daily?.[0]
 const open=()=>{setForm({amount:'',category:config.cats[0],description:'',payment_method:'cash',reference:'',status:'confirmed'});setMessage('');setError('');setModal(true)}
 const save=async e=>{
  e.preventDefault();if(!isAdmin)return
  setLoading(true)
  const payload={amount:Number(form.amount||0),category:form.category,description:form.description||null,payment_method:tab==='income'?form.payment_method:null,reference:form.reference||null,status:form.status,recorded_by:(await supabase.auth.getUser()).data.user?.id}
  const{error:e2}=await supabase.from(tab).insert(payload)
  if(e2)setError(e2.message);else{setMessage(`${config.title} transaction recorded.`);setModal(false);await load()}
  setLoading(false)
 }
 return <div>
  <div className="page-intro"><div><p className="eyebrow">FINANCIAL CONTROL</p><h1>Finance</h1><p className="muted">Track cash position and understand what each repair actually earns after its direct costs.</p></div><div className="team-actions"><button className="icon-btn" onClick={load}><RefreshCw size={16}/></button>{isAdmin&&<button className="primary" onClick={open}><Plus size={16}/> New transaction</button>}</div></div>
  {message&&<div className="alert success">{message}</div>}{error&&<div className="alert danger">{error}</div>}

  <div className="metric-grid">
   <div className="metric"><span>Total revenue received</span><strong>{money(profitability?.revenue_received??0)}</strong><small>All confirmed income</small></div>
   <div className="metric"><span>Repair direct costs</span><strong>{money(profitability?.repair_direct_costs??totals.costs)}</strong><small>Parts + labor + repair costs</small></div>
   <div className="metric"><span>Repair realized profit</span><strong>{money(profitability?.repair_realized_profit??totals.profit)}</strong><small>Revenue received − direct costs</small></div>
   <div className="metric"><span>Latest net position</span><strong>{money(latestDay?.net_position||0)}</strong><small>{latestDay?dateOnly(latestDay.transaction_date):'No confirmed activity'}</small></div>
  </div>

  <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><p className="eyebrow">REPAIR PROFITABILITY</p><h3>Revenue, direct costs and realized profit per repair</h3><p className="muted">Repair revenue comes from confirmed payments. Direct costs include parts cost, labor cost and confirmed repair-linked expenses.</p></div></div>
   {loading?<div className="empty">Loading profitability…</div>:repairs.length?<div className="table-wrap"><table><thead><tr><th>Repair</th><th>Status</th><th>Customer total</th><th>Revenue received</th><th>Direct costs</th><th>Profit</th><th>Margin</th></tr></thead><tbody>{repairs.map(r=>{const costs=Number(r.parts_cost||0)+Number(r.labor_cost||0)+Number(r.other_direct_costs||0);const paid=Number(r.revenue_received||0);const profit=Number(r.realized_profit||0);return <tr key={r.repair_id}><td><strong>{r.customer_name||'Walk-in'}</strong><br/><small>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'} · {dateOnly(r.intake_date?.slice(0,10))}</small></td><td><span className="chip">{r.repair_status}</span></td><td>{money(r.customer_total)}</td><td>{money(paid)}</td><td>{money(costs)}</td><td><strong>{paid?money(profit):'—'}</strong></td><td>{paid?`${Number(r.realized_margin_percent||0).toFixed(2)}%`:'—'}</td></tr>})}</tbody><tfoot><tr><th colSpan="3">Loaded repair totals</th><th>{money(totals.revenue)}</th><th>{money(totals.costs)}</th><th>{money(totals.profit)}</th><th>{totals.revenue?`${totals.margin.toFixed(2)}%`:'—'}</th></tr></tfoot></table></div>:<div className="empty">No repair profitability records yet.</div>}
  </section>

  <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><p className="eyebrow">BUSINESS POSITION</p><h3>Daily cash position</h3><p className="muted">This is the authoritative cash view: confirmed income − confirmed expenses − confirmed deductions.</p></div></div>{summary.daily?.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Revenue</th><th>Expenses</th><th>Deductions</th><th>Net position</th></tr></thead><tbody>{summary.daily.map(x=><tr key={x.transaction_date}><td>{dateOnly(x.transaction_date)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div>:<div className="empty">No confirmed financial activity yet.</div>}</section>

  <div className="inquiry-tabs">{[['income','Income'],['expenses','Expenses'],['deductions','Deductions']].map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}<strong>{tab===key?rows.length:'↗'}</strong></button>)}</div>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">{config.title.toUpperCase()} LEDGER</p><h3>{config.desc}</h3></div></div>{loading?<div className="empty">Loading ledger…</div>:rows.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{dateTime(r[config.date])}</td><td><span className="chip">{r.category}</span></td><td>{r.description||'—'}</td><td><strong>{money(r.amount)}</strong></td><td>{r.status}</td><td>{r.reference||'—'}</td></tr>)}</tbody></table></div>:<div className="empty">No transactions in this ledger yet.</div>}</section>

  <div className="section-grid" style={{marginTop:18}}><section className="panel"><div className="panel-head"><div><p className="eyebrow">MONTHLY</p><h3>Business position by month</h3></div></div><div className="table-wrap"><table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Deductions</th><th>Net</th></tr></thead><tbody>{summary.monthly?.map(x=><tr key={x.month_start}><td>{dateOnly(x.month_start)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel-head"><div><p className="eyebrow">CONTROL</p><h3>How Finance reads a repair</h3></div></div><div className="workflow"><div><span>01</span><p><strong>Quote is not revenue</strong><small>A P150 quotation remains expected income until a payment is confirmed.</small></p></div><div><span>02</span><p><strong>Direct cost is separated</strong><small>Part cost, labor cost and repair-linked transport/other costs are tracked against the repair.</small></p></div><div><span>03</span><p><strong>Two positions stay visible</strong><small>Repair profitability measures job performance; daily/monthly position measures the whole business cash ledger.</small></p></div></div></section></div>

  {modal&&<div className="modal-backdrop"><form className="modal-card" onSubmit={save}><div className="panel-head"><div><p className="eyebrow">NEW {config.title.toUpperCase()}</p><h3>Record transaction</h3></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{config.cats.map(x=><option key={x}>{x}</option>)}</select></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label>{tab==='income'&&<label>Payment method<select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}>{methods.map(x=><option key={x}>{x}</option>)}</select></label>}<label>Reference<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value)}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="confirmed">Confirmed</option><option value="voided">Voided</option></select></label><button className="primary full">Record transaction</button></form></div>}
 </div>
}
