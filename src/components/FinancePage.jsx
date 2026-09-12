import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFinanceSummary, getFinanceControlSummary, getRepairFinancialControl, money, dateTime, dateOnly } from '../lib/data'
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
 const[control,setControl]=useState(null)
 const[repairs,setRepairs]=useState([])
 const[modal,setModal]=useState(false)
 const[form,setForm]=useState({amount:'',category:'repair_payment',description:'',payment_method:'cash',reference:'',status:'confirmed'})
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const[message,setMessage]=useState('')
 const isAdmin=profile?.role==='admin'

 const load=async()=>{
  setLoading(true);setError('')
  const[s,finance,c,r]=await Promise.all([
   getFinanceSummary(),
   supabase.from(tab).select('*').order(tab==='income'?'income_date':tab==='expenses'?'expense_date':'deduction_date',{ascending:false}).limit(100),
   getFinanceControlSummary(),
   getRepairFinancialControl(),
  ])
  const errors=[...(s.errors||[]),...(c.errors||[]),...(r.errors||[]),finance.error?.message].filter(Boolean)
  setSummary(s);setControl(c.summary);setRepairs(r.rows||[])
  if(errors.length)setError(errors.join(' • '))
  setRows(finance.data||[]);setLoading(false)
 }
 useEffect(()=>{load()},[tab])

 const config=tab==='income'?{title:'Income',cats:incomeCategories,date:'income_date',desc:'Money actually recognized as received.'}:tab==='expenses'?{title:'Expenses',cats:expenseCategories,date:'expense_date',desc:'Confirmed business costs.'}:{title:'Deductions',cats:deductionCategories,date:'deduction_date',desc:'Owner, tax and bank deductions.'}
 const loadedTotals=useMemo(()=>repairs.reduce((a,x)=>({
  revenue:a.revenue+Number(x.actual_money_received||0),
  costs:a.costs+Number(x.total_direct_costs||0),
  profit:a.profit+Number(x.realized_profit||0),
 }),{revenue:0,costs:0,profit:0}),[repairs])
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
  <div className="page-intro"><div><p className="eyebrow">FINANCIAL CONTROL</p><h1>Finance</h1><p className="muted">Separate customer charges, money received, repair costs and whole-business cash so every figure can be reconciled.</p></div><div className="team-actions"><button className="icon-btn" onClick={load}><RefreshCw size={16}/></button>{isAdmin&&<button className="primary" onClick={open}><Plus size={16}/> New transaction</button>}</div></div>
  {message&&<div className="alert success">{message}</div>}{error&&<div className="alert danger">{error}</div>}

  <div className="metric-grid">
   <div className="metric"><span>Customer charges</span><strong>{money(control?.repair_customer_charges)}</strong><small>Repair totals / amounts owed</small></div>
   <div className="metric"><span>Actual money received</span><strong>{money(control?.actual_money_received)}</strong><small>All confirmed income</small></div>
   <div className="metric"><span>Part costs</span><strong>{money(control?.part_costs)}</strong><small>Internal repair cost basis</small></div>
   <div className="metric"><span>Labor costs</span><strong>{money(control?.labor_costs)}</strong><small>Internal labor cost basis</small></div>
   <div className="metric"><span>Repair-linked expenses</span><strong>{money(control?.repair_linked_expenses)}</strong><small>Transport / other repair costs</small></div>
   <div className="metric"><span>Repair realized profit</span><strong>{money(control?.repair_realized_profit)}</strong><small>Received revenue − direct costs</small></div>
   <div className="metric"><span>Business-wide expenses</span><strong>{money(control?.business_wide_expenses)}</strong><small>Confirmed expenses not tied to a repair</small></div>
   <div className="metric"><span>Actual cash position</span><strong>{money(control?.actual_business_cash_position)}</strong><small>Income − all expenses − deductions</small></div>
  </div>

  <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><p className="eyebrow">REPAIR FINANCIAL CONTROL</p><h3>Customer charges, cash received, direct costs and profit per repair</h3><p className="muted">Customer charges are not revenue until money is confirmed. Parts and labor use internal cost basis; repair-linked expenses are separate from business-wide expenses.</p></div></div>
   {loading?<div className="empty">Loading repair controls…</div>:repairs.length?<div className="table-wrap"><table><thead><tr><th>Repair</th><th>Customer charges</th><th>Received</th><th>Part costs</th><th>Labor costs</th><th>Repair expenses</th><th>Profit</th><th>Margin</th><th>Control</th></tr></thead><tbody>{repairs.map(r=>{const paid=Number(r.actual_money_received||0);const profit=Number(r.realized_profit||0);const variance=Number(r.payment_reconciliation_variance||0);const controlOk=r.payment_control_status==='reconciled'&&Math.abs(Number(r.unallocated_customer_charges||0))<=0.01;return <tr key={r.repair_id}><td><strong>{r.customer_name||'Walk-in'}</strong><br/><small>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'} · {dateOnly(r.intake_date?.slice(0,10))}</small><br/><span className="chip">{r.repair_status}</span></td><td>{money(r.customer_total)}<br/><small>Parts {money(r.parts_charged)} + labor {money(r.labor_charged)}{Math.abs(Number(r.unallocated_customer_charges||0))>0.01?` + other ${money(r.unallocated_customer_charges)}`:''}</small></td><td>{money(paid)}<br/><small>{Number(r.pending_payment_amount||0)>0?`${money(r.pending_payment_amount)} pending`:'No pending payment'}</small></td><td>{money(r.part_costs)}</td><td>{money(r.labor_costs)}</td><td>{money(r.repair_linked_expenses)}</td><td><strong>{paid?money(profit):'—'}</strong></td><td>{paid?`${Number(r.realized_margin_percent||0).toFixed(2)}%`:'—'}</td><td><span className="chip">{controlOk?'Reconciled':'Review'}</span>{Math.abs(variance)>0.01&&<small>Payment variance {money(variance)}</small>}</td></tr>})}</tbody><tfoot><tr><th>Loaded repair totals</th><th>{money(control?.repair_customer_charges??0)}</th><th>{money(loadedTotals.revenue)}</th><th>{money(control?.part_costs??0)}</th><th>{money(control?.labor_costs??0)}</th><th>{money(control?.repair_linked_expenses??0)}</th><th>{money(loadedTotals.profit)}</th><th>{loadedTotals.revenue?`${((loadedTotals.profit/loadedTotals.revenue)*100).toFixed(2)}%`:'—'}</th><th>{Number(control?.payment_reconciliation_issues||0)+Number(control?.charge_reconciliation_items||0)?'Review items':'Clean'}</th></tr></tfoot></table></div>:<div className="empty">No repair financial records yet.</div>}
   <div className="workflow" style={{marginTop:16}}><div><span>01</span><p><strong>Customer charge</strong><small>What the repair should earn: the repair's final customer total and its parts/labor components.</small></p></div><div><span>02</span><p><strong>Cash received</strong><small>Only confirmed repair payments create authoritative income. Pending payments remain outstanding.</small></p></div><div><span>03</span><p><strong>Direct repair cost</strong><small>Part cost + labor cost + confirmed expenses linked to this repair. These determine job profitability.</small></p></div><div><span>04</span><p><strong>Profit versus cash</strong><small>Repair profit measures the job. Business cash position includes every confirmed income, expense and deduction.</small></p></div></div>
  </section>

  <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><p className="eyebrow">BUSINESS-WIDE EXPENSES</p><h3>Costs outside individual repairs</h3><p className="muted">Confirmed expenses without a repair link reduce business cash but do not reduce the profitability of a specific repair.</p></div></div>{rows.length&&tab==='expenses'?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Scope</th></tr></thead><tbody>{rows.filter(x=>!x.repair_id).slice(0,100).map(r=><tr key={r.id}><td>{dateTime(r[config.date])}</td><td><span className="chip">{r.category}</span></td><td>{r.description||'—'}</td><td><strong>{money(r.amount)}</strong></td><td>{r.project_id?'Project':'Business-wide'}</td></tr>)}</tbody></table></div>:<div className="empty">Business-wide expense entries will appear here when recorded in the Expenses ledger.</div>}</section>

  <section className="panel" style={{marginBottom:18}}><div className="panel-head"><div><p className="eyebrow">BUSINESS POSITION</p><h3>Daily cash position</h3><p className="muted">Authoritative cash view: confirmed income − confirmed expenses − confirmed deductions. Repair profitability does not replace this ledger.</p></div></div>{summary.daily?.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Revenue</th><th>Expenses</th><th>Deductions</th><th>Net position</th></tr></thead><tbody>{summary.daily.map(x=><tr key={x.transaction_date}><td>{dateOnly(x.transaction_date)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div>:<div className="empty">No confirmed financial activity yet.</div>}</section>

  <div className="inquiry-tabs">{[['income','Income'],['expenses','Expenses'],['deductions','Deductions']].map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}<strong>{tab===key?rows.length:'↗'}</strong></button>)}</div>
  <section className="panel"><div className="panel-head"><div><p className="eyebrow">{config.title.toUpperCase()} LEDGER</p><h3>{config.desc}</h3></div></div>{loading?<div className="empty">Loading ledger…</div>:rows.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{dateTime(r[config.date])}</td><td><span className="chip">{r.category}</span></td><td>{r.description||'—'}</td><td><strong>{money(r.amount)}</strong></td><td>{r.status}</td><td>{r.reference||'—'}</td></tr>)}</tbody></table></div>:<div className="empty">No transactions in this ledger yet.</div>}</section>

  <div className="section-grid" style={{marginTop:18}}><section className="panel"><div className="panel-head"><div><p className="eyebrow">MONTHLY</p><h3>Business position by month</h3></div></div><div className="table-wrap"><table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Deductions</th><th>Net</th></tr></thead><tbody>{summary.monthly?.map(x=><tr key={x.month_start}><td>{dateOnly(x.month_start)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel-head"><div><p className="eyebrow">RECONCILIATION</p><h3>Finance control status</h3></div></div><div className="workflow"><div><span>01</span><p><strong>{Number(control?.payment_reconciliation_issues||0)===0?'Payments reconciled':'Payment review required'}</strong><small>{Number(control?.payment_reconciliation_issues||0)} payment reconciliation issue(s) detected between repair payment records and confirmed income.</small></p></div><div><span>02</span><p><strong>{Number(control?.charge_reconciliation_items||0)===0?'Charges reconciled':'Charge review required'}</strong><small>{Number(control?.charge_reconciliation_items||0)} repair(s) have customer charges that do not exactly equal their parts + labor components.</small></p></div><div><span>03</span><p><strong>Business cash is authoritative</strong><small>Cash position is calculated from the income, expenses and deductions ledgers, including business-wide and repair-linked expenses.</small></p></div></div></section></div>

  {modal&&<div className="modal-backdrop"><form className="modal-card" onSubmit={save}><div className="panel-head"><div><p className="eyebrow">NEW {config.title.toUpperCase()}</p><h3>Record transaction</h3></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{config.cats.map(x=><option key={x}>{x}</option>)}</select></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label>{tab==='income'&&<label>Payment method<select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}>{methods.map(x=><option key={x}>{x}</option>)}</select></label>}<label>Reference<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value)}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="confirmed">Confirmed</option><option value="voided">Voided</option></select></label><button className="primary full">Record transaction</button></form></div>}
 </div>
}
