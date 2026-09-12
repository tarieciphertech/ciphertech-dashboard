import { supabase } from './supabase'

export async function getDashboardData() {
  if (!supabase) return { overview: null, repairs: [], inquiries: [], activity: [], errors: ['Supabase is not configured.'] }
  const results = await Promise.all([
    supabase.from('dashboard_overview').select('*').single(),
    supabase.from('repair_balances').select('*').order('updated_at', { ascending: false }).limit(8),
    supabase.from('inquiries').select('id,name,email,service,status,updated_at,created_at').order('updated_at', { ascending: false }).limit(6),
    supabase.from('notifications').select('id,type,payload,created_at,read_at').order('created_at', { ascending: false }).limit(6),
  ])
  const errors = results.filter(x => x.error).map(x => x.error.message)
  return {
    overview: results[0].data || null,
    repairs: results[1].data || [],
    inquiries: results[2].data || [],
    activity: results[3].data || [],
    errors,
  }
}

export async function getFinanceSummary() {
  if (!supabase) return { daily: [], monthly: [], errors: ['Supabase is not configured.'] }
  const [daily, monthly] = await Promise.all([
    supabase.from('finance_daily_summary').select('*').order('transaction_date', { ascending: false }).limit(14),
    supabase.from('finance_monthly_summary').select('*').order('month_start', { ascending: false }).limit(12),
  ])
  return { daily: daily.data || [], monthly: monthly.data || [], errors: [daily.error, monthly.error].filter(Boolean).map(x => x.message) }
}

export const money = value => `BWP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dateTime = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const dateOnly = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { dateStyle: 'medium' }) : '—'
