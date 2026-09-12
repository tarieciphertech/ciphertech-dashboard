import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getFinanceRepairSettlementSummary, getRepairSettlementReporting, money, dateOnly } from '../lib/data'

const statusOrder=['REVIEW','UNPAID','PARTIALLY PAID','PAID','OVERPAID','COSTS INCOMPLETE','READY TO CLOSE','CLOSED']
const statusClass=status=>status==='CLOSED'?'success':status==='READY TO CLOSE'?'success':status==='REVIEW'||status==='OVERPAID'||status==='COSTS INCOMPLETE'?'warning':'neutral'

export default function RepairSettlementReport(){
 const[summary,setSummary]=useState(null)
 const[rows,setRows]=useState([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const[filter,setFilter]=useState('exceptions')

 const load=async()=>{
  setLoading(true);setError('')
  const[s,r]=await Promise.all([getFinanceRepairSettlementSummary(),getRepairSettlementReporting()])
  const errors=[...(s.errors||[]),...(r.errors||[])].filter(Boolean)
  setSummary(s.summary);setRows(r.rows||[]);if(errors.length)setError(errors.join(' • '));setLoading(false)
 }
 useEffect(()=>{load()},[])

 const visible=useMemo(()=>{
  const sorted=[...rows].sort((a,b)=>{
   const ai=statusOrder.indexOf(a.finance_settlement_bucket),bi=statusOrder.indexOf(b.finance_settlement_bucket)
   if(ai!==bi)return ai-bi
   return new Date(b.intake_date||0)-new Date(a.intake_date||0)
  })
  if(filter==='exceptions')return sorted.filter(x=>x.settlement_exception)
  if(filter==='ready')return sorted.filter(x=>x.settlement_status==='READY TO CLOSE')
  if(filter==='closed')return sorted.filter(x=>x.settlement_status==='CLOSED')
  return sorted
 },[rows,filter])

 const exceptionCount=Number(summary?.review_repairs||0)+Number(summary?.unpaid_repairs||0)+Number(summary?.partially_paid_repairs||0)+Number(summary?.overpaid_repairs||0)+Number(summary?.costs_incomplete_repairs||0)+Number(summary?.paid_repairs||0)
 return <section className="panel" style={{marginBottom:18}}>
  <div className="panel-head">
   <div><p className="eyebrow">REPAIR SETTLEMENT</p><h3>Settlement, outstanding balances and financial exceptions</h3><p className="muted">Finance view of every repair's payment state and financial closure. Technical completion does not automatically mean financial closure.</p></div>
   <button className="icon-btn" onClick={load} title="Refresh settlement report"><RefreshCw size={16}/></button>
  </div>
  {error&&<div className="alert danger">{error}</div>}
  <div className="metric-grid" style={{marginBottom:18}}>
   <div className="metric"><span>Ready to close</span><strong>{summary?.ready_to_close_repairs||0}</strong><small>Fully paid and reconciled</small></div>
   <div className="metric"><span>Closed</span><strong>{summary?.closed_repairs||0}</strong><small>Financially locked</small></div>
   <div className="metric"><span>Balance outstanding</span><strong>{money(summary?.balance_due)}</strong><small>Customer balances remaining</small></div>
   <div className="metric"><span>Review exceptions</span><strong>{summary?.review_repairs||0}</strong><small>Payment/cost reconciliation issues</small></div>
  </div>
  <div className="inquiry-tabs">
   {[['exceptions',`Exceptions (${exceptionCount})`],['ready',`Ready to close (${summary?.ready_to_close_repairs||0})`],['closed',`Closed (${summary?.closed_repairs||0})`],['all',`All repairs (${summary?.total_repairs||0})`]].map(([key,label])=><button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}
  </div>
  {loading?<div className="empty">Loading settlement report…</div>:visible.length?<div className="table-wrap"><table><thead><tr><th>Repair</th><th>Customer charge</th><th>Received</th><th>Balance</th><th>Direct cost</th><th>Profit</th><th>Settlement</th><th>Control</th></tr></thead><tbody>{visible.map(r=><tr key={r.repair_id}>
   <td><strong>{r.customer_name||'Walk-in'}</strong><br/><small>{[r.brand,r.model].filter(Boolean).join(' ')||'Device'} · {dateOnly(r.intake_date?.slice(0,10))}</small></td>
   <td>{money(r.customer_total)}<br/><small>Parts {money(r.parts_charged)} · Labor {money(r.labor_charged)}</small></td>
   <td>{money(r.actual_money_received)}<br/><small>{Number(r.pending_payment_amount||0)>0?`${money(r.pending_payment_amount)} pending`:'Confirmed'}</small></td>
   <td>{Number(r.overpayment_amount||0)>0?money(r.overpayment_amount):money(r.balance_due)}</td>
   <td>{money(r.total_direct_costs)}<br/><small>Parts {money(r.part_costs)} · Labor {money(r.labor_costs)}</small></td>
   <td><strong>{money(r.realized_profit)}</strong><br/><small>{Number(r.realized_margin_percent||0).toFixed(2)}%</small></td>
   <td><span className={`chip ${statusClass(r.settlement_status)}`}>{r.settlement_status}</span><br/><small>{r.settlement_note}</small></td>
   <td><span className={`chip ${statusClass(r.finance_settlement_bucket)}`}>{r.finance_settlement_bucket}</span>{r.settlement_exception&&<><br/><small>{r.payment_control_status!=='reconciled'?'Payment review':r.pending_repair_expenses?'Pending expense':r.voided_repair_expenses?'Voided expense':Math.abs(Number(r.unallocated_customer_charges||0))>0.01?'Charge mismatch':'Settlement exception'}</small></>}</td>
  </tr>)}</tbody></table></div>:<div className="empty">No repairs match this settlement view.</div>}
  <div className="workflow" style={{marginTop:16}}>
   <div><span>01</span><p><strong>Outstanding balance</strong><small>{money(summary?.balance_due)} remains due across open repair balances.</small></p></div>
   <div><span>02</span><p><strong>Ready to close</strong><small>{summary?.ready_to_close_repairs||0} repair(s) have completed payment and reconciliation requirements.</small></p></div>
   <div><span>03</span><p><strong>Financially closed</strong><small>{summary?.closed_repairs||0} repair(s) are locked against financial changes.</small></p></div>
   <div><span>04</span><p><strong>Profit tracked separately</strong><small>Realized repair profit remains distinct from the whole-business cash position.</small></p></div>
  </div>
 </section>
}
