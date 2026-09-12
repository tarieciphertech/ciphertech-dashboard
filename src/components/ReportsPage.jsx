import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/data'

const emptyOverview = {
  today_income: 0,
  today_expenses: 0,
  today_deductions: 0,
  today_net_position: 0,
  active_repairs: 0,
  repairs_with_balance: 0,
  active_projects: 0,
  open_project_tasks: 0,
}

function Metric({ label, value, detail }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

export default function ReportsPage() {
  const [state, setState] = useState({ loading: true, error: '', overview: emptyOverview, months: [], settlements: null, repairs: [] })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        if (!cancelled) setState(x => ({ ...x, loading: false, error: 'Supabase is not configured.' }))
        return
      }

      const [overviewResult, monthsResult, settlementResult, repairsResult] = await Promise.all([
        supabase.from('dashboard_overview').select('*').maybeSingle(),
        supabase.from('finance_monthly_summary').select('*').order('month_start', { ascending: false }).limit(12),
        supabase.from('finance_repair_settlement_summary').select('*').maybeSingle(),
        supabase.from('repair_settlement_reporting').select('*').order('intake_date', { ascending: false }).limit(100),
      ])

      if (cancelled) return
      const errors = [overviewResult, monthsResult, settlementResult, repairsResult]
        .filter(x => x.error)
        .map(x => x.error.message)

      setState({
        loading: false,
        error: errors.join(' • '),
        overview: { ...emptyOverview, ...(overviewResult.data || {}) },
        months: monthsResult.data || [],
        settlements: settlementResult.data || null,
        repairs: repairsResult.data || [],
      })
    }
    load()
    return () => { cancelled = true }
  }, [])

  const o = state.overview
  const s = state.settlements || {}
  const recentRepairs = state.repairs.slice(0, 8)

  return <div>
    <div className="page-intro">
      <div>
        <p className="eyebrow">BUSINESS INTELLIGENCE</p>
        <h1>Reports</h1>
        <p className="muted">A decision view across money received, repair performance, settlement control, and delivery activity.</p>
      </div>
    </div>

    {state.loading && <div className="alert">Loading business reports…</div>}
    {state.error && <div className="alert danger"><strong>Some report data could not be loaded.</strong><br />{state.error}</div>}

    <section className="panel workspace-hero">
      <div>
        <p className="eyebrow">BUSINESS POSITION</p>
        <h2>{money(o.today_net_position)}</h2>
        <p className="muted">Today’s confirmed income minus confirmed expenses and deductions.</p>
      </div>
      <div className="workspace-hero-meta">
        <div><span>Income</span><strong>{money(o.today_income)}</strong></div>
        <div><span>Expenses</span><strong>{money(o.today_expenses)}</strong></div>
        <div><span>Deductions</span><strong>{money(o.today_deductions)}</strong></div>
      </div>
    </section>

    <div className="metric-grid">
      <Metric label="Active repairs" value={o.active_repairs ?? 0} detail="Technical work in progress" />
      <Metric label="Balances due" value={o.repairs_with_balance ?? 0} detail="Repairs with customer balance" />
      <Metric label="Active projects" value={o.active_projects ?? 0} detail="Planned, active or on hold" />
      <Metric label="Open project tasks" value={o.open_project_tasks ?? 0} detail="Todo, in progress or blocked" />
    </div>

    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-head"><div><p className="eyebrow">REPAIR SETTLEMENT</p><h3>Money and closure control</h3></div></div>
        <div className="metric-grid compact">
          <Metric label="Customer charges" value={money(s.customer_charges)} detail={`${s.total_repairs || 0} repairs`} />
          <Metric label="Money received" value={money(s.money_received)} detail="Confirmed receipts" />
          <Metric label="Balance due" value={money(s.balance_due)} detail="Outstanding customer balances" />
          <Metric label="Realized profit" value={money(s.realized_profit)} detail="After direct repair costs" />
        </div>
        <div className="attention-strip">
          <span>Closed <strong>{s.closed_repairs || 0}</strong></span>
          <span>Ready to close <strong>{s.ready_to_close_repairs || 0}</strong></span>
          <span>Review <strong>{s.review_repairs || 0}</strong></span>
          <span>Overpaid <strong>{s.overpaid_repairs || 0}</strong></span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><p className="eyebrow">SETTLEMENT HEALTH</p><h3>Exceptions requiring attention</h3></div></div>
        <div className="stack-list">
          <div className="stack-row"><span>Unpaid repairs</span><strong>{s.unpaid_repairs || 0}</strong></div>
          <div className="stack-row"><span>Partially paid</span><strong>{s.partially_paid_repairs || 0}</strong></div>
          <div className="stack-row"><span>Costs incomplete</span><strong>{s.costs_incomplete_repairs || 0}</strong></div>
          <div className="stack-row"><span>Ready to close</span><strong>{s.ready_to_close_repairs || 0}</strong></div>
        </div>
      </section>
    </div>

    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">MONTHLY PERFORMANCE</p><h3>Income, costs and net position</h3></div></div>
      {state.months.length ? <div className="table-wrap"><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Deductions</th><th>Net position</th></tr></thead><tbody>{state.months.map(x => <tr key={x.month_start}><td>{new Date(`${x.month_start}T00:00:00`).toLocaleDateString([], { year: 'numeric', month: 'long' })}</td><td>{money(x.income)}</td><td>{money(x.expenses)}</td><td>{money(x.deductions)}</td><td><strong>{money(x.net_position)}</strong></td></tr>)}</tbody></table></div> : <div className="empty">No confirmed financial transactions have been recorded for a month yet.</div>}
    </section>

    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">REPAIR PERFORMANCE</p><h3>Latest repair settlements</h3></div></div>
      {recentRepairs.length ? <div className="table-wrap"><table><thead><tr><th>Repair</th><th>Customer charge</th><th>Received</th><th>Direct cost</th><th>Profit</th><th>Settlement</th></tr></thead><tbody>{recentRepairs.map(x => <tr key={x.repair_id}><td><strong>{x.brand || 'Device'} {x.model || ''}</strong><br /><small>{x.customer_name || 'Customer'} · {x.repair_id.slice(0, 8)}</small></td><td>{money(x.customer_total)}</td><td>{money(x.actual_money_received)}</td><td>{money(x.total_direct_costs)}</td><td>{money(x.realized_profit)}</td><td><span className="chip">{x.finance_settlement_bucket || x.settlement_status || 'REVIEW'}</span></td></tr>)}</tbody></table></div> : <div className="empty">No repair settlement records are available yet.</div>}
    </section>

    <div className="security-note"><span>Reports are read-only. Financial truth comes from confirmed ledger entries and the repair settlement controls; quotations are not counted as revenue.</span></div>
  </div>
}
