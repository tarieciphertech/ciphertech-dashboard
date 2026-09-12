import { useEffect, useState } from 'react'
import { BarChart3, Plus, RefreshCw, WalletCards, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFinanceSummary, getFinanceControlSummary, getRepairFinancialControl, money, dateTime, dateOnly } from '../lib/data'
import { useAuth } from '../auth/AuthProvider'
import RepairSettlementReport from './RepairSettlementReport'

const incomeCategories=['repair_payment','project_payment','service_income','product_sale','consulting','other']
const expenseCategories=['parts','equipment','transport','internet','hosting','software','rent','utilities','marketing','office','maintenance','other']
const deductionCategories=['owner_withdrawal','tax','bank_charges','other']
const methods=['cash','ecocash','bank_transfer','card','paypal','other']

const tabs=[['position','Position'],['settlement','Repair settlement'],['ledgers','Ledgers'],['monthly','Monthly']]

export default function FinancePage(){
 const{profile}=useAuth();const isAdmin=profile?.role==='admin'
 const[tab,setTab]=useState('position'),[ledger,setLedger]=useState('income')
 const[summary,setSummary]=useState({daily:[],monthly:[]}),[control,setControl]=useState(null),[repairs,setRepairs]=useState([]),[rows,setRows]=useState([])
 const[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[modal,setModal]=useState(false)
 const[form,setForm]=useState({amount:'',category:'repair_payment',description:'',payment_method:'cash',reference:'',status:'confirmed'})
 const load=async()=>{setLoading(true);setError('');const[s,c,r,led]=await Promise.all([getFinanceSummary(),getFinanceControlSummary(),getRepairFinancialControl(),supabase.from(ledger).select('*').order(ledger==='income'?'income_date':ledger==='expenses'?'expense_date':'deduction_date',{ascending:false}).limit(100)]);const errors=[...(s.errors||[]),...(c.errors||[]),...(r.errors||[]),led.error?.message].filter(Boolean);setSummary(s);setControl(c.summary);setRepairs(r.rows||[]);setRows(led.data||[]);if(errors.length)setError(errors.join(' • '));setLoading(false)}
 useEffect(()=>{load()},[ledger])
 const openTransaction=()=>{const cats=ledger==='income'?incomeCategories:ledger==='expenses'?expenseCategories:deductionCategories;setForm({amount:'',category:cats[0],description:'',payment_method:'cash',reference:'',status:'confirmed'});setError('');setMessage('');setModal(true)}
 const save=async e=>{e.preventDefault();if(!isAdmin)return;setLoading(true);const user=await supabase.auth.getUser();const payload={amount:Number(form.amount||0),category:form.category,description:form.description||null,payment_method:ledger==='income'?form.payment_method:null,reference:form.reference||null,status:form.status,recorded_by:user.data.user?.id};const{error:e2}=await supabase.from(ledger).insert(payload);if(e2)setError(e2.message);else{setMessage(`${ledger==='income'?'Income':ledger==='expenses'?'Expense':'Deduction'} recorded.`);setModal(false);await load()}setLoading(false)}
 const income=Number(control?.actual_money_received||0),expenses=Number(control?.business_wide_expenses||0)+Number(control?.repair_linked_expenses||0),deductions=Number(control?.deductions||0),cash=Number(control?.actual_business_cash_position||0),profit=Number(control?.repair_realized_profit||0)
 return <div className="workspace workspace-finance">
  <div className="page-intro"><div><p className="eyebrow">FINANCIAL CONTROL</p><h1>Finance</h1><p className="muted">A single place to answer four questions: what was charged, what was received, what did repairs cost, and where is the business financially?</p></div><div className="team-actions"><button className="icon-btn" onClick={load} title="Refresh finance"><RefreshCw size={16}/></button>{isAdmin&&<button className="primary" onClick={openTransaction}><Plus size={16}/> New transaction</button>}</div></div>
  {message&&<div className="alert success">{message}</div>}{error&&<div className="alert danger">{error}</div>}

  <section className="finance-hero"><div><p className="eyebrow">CURRENT BUSINESS POSITION</p><h3>Actual cash position</h3><p className="muted">Confirmed income minus confirmed expenses and deductions.</p></div><strong>{loading?'—':money(cash)}</strong><WalletCards size={28}/></section>
  <div className="workspace-grid workspace-grid-four"><div className="metric"><span>Money received</span><strong>{loading?'—':money(income)}</strong><small>All confirmed income</small></div><div className="metric"><span>Business + repair costs</span><strong>{loading?'—':money(expenses)}</strong><small>Confirmed expenses</small></div><div className="metric"><span>Deductions</span><strong>{loading?'—':money(deductions)}</strong><small>Owner, tax and bank deductions</small></div><div className="metric"><span>Repair realized profit</span><strong>{loading?'—':money(profit)}</strong><small>Repair revenue received − direct costs</small></div></div>

  <div className="workspace-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>

  {tab==='position'&&<>
   <section className="section-grid">
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">CASH FLOW</p><h3>Recent daily position</h3><p className="muted">Ledger-based business position, not repair profitability.</p></div></div>{summary.daily?.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Income</th><th>Expenses</th><th>Deductions</th><th>Net</th></tr></thead><tbody>{summary.daily.map(x=><tr key={x.transaction_date}><td>{dateOnly(x.transaction_date)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div>:<div className="empty">No confirmed financial activity yet.</div>}</section>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">CONTROL CHECK</p><h3>Is the financial data clean?</h3></div></div><div className="workflow"><div><span>01</span><p><strong>{Number(control?.payment_reconciliation_issues||0)===0?'Payments reconciled':'Payment review required'}</strong><small>{Number(control?.payment_reconciliation_issues||0)} payment reconciliation issue(s).</small></p></div><div><span>02</span><p><strong>{Number(control?.charge_reconciliation_items||0)===0?'Charges reconciled':'Charge review required'}</strong><small>{Number(control?.charge_reconciliation_items||0)} repair charge mismatch(es).</small></p></div><div><span>03</span><p><strong>Separate profit from cash</strong><small>Repair profit measures jobs; cash position measures the whole business.</small></p></div></div></section>
   </section>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">FINANCE PRINCIPLE</p><h3>One source of truth</h3><p className="muted">Customer charges are not revenue until money is confirmed. Direct repair costs belong to the repair. Business-wide expenses belong to the business ledger.</p></div><BarChart3 size={20}/></div></section>
  </>}

  {tab==='settlement'&&<RepairSettlementReport/>}

  {tab==='ledgers'&&<>
   <div className="inquiry-tabs">{[['income','Income'],['expenses','Expenses'],['deductions','Deductions']].map(([key,label])=><button key={key} className={ledger===key?'active':''} onClick={()=>setLedger(key)}>{label}</button>)}</div>
   <section className="panel"><div className="panel-head"><div><p className="eyebrow">{ledger.toUpperCase()} LEDGER</p><h3>{ledger==='income'?'Money recognized as received':ledger==='expenses'?'Confirmed business costs':'Owner, tax and bank deductions'}</h3></div></div>{rows.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{dateTime(r[ledger==='income'?'income_date':ledger==='expenses'?'expense_date':'deduction_date'])}</td><td><span className="chip">{r.category}</span></td><td>{r.description||'—'}</td><td><strong>{money(r.amount)}</strong></td><td>{r.status}</td><td>{r.reference||'—'}</td></tr>)}</tbody></table></div>:<div className="empty">No entries in this ledger yet.</div>}</section>
  </>}

  {tab==='monthly'&&<section className="panel"><div className="panel-head"><div><p className="eyebrow">MONTHLY POSITION</p><h3>Income, expenses, deductions and net position</h3></div></div>{summary.monthly?.length?<div className="table-wrap"><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Deductions</th><th>Net position</th></tr></thead><tbody>{summary.monthly.map(x=><tr key={x.month_start}><td>{dateOnly(x.month_start)}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div>:<div className="empty">No monthly financial activity yet.</div>}</section>}

  <div className="security-note"><WalletCards size={15}/> Financial totals are derived from authoritative ledgers and control views. The UI does not maintain mutable totals.</div>
  {modal&&<div className="modal-backdrop"><form className="modal-card" onSubmit={save}><div className="panel-head"><div><p className="eyebrow">NEW {ledger.toUpperCase()}</p><h3>Record transaction</h3></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{(ledger==='income'?incomeCategories:ledger==='expenses'?expenseCategories:deductionCategories).map(x=><option key={x}>{x}</option>)}</select></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label>{ledger==='income'&&<label>Payment method<select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}>{methods.map(x=><option key={x}>{x}</option>)}</select></label>}<label>Reference<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="confirmed">Confirmed</option><option value="voided">Voided</option></select></label><button className="primary full" disabled={loading}>Record transaction</button></form></div>}
 </div>
}
