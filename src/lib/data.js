import { supabase } from './supabase'

export const TABLES = ['inquiries', 'tickets', 'projects', 'services', 'notifications', 'profiles']

export async function getCount(table, filter) {
  if (!supabase) return { count: null, error: new Error('Supabase is not configured.') }
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) query = filter(query)
  const { count, error } = await query
  return { count, error }
}

export async function getRecent(table, columns = '*', limit = 6) {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured.') }
  const { data, error } = await supabase.from(table).select(columns).limit(limit)
  return { data: data || [], error }
}

export async function getDashboardData() {
  const queries = await Promise.all(TABLES.map((table) => getCount(table)))
  const counts = Object.fromEntries(TABLES.map((table, index) => [table, queries[index].count ?? 0]))
  const errors = queries.filter((result) => result.error).map((result) => result.error.message)
  const recent = await getRecent('inquiries', '*', 8)
  if (recent.error) errors.push(recent.error.message)
  return { counts, inquiries: recent.data, errors }
}
