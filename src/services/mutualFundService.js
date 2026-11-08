import { supabase } from '../lib/supabaseClient.js'
import { enrichFundsWithCachedNavs, refreshFundNavs } from '../utils/mfApi.js'
import savedGrowwData from '../data/groww_holdings.json'

/**
 * Mutual Fund Portfolio Service & Repository
 * Handles loading, updating, AMFI live NAV synchronization, and fallback caching.
 */

export async function fetchMutualFunds(userId) {
  if (!userId) {
    // Unauthenticated fallback to cache or demo data
    try {
      const cached = localStorage.getItem('ft_cached_mutual_funds')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return enrichFundsWithCachedNavs(parsed)
        }
      }
    } catch {}
    return enrichFundsWithCachedNavs(savedGrowwData)
  }

  const { data, error } = await supabase
    .from('mutual_funds')
    .select('*')
    .eq('user_id', userId)
    .order('current_value', { ascending: false })

  if (error) throw error

  let list = (data || []).map((f) => ({
    ...f,
    scheme_name: f.scheme_name ? f.scheme_name.replace(/\s*\(Folio\s+[^)]+\)$/i, '').trim() : f.scheme_name,
  }))

  // Only seed default Groww holdings if the user has no mutual fund records in Supabase yet
  if (list.length === 0) {
    const toInsert = savedGrowwData.map((item) => ({
      user_id: userId,
      scheme_code: item.scheme_code || null,
      scheme_name: item.scheme_name,
      folio_number: item.folio_number || null,
      units: parseFloat(item.units || 0),
      avg_nav: parseFloat(item.avg_nav || 0),
      current_nav: parseFloat(item.current_nav || 0),
      invested_amount: parseFloat(item.invested_amount || 0),
      current_value: parseFloat(item.current_value || item.invested_amount || 0),
      returns: parseFloat(item.returns || 0),
      xirr: item.xirr || null,
      last_updated: new Date().toISOString(),
    }))

    const { data: insertedData, error: insErr } = await supabase
      .from('mutual_funds')
      .insert(toInsert)
      .select('*')

    if (!insErr && insertedData && insertedData.length > 0) {
      list = insertedData.map((f) => ({
        ...f,
        scheme_name: f.scheme_name ? f.scheme_name.replace(/\s*\(Folio\s+[^)]+\)$/i, '').trim() : f.scheme_name,
      }))
    } else {
      list = savedGrowwData
    }
  }

  const enriched = enrichFundsWithCachedNavs(list)
  try {
    localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(enriched))
  } catch {}

  return enriched
}

export async function saveMutualFund({ userId, fund, id = null }) {
  if (!userId) throw new Error('User ID is required')

  const payload = {
    user_id: userId,
    scheme_code: fund.scheme_code || null,
    scheme_name: fund.scheme_name,
    folio_number: fund.folio_number || null,
    units: parseFloat(fund.units || 0),
    avg_nav: parseFloat(fund.avg_nav || 0),
    current_nav: parseFloat(fund.current_nav || fund.avg_nav || 0),
    invested_amount: parseFloat(fund.invested_amount || 0),
    current_value: parseFloat(fund.current_value || fund.invested_amount || 0),
    last_updated: new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await supabase
      .from('mutual_funds')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('mutual_funds')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteMutualFund(id) {
  if (!id) throw new Error('Fund ID is required')
  const { error } = await supabase.from('mutual_funds').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function syncMutualFundNavs(funds, userId) {
  const updated = await refreshFundNavs(funds)

  try {
    localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(updated))
  } catch {}

  if (userId) {
    const updatePromises = updated.map((f) => {
      const payload = {
        scheme_code: f.scheme_code,
        current_nav: f.current_nav,
        current_value: f.current_value,
        last_updated: new Date().toISOString(),
      }
      if (f.id && !String(f.id).startsWith('groww_')) {
        return supabase.from('mutual_funds').update(payload).eq('id', f.id)
      } else if (f.folio_number) {
        return supabase.from('mutual_funds').update(payload).eq('user_id', userId).eq('folio_number', f.folio_number)
      }
      return null
    }).filter(Boolean)

    await Promise.allSettled(updatePromises)
  }

  return updated
}
