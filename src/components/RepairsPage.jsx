import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { money, dateTime } from '../lib/data'

const STATUSES = ['received','diagnosing','awaiting_approval','awaiting_parts','in_repair','ready_for_collection','completed','cancelled']
const PRIORITIES = ['low','normal','high','urgent']
const METHODS = ['cash','ecocash','bank_transfer','card','paypal','other']
const DIRECT_COST_CATEGORIES = ['transport','other']
const WALK_IN = '__walk_in__'
const initial = { customer_id:'', assigned_to:'', device_type:'phone', brand:'', model:'', serial_number:'', imei:'', issue_reported:'', diagnosis:'', repair_status:'received', priority:'normal', expected_completion_date:'', quoted_amount:'0', total_amount:'0', notes:'' }
const customerInitial = { full_name:'', phone:'', email:'', address:'' }
const newPart = () => ({ part_name:'', description:'', quantity:'1', unit_cost:'0', unit_price:'0', supplier:'', reference:'', installed:false })
const newLabor = () => ({ technician_id:'', description:'', quantity:'1', unit_cost:'0', unit_price:'0', total_amount:'0' })
const newDirectCost = () => ({ category:'transport', description:'', amount:'0', payment_method:'cash', reference:'' })

const settlementClass = status => status === 'CLOSED' || status === 'READY TO CLOSE' ? 'chip success' : status === 'REVIEW' || status === 'COSTS INCOMPLETE' ? 'chip warning' : status === 'OVERPAID' ? 'chip danger' : 'chip'

export default function RepairsPage() {
  const [rows,setRows] = useState([]), [customers,setCustomers] = useState([]), [staff,setStaff] = useState([])
  const [loading,setLoading] = useState(true), [search,setSearch] = useState(''), [modal,setModal] = useState(false), [selected,setSelected] = useState(null)
  const [control,setControl] = useState(null), [isAdmin,setIsAdmin] = useState(false), [form,setForm] = useState(initial)
  const [customerMode,setCustomerMode] = useState('existing'), [newCustomer,setNewCustomer] = useState(customerInitial)
  const [parts,setParts] = useState([]), [labor,setLabor] = useState([]), [directCosts,setDirectCosts] = useState([]), [payments,setPayments] = useState([])
  const [payment,setPayment] = useState({ amount:'', payment_method:'cash', reference:'', notes:'' })
  const [error,setError] = useState(''), [message,setMessage] = useState(''), [saving,setSaving] = useState(false), [partsLoading,setPartsLoading] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    const [rep,cus,st,user] = await Promise.all([
      supabase.from('repair_financial_control').select('*').order('intake_date',{ascending:false}),
      supabase.from('customers').select('id,full_name,phone,email,profile_id').order('full_name'),
      supabase.from('profiles').select('id,full_name,role').in('role',['staff','admin']).order('full_name'),
      supabase.auth.getUser(),
    ])
    if (rep.error) setError(rep.error.message); else setRows(rep.data || [])
    if (cus.error) setError(x => x || cus.error.message); else setCustomers(cus.data || [])
    if (st.error) setError(x => x || st.error.message); else setStaff(st.data || [])
    if (user.data?.user?.id) {
      const profile = await supabase.from('profiles').select('role').eq('id',user.data.user.id).maybeSingle()
      setIsAdmin(profile.data?.role === 'admin')
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(r => !q || `${r.customer_name} ${r.brand} ${r.model} ${r.repair_status} ${r.priority} ${r.settlement_status}`.toLowerCase().includes(q))
  }, [rows,search])

  const partsCost = useMemo(() => parts.reduce((n,p) => n + (Number(p.quantity)||0)*(Number(p.unit_cost)||0),0),[parts])
  const partsCharged = useMemo(() => parts.reduce((n,p) => n + (Number(p.quantity)||0)*(Number(p.unit_price)||0),0),[parts])
  const laborCost = useMemo(() => labor.reduce((n,l) => n + (Number(l.quantity)||0)*(Number(l.unit_cost)||0),0),[labor])
  const laborCharged = useMemo(() => labor.reduce((n,l) => n + (Number(l.quantity)||0)*(Number(l.unit_price)||0),0),[labor])
  const directCostTotal = useMemo(() => directCosts.reduce((n,c) => n + (Number(c.amount)||0),0),[directCosts])
  const calculatedTotal = partsCharged + laborCharged
  const totalKnownCost = partsCost + laborCost + directCostTotal
  const projectedProfit = Number(form.total_amount||0) - totalKnownCost
  const confirmedRevenue = useMemo(() => payments.filter(p => p.payment_status === 'confirmed').reduce((n,p) => n + Number(p.amount||0),0),[payments])
  const pendingPayments = useMemo(() => payments.filter(p => p.payment_status === 'pending').reduce((n,p) => n + Number(p.amount||0),0),[payments])
  const balanceDue = Math.max(Number(form.total_amount||0) - confirmedRevenue,0)
  const overpayment = Math.max(confirmedRevenue - Number(form.total_amount||0),0)
  const realizedProfit = confirmedRevenue - totalKnownCost

  const openCreate = () => {
    setSelected(null); setControl(null); setForm(initial); setCustomerMode('existing'); setNewCustomer(customerInitial)
    setParts([]); setLabor([]); setDirectCosts([]); setPayments([]); setPayment({amount:'',payment_method:'cash',reference:'',notes:''})
    setError(''); setMessage(''); setModal(true)
  }

  const loadComponents = async repairId => {
    setPartsLoading(true)
    const [p,l,e,pm,fc] = await Promise.all([
      supabase.from('repair_parts').select('*').eq('repair_id',repairId).order('created_at'),
      supabase.from('repair_labor').select('*').eq('repair_id',repairId).order('created_at'),
      supabase.from('expenses').select('*').eq('repair_id',repairId).order('expense_date'),
      supabase.from('repair_payments').select('*').eq('repair_id',repairId).order('created_at',{ascending:false}),
      supabase.from('repair_financial_control').select('*').eq('repair_id',repairId).single(),
    ])
    if (p.error) setError(p.error.message); else setParts(p.data || [])
    if (l.error) setError(x => x || l.error.message); else setLabor(l.data || [])
    if (e.error) setError(x => x || e.error.message); else setDirectCosts(e.data || [])
    if (pm.error) setError(x => x || pm.error.message); else setPayments(pm.data || [])
    if (fc.error) setError(x => x || fc.error.message); else setControl(fc.data || null)
    setPartsLoading(false)
  }

  const openEdit = async row => {
    const {data,error:e} = await supabase.from('repairs').select('*').eq('id',row.repair_id).single()
    if (e) return setError(e.message)
    setSelected(data)
    setForm({...initial,...data,quoted_amount:String(data.quoted_amount??0),total_amount:String(data.total_amount??0),expected_completion_date:data.expected_completion_date||''})
    setCustomerMode('existing'); setNewCustomer(customerInitial); setPayment({amount:'',payment_method:'cash',reference:'',notes:''})
    setError(''); setMessage(''); setModal(true); await loadComponents(data.id)
  }

  const updatePart = (i,key,value) => setParts(a => a.map((p,n) => n===i ? {...p,[key]:value} : p))
  const updateLabor = (i,key,value) => setLabor(a => a.map((l,n) => { if(n!==i) return l; const x={...l,[key]:value}; if(key==='quantity'||key==='unit_price') x.total_amount=(Number(x.quantity)||0)*(Number(x.unit_price)||0); return x }))
  const updateCost = (i,key,value) => setDirectCosts(a => a.map((c,n) => n===i ? {...c,[key]:value} : c))

  const saveComponents = async repairId => {
    setPartsLoading(true); setError('')
    const {error:de} = await supabase.from('repair_parts').delete().eq('repair_id',repairId)
    if (de) { setPartsLoading(false); return de.message }
    const partPayload = parts.filter(p => String(p.part_name||'').trim()).map(p => ({repair_id:repairId,part_name:p.part_name.trim(),description:p.description?.trim()||null,quantity:Number(p.quantity)||1,unit_cost:Number(p.unit_cost)||0,unit_price:Number(p.unit_price)||0,supplier:p.supplier?.trim()||null,reference:p.reference?.trim()||null,installed:!!p.installed}))
    if (partPayload.length) { const {error:e}=await supabase.from('repair_parts').insert(partPayload); if(e){setPartsLoading(false);return e.message} }
    const {error:dl} = await supabase.from('repair_labor').delete().eq('repair_id',repairId)
    if (dl) { setPartsLoading(false); return dl.message }
    const laborPayload = labor.filter(l => String(l.description||'').trim()).map(l => ({repair_id:repairId,technician_id:l.technician_id||null,description:l.description.trim(),quantity:Number(l.quantity)||1,unit_cost:Number(l.unit_cost)||0,unit_price:Number(l.unit_price)||0,total_amount:(Number(l.quantity)||0)*(Number(l.unit_price)||0)}))
    if (laborPayload.length) { const {error:e}=await supabase.from('repair_labor').insert(laborPayload); if(e){setPartsLoading(false);return e.message} }
    const unsavedCosts = directCosts.filter(c => !c.id && String(c.description||'').trim() && Number(c.amount)>0)
    if (unsavedCosts.length) { const {error:e}=await supabase.from('expenses').insert(unsavedCosts.map(c=>({repair_id:repairId,amount:Number(c.amount),expense_date:new Date().toISOString(),category:c.category,description:c.description.trim(),payment_method:c.payment_method||null,reference:c.reference?.trim()||null,status:'confirmed'}))); if(e){setPartsLoading(false);return e.message} }
    setPartsLoading(false); return null
  }

  const save = async e => {
    e.preventDefault()
    if (selected && control?.financially_closed_at) return setError('This repair is financially closed and cannot be modified.')
    setSaving(true); setError(''); setMessage('')
    let customerId=form.customer_id
    if (!selected && customerMode==='walk_in') {
      if (!newCustomer.full_name.trim() || !newCustomer.phone.trim()) { setSaving(false); return setError('Walk-in customer name and phone number are required.') }
      const created=await supabase.from('customers').insert({full_name:newCustomer.full_name.trim(),phone:newCustomer.phone.trim(),email:newCustomer.email.trim()||null,address:newCustomer.address.trim()||null,profile_id:null}).select('id,full_name,phone,email,profile_id').single()
      if(created.error){setSaving(false);return setError(created.error.message)}
      customerId=created.data.id; setCustomers(prev=>[...prev,created.data].sort((a,b)=>(a.full_name||'').localeCompare(b.full_name||'')))
    }
    if(!customerId){setSaving(false);return setError('Select an existing customer or create a walk-in customer.')}
    const payload={...form,customer_id:customerId,quoted_amount:Number(form.quoted_amount||0),total_amount:Number(form.total_amount||0),expected_completion_date:form.expected_completion_date||null,assigned_to:form.assigned_to||null,serial_number:form.serial_number||null,imei:form.imei||null,diagnosis:form.diagnosis||null,notes:form.notes||null}
    const result=selected?await supabase.from('repairs').update(payload).eq('id',selected.id).select().single():await supabase.from('repairs').insert(payload).select().single()
    if(result.error){setSaving(false);return setError(result.error.message)}
    const componentError=await saveComponents(result.data.id)
    if(componentError){setSaving(false);return setError(componentError)}
    setMessage(selected?'Repair and profitability costing saved.':'Repair, customer intake and profitability costing saved.')
    setSelected(result.data); setForm({...initial,...result.data,quoted_amount:String(result.data.quoted_amount),total_amount:String(result.data.total_amount),expected_completion_date:result.data.expected_completion_date||''}); setCustomerMode('existing')
    await loadComponents(result.data.id); await load(); setSaving(false)
  }

  const useCalculatedTotal = () => setForm({...form,total_amount:calculatedTotal.toFixed(2)})

  const addPayment = async () => {
    if(!selected || Number(payment.amount)<=0) return setError('Enter a payment amount greater than zero.')
    if(control?.financially_closed_at) return setError('This repair is financially closed and cannot receive payments.')
    setSaving(true); setError('')
    const user=await supabase.auth.getUser()
    const {data,error:e}=await supabase.from('repair_payments').insert({repair_id:selected.id,amount:Number(payment.amount),payment_method:payment.payment_method,reference:payment.reference||null,notes:payment.notes||null,received_by:user.data.user?.id}).select().single()
    if(e) setError(e.message); else { setMessage('Payment recorded as pending. Confirm it when funds are verified.'); setPayment({amount:'',payment_method:'cash',reference:'',notes:''}); setPayments(p=>[data,...p]) }
    await loadComponents(selected.id); await load(); setSaving(false)
  }

  const confirmPayment = async p => {
    if(control?.financially_closed_at) return setError('This repair is financially closed.')
    setSaving(true); setError('')
    const {error:e}=await supabase.from('repair_payments').update({payment_status:'confirmed'}).eq('id',p.id).eq('payment_status','pending')
    if(e) setError(e.message); else setMessage('Payment confirmed and linked to the income ledger.')
    await loadComponents(selected.id); await load(); setSaving(false)
  }

  const closeFinancially = async () => {
    if(!selected || !isAdmin) return setError('Only an admin can financially close a repair.')
    setSaving(true); setError('')
    const {data,error:e}=await supabase.rpc('close_repair_financially',{p_repair_id:selected.id})
    if(e) setError(e.message); else { setControl(data); setMessage('Repair financially closed. Its financial records are now locked.'); await load() }
    setSaving(false)
  }

  const status = control?.settlement_status || 'UNPAID'
  const financiallyClosed = !!control?.financially_closed_at
  const canClose = isAdmin && control?.settlement_status === 'READY TO CLOSE'

  return <div>
    <div className="page-intro"><div><p className="eyebrow">REPAIR OPERATIONS</p><h1>Repairs</h1><p className="muted">Customer intake, diagnosis, assignments, costing, payments and financial settlement.</p></div><div className="team-actions"><button className="icon-btn" onClick={load}><RefreshCw size={16}/></button><button className="primary" onClick={openCreate}><Plus size={16}/> New repair</button></div></div>
    {message&&<div className="alert success">{message}</div>}{error&&<div className="alert danger">{error}</div>}

    <section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE REPAIRS</p><h3>{loading?'Loading…':`${filtered.length} repair${filtered.length===1?'':'s'}`}</h3></div><div className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search repairs"/></div></div>{filtered.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Device</th><th>Technical status</th><th>Settlement</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>{filtered.map(r=><tr key={r.repair_id} className="clickable-row" onClick={()=>openEdit(r)}><td>{r.customer_name||'Customer'}</td><td><strong>{r.brand} {r.model}</strong><small className="table-sub">{r.device_type||'Device'}</small></td><td><span className="chip">{r.repair_status}</span></td><td><span className={settlementClass(r.settlement_status)}>{r.settlement_status}</span></td><td>{money(r.customer_total)}</td><td>{money(r.actual_money_received)}</td><td>{money(r.balance_due)}</td></tr>)}</tbody></table></div>:<div className="empty">No repairs found.</div>}</section>

    {modal&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><div className="modal-card" style={{width:'min(1000px,100%)',maxHeight:'92vh',overflow:'auto'}}>
      <div className="panel-head"><div><p className="eyebrow">{selected?'REPAIR RECORD':'NEW REPAIR'}</p><h3>{selected?`${selected.brand} ${selected.model}`:'Create repair intake'}</h3>{selected&&<span className={settlementClass(status)}>{status}</span>}</div><button className="icon-btn" onClick={()=>setModal(false)}><X size={18}/></button></div>
      {selected&&<div className="detail-card" style={{marginBottom:18}}><p className="eyebrow">SETTLEMENT CONTROL</p><div className="detail-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}><div><small>Customer charge</small><strong>{money(control?.customer_total)}</strong></div><div><small>Money received</small><strong>{money(control?.actual_money_received)}</strong></div><div><small>Balance due</small><strong>{money(control?.balance_due)}</strong></div><div><small>Pending payments</small><strong>{money(control?.pending_payment_amount)}</strong></div></div><div className="detail-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:12}}><div><small>Part cost</small><strong>{money(control?.part_costs)}</strong></div><div><small>Labor cost</small><strong>{money(control?.labor_costs)}</strong></div><div><small>Repair expenses</small><strong>{money(control?.repair_linked_expenses)}</strong></div><div><small>Direct cost</small><strong>{money(control?.total_direct_costs)}</strong></div></div><div className="detail-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:12}}><div><small>Realized profit</small><strong>{money(control?.realized_profit)}</strong></div><div><small>Realized margin</small><strong>{control?.actual_money_received?`${Number(control.realized_margin_percent||0).toFixed(2)}%`:'—'}</strong></div><div><small>Payment reconciliation</small><strong>{control?.payment_control_status==='reconciled'?'Reconciled':'Review required'}</strong></div></div><p className="muted" style={{marginTop:12}}>Financial lifecycle: quotation → customer charge → payment(s) → confirmed revenue → costs → realized profit → balance → settlement.</p>{financiallyClosed&&<div className="alert success" style={{marginTop:12}}>Financially closed {dateTime(control.financially_closed_at)}. Financial records are locked.</div>}{control?.payment_control_status==='needs_review'&&<div className="alert danger" style={{marginTop:12}}>Payment/income reconciliation needs review. Confirmed payment records and income must match before closure.</div>}{control?.costs_complete===false&&<div className="alert danger" style={{marginTop:12}}>Repair costs are incomplete: review pending or voided repair-linked expenses before closure.</div>}</div>}

      <form onSubmit={save}><fieldset disabled={financiallyClosed} style={{border:0,padding:0,margin:0}}><div className="detail-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
        <label>Customer<select value={customerMode==='walk_in'?WALK_IN:form.customer_id} onChange={e=>{const v=e.target.value;if(v===WALK_IN){setCustomerMode('walk_in');setForm({...form,customer_id:''})}else{setCustomerMode('existing');setForm({...form,customer_id:v})}}} required><option value="">Select customer…</option>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name||c.phone||'Unnamed'}{c.phone?` — ${c.phone}`:''}</option>)}{!selected&&<option value={WALK_IN}>+ New walk-in customer</option>}</select></label>
        <label>Assigned technician<select value={form.assigned_to||''} onChange={e=>setForm({...form,assigned_to:e.target.value||null})}><option value="">Unassigned</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name||s.role}</option>)}</select></label>
        {customerMode==='walk_in'&&!selected&&<><label>Customer name<input value={newCustomer.full_name} onChange={e=>setNewCustomer({...newCustomer,full_name:e.target.value})} required/></label><label>Phone number<input value={newCustomer.phone} onChange={e=>setNewCustomer({...newCustomer,phone:e.target.value})} required/></label><label>Email<input type="email" value={newCustomer.email} onChange={e=>setNewCustomer({...newCustomer,email:e.target.value})}/></label><label>Address<input value={newCustomer.address} onChange={e=>setNewCustomer({...newCustomer,address:e.target.value})}/></label></>}
        <label>Device type<input value={form.device_type} onChange={e=>setForm({...form,device_type:e.target.value})} required/></label><label>Brand<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} required/></label><label>Model<input value={form.model} onChange={e=>setForm({...form,model:e.target.value})} required/></label><label>Serial number<input value={form.serial_number||''} onChange={e=>setForm({...form,serial_number:e.target.value})}/></label><label>IMEI<input value={form.imei||''} onChange={e=>setForm({...form,imei:e.target.value})}/></label><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{PRIORITIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select value={form.repair_status} onChange={e=>setForm({...form,repair_status:e.target.value})}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label><label>Expected completion<input type="date" value={form.expected_completion_date||''} onChange={e=>setForm({...form,expected_completion_date:e.target.value})}/></label><label>Quoted amount<input type="number" min="0" step="0.01" value={form.quoted_amount} onChange={e=>setForm({...form,quoted_amount:e.target.value})}/></label><label>Final customer total<input type="number" min="0" step="0.01" value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})}/></label>
      </div><label>Issue reported<textarea value={form.issue_reported} onChange={e=>setForm({...form,issue_reported:e.target.value})} required/></label><label>Diagnosis<textarea value={form.diagnosis||''} onChange={e=>setForm({...form,diagnosis:e.target.value})}/></label>

      <div className="detail-card" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">REPAIR PARTS</p><h3>Parts costing</h3><p className="muted">Cost price is what CypherTech pays. Customer price is what the customer is charged.</p></div><button type="button" className="primary" onClick={()=>setParts(a=>[...a,newPart()])}><Plus size={15}/> Add part</button></div>{parts.map((p,i)=><div key={p.id||i} className="detail-card" style={{marginTop:10}}><div className="detail-grid" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}><label>Part name<input value={p.part_name} onChange={e=>updatePart(i,'part_name',e.target.value)} placeholder="e.g. Samsung A54 screen"/></label><label>Qty<input type="number" min="0.001" step="0.001" value={p.quantity} onChange={e=>updatePart(i,'quantity',e.target.value)}/></label><label>Cost price<input type="number" min="0" step="0.01" value={p.unit_cost} onChange={e=>updatePart(i,'unit_cost',e.target.value)}/></label><label>Customer price<input type="number" min="0" step="0.01" value={p.unit_price} onChange={e=>updatePart(i,'unit_price',e.target.value)}/></label><label>Supplier<input value={p.supplier||''} onChange={e=>updatePart(i,'supplier',e.target.value)}/></label><label>Reference<input value={p.reference||''} onChange={e=>updatePart(i,'reference',e.target.value)}/></label><label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={!!p.installed} onChange={e=>updatePart(i,'installed',e.target.checked)}/> Installed</label><button type="button" className="icon-btn" onClick={()=>setParts(a=>a.filter((_,n)=>n!==i))} title="Remove part"><Trash2 size={16}/></button></div><label>Description<textarea value={p.description||''} onChange={e=>updatePart(i,'description',e.target.value)} placeholder="Optional part notes"/></label></div>)}{!parts.length&&<div className="empty">No parts added yet.</div>}<div className="detail-grid" style={{gridTemplateColumns:'1fr 1fr 1fr',marginTop:12}}><div><small>Parts cost</small><strong>{money(partsCost)}</strong></div><div><small>Parts charged</small><strong>{money(partsCharged)}</strong></div><div><small>Parts margin</small><strong>{money(partsCharged-partsCost)}</strong></div></div></div>

      <div className="detail-card" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">REPAIR LABOR</p><h3>Labor costing</h3><p className="muted">Separate internal labor cost from the customer price.</p></div><button type="button" className="primary" onClick={()=>setLabor(a=>[...a,newLabor()])}><Plus size={15}/> Add labor</button></div>{labor.map((l,i)=><div key={l.id||i} className="detail-card" style={{marginTop:10}}><div className="detail-grid" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr 1fr'}}><label>Description<input value={l.description} onChange={e=>updateLabor(i,'description',e.target.value)} placeholder="e.g. Screen replacement"/></label><label>Technician<select value={l.technician_id||''} onChange={e=>updateLabor(i,'technician_id',e.target.value)}><option value="">Unassigned</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name||s.role}</option>)}</select></label><label>Qty<input type="number" min="0.001" step="0.001" value={l.quantity} onChange={e=>updateLabor(i,'quantity',e.target.value)}/></label><label>Cost price<input type="number" min="0" step="0.01" value={l.unit_cost} onChange={e=>updateLabor(i,'unit_cost',e.target.value)}/></label><label>Customer price<input type="number" min="0" step="0.01" value={l.unit_price} onChange={e=>updateLabor(i,'unit_price',e.target.value)}/></label></div><button type="button" className="icon-btn" onClick={()=>setLabor(a=>a.filter((_,n)=>n!==i))} title="Remove labor"><Trash2 size={16}/></button></div>)}{!labor.length&&<div className="empty">No labor added yet.</div>}<div className="detail-grid" style={{gridTemplateColumns:'1fr 1fr 1fr',marginTop:12}}><div><small>Labor cost</small><strong>{money(laborCost)}</strong></div><div><small>Labor charged</small><strong>{money(laborCharged)}</strong></div><div><small>Labor margin</small><strong>{money(laborCharged-laborCost)}</strong></div></div></div>

      <div className="detail-card" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">REPAIR-LINKED EXPENSES</p><h3>Transport and other direct costs</h3><p className="muted">Use this for real costs attached to the job, such as a trip to Gaborone to source a part.</p></div><button type="button" className="primary" onClick={()=>setDirectCosts(a=>[...a,newDirectCost()])}><Plus size={15}/> Add cost</button></div>{directCosts.map((c,i)=><div key={c.id||i} className="detail-card" style={{marginTop:10}}><div className="detail-grid" style={{gridTemplateColumns:'1fr 2fr 1fr 1fr'}}><label>Category<select value={c.category} disabled={!!c.id} onChange={e=>updateCost(i,'category',e.target.value)}>{DIRECT_COST_CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Description<input value={c.description||''} disabled={!!c.id} onChange={e=>updateCost(i,'description',e.target.value)} placeholder="e.g. Taxi to Gaborone supplier"/></label><label>Amount<input type="number" min="0.01" step="0.01" value={c.amount} disabled={!!c.id} onChange={e=>updateCost(i,'amount',e.target.value)}/></label><label>Payment method<select value={c.payment_method||'cash'} disabled={!!c.id} onChange={e=>updateCost(i,'payment_method',e.target.value)}>{METHODS.map(x=><option key={x}>{x}</option>)}</select></label></div>{c.id?<small className="muted">Recorded in Finance · {c.status}</small>:<button type="button" className="icon-btn" onClick={()=>setDirectCosts(a=>a.filter((_,n)=>n!==i))} title="Remove unsaved cost"><Trash2 size={16}/></button>}</div>)}{!directCosts.length&&<div className="empty">No repair-specific expenses added.</div>}<div style={{marginTop:12}}><small>Repair-linked expenses</small><strong>{money(directCostTotal)}</strong></div></div>

      <div className="detail-card" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">FINANCIAL SUMMARY</p><h3>What did this job actually make?</h3><p className="muted">Customer charges are not revenue until money is confirmed.</p></div><button type="button" className="text-link" onClick={useCalculatedTotal}>Use calculated total</button></div><div className="detail-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}><div><small>Customer charge</small><strong>{money(form.total_amount)}</strong></div><div><small>Money received</small><strong>{money(confirmedRevenue)}</strong></div><div><small>Balance due</small><strong>{money(balanceDue)}</strong></div><div><small>Pending payments</small><strong>{money(pendingPayments)}</strong></div></div><div className="detail-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginTop:12}}><div><small>Part cost</small><strong>{money(partsCost)}</strong></div><div><small>Labor cost</small><strong>{money(laborCost)}</strong></div><div><small>Repair expenses</small><strong>{money(directCostTotal)}</strong></div><div><small>Direct cost</small><strong>{money(totalKnownCost)}</strong></div></div><div className="detail-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:12}}><div><small>Realized profit</small><strong>{money(realizedProfit)}</strong></div><div><small>Realized margin</small><strong>{confirmedRevenue?`${((realizedProfit/confirmedRevenue)*100).toFixed(2)}%`:'—'}</strong></div><div><small>Projected profit</small><strong>{money(projectedProfit)}</strong></div></div><p className="muted" style={{marginTop:12}}>Profit to date = confirmed revenue − parts cost − labor cost − repair-linked expenses.</p></div>

      <label style={{marginTop:14}}>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="primary full" disabled={saving||partsLoading||financiallyClosed}>{saving||partsLoading?'Saving…':financiallyClosed?'Financially closed':'Save repair and costing'}</button></fieldset></form>

      {selected&&<><hr style={{borderColor:'#193229',margin:'22px 0'}}/><div className="panel-head"><div><p className="eyebrow">PAYMENTS</p><h3>Repair payment reconciliation</h3></div></div>{payments.map(p=><div className="activity-item" key={p.id}><span/><div style={{flex:1}}><strong>{money(p.amount)} · {p.payment_method} · {p.payment_status}</strong><small>{dateTime(p.paid_at)} {p.reference?`· ${p.reference}`:''}</small></div>{p.payment_status==='pending'&&!financiallyClosed&&<button type="button" className="text-link" onClick={()=>confirmPayment(p)}>Confirm</button>}</div>)}<div className="detail-card" style={{marginTop:12}}><p className="eyebrow">RECONCILIATION CHECK</p><div className="detail-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}><div><small>Payment / income</small><strong>{control?.payment_control_status==='reconciled'?'RECONCILED':'REVIEW'}</strong></div><div><small>Customer balance</small><strong>{money(control?.balance_due)}</strong></div><div><small>Settlement</small><strong>{status}</strong></div></div></div>{!financiallyClosed&&<div className="detail-card" style={{marginTop:12}}><p className="eyebrow">RECORD PAYMENT</p><div className="detail-grid" style={{gridTemplateColumns:'1fr 1fr'}}><label>Amount<input type="number" min="0.01" step="0.01" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/></label><label>Method<select value={payment.payment_method} onChange={e=>setPayment({...payment,payment_method:e.target.value})}>{METHODS.map(x=><option key={x}>{x}</option>)}</select></label><label>Reference<input value={payment.reference} onChange={e=>setPayment({...payment,reference:e.target.value})}/></label><label>Notes<input value={payment.notes} onChange={e=>setPayment({...payment,notes:e.target.value})}/></label></div><button type="button" className="primary" onClick={addPayment} disabled={saving}>Record pending payment</button></div>}</>}

      {selected&&<div className="detail-card" style={{marginTop:18}}><div className="panel-head"><div><p className="eyebrow">FINANCIAL CLOSURE</p><h3>Close repair financially</h3><p className="muted">Technical completion and financial closure are separate controls.</p></div>{canClose&&<button type="button" className="primary" onClick={closeFinancially} disabled={saving}>Close repair financially</button>}</div><div className="detail-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}><div><small>Fully paid</small><strong>{control?.balance_due<=0.01?'YES':'NO'}</strong></div><div><small>Costs complete</small><strong>{control?.costs_complete?'YES':'NO'}</strong></div><div><small>Financially reconciled</small><strong>{control?.payment_control_status==='reconciled'?'YES':'NO'}</strong></div><div><small>Technical status</small><strong>{control?.repair_status||'—'}</strong></div></div>{status==='PAID'&&<p className="muted" style={{marginTop:12}}>The customer has paid in full, but the repair must be technically completed before it can be financially closed.</p>}{status==='READY TO CLOSE'&&<p className="muted" style={{marginTop:12}}>All closure controls pass. An admin can now lock the financial record.</p>}{status==='OVERPAID'&&<p className="muted" style={{marginTop:12}}>Review the overpayment before closure. A financially closed repair cannot be altered.</p>}</div>}
    </div></div>}
  </div>
}
