import { supabase } from '../lib/supabaseClient'

/**
 * EMC Database Service with Dual-Persistence Engine
 * Provides offline-first local storage caching + Supabase PostgreSQL synchronization
 */

const LOCAL_STORAGE_KEYS = {
  STANDARDS: 'ft_emc_standards_cache',
  LIMIT_CURVES: 'ft_emc_limit_curves_cache',
  DOCUMENTS: 'ft_emc_documents_cache',
  TEST_RUNS: 'ft_emc_test_runs_cache',
}

// Helper to check if string is a valid UUID
function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export const emcDatabaseService = {
  /**
   * Fetch All EMC Standards (from Supabase with Local Cache Fallback)
   */
  async getStandards() {
    try {
      const { data, error } = await supabase
        .from('emc_standards')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.STANDARDS, JSON.stringify(data))
        return data
      }
    } catch (err) {
      console.warn('Supabase fetch emc_standards failed, falling back to local cache:', err.message)
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.STANDARDS)
    return cached ? JSON.parse(cached) : []
  },

  /**
   * Save or Update an EMC Standard
   */
  async saveStandard(standard) {
    try {
      const { data, error } = await supabase
        .from('emc_standards')
        .upsert(standard)
        .select()
        .single()

      if (!error && data) {
        const cached = await this.getStandards()
        const updated = [data, ...cached.filter((s) => s.id !== data.id)]
        localStorage.setItem(LOCAL_STORAGE_KEYS.STANDARDS, JSON.stringify(updated))
        return data
      }
    } catch (err) {
      console.warn('Supabase save emc_standards error, caching locally:', err.message)
    }

    const cached = await this.getStandards()
    const updated = [standard, ...cached.filter((s) => s.id !== standard.id)]
    localStorage.setItem(LOCAL_STORAGE_KEYS.STANDARDS, JSON.stringify(updated))
    return standard
  },

  /**
   * Fetch CISPR 25 / ISO 11452 Limit Curves
   */
  async getLimitCurves(standardId = null) {
    try {
      let query = supabase.from('emc_limit_curves').select('*')
      if (standardId) {
        query = query.eq('standard_id', standardId)
      }
      const { data, error } = await query

      if (!error && data && data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.LIMIT_CURVES, JSON.stringify(data))
        return data
      }
    } catch (err) {
      console.warn('Supabase limit curves query fallback:', err.message)
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.LIMIT_CURVES)
    const list = cached ? JSON.parse(cached) : []
    return standardId ? list.filter((c) => c.standard_id === standardId) : list
  },

  /**
   * Fetch Ingested EMC Technical Documents & PDFs
   */
  async getDocuments() {
    try {
      const { data, error } = await supabase
        .from('emc_documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENTS, JSON.stringify(data))
        return data
      }
    } catch (err) {
      console.warn('Supabase documents query fallback:', err.message)
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENTS)
    return cached ? JSON.parse(cached) : []
  },

  /**
   * Ingest and Save Extracted PDF Document metadata
   */
  async saveDocument(doc) {
    const docToSave = {
      ...doc,
      created_at: doc.created_at || new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase
        .from('emc_documents')
        .upsert(docToSave)
        .select()
        .single()

      if (!error && data) {
        const cached = await this.getDocuments()
        const updated = [data, ...cached.filter((d) => d.id !== data.id)]
        localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated))
        return data
      }
    } catch (err) {
      console.warn('Supabase save document error, caching locally:', err.message)
    }

    const cached = await this.getDocuments()
    const updated = [docToSave, ...cached.filter((d) => d.id !== docToSave.id)]
    localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated))
    return docToSave
  },

  /**
   * Fetch User Lab Test Runs & Measured Traces
   */
  async getTestRuns() {
    try {
      const { data, error } = await supabase
        .from('emc_test_runs')
        .select('*')
        .order('test_date', { ascending: false })

      if (!error && data && data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.TEST_RUNS, JSON.stringify(data))
        return data
      }
    } catch (err) {
      console.warn('Supabase test runs query fallback:', err.message)
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.TEST_RUNS)
    return cached ? JSON.parse(cached) : []
  },

  /**
   * Save a Lab Test Measurement Run
   */
  async saveTestRun(run) {
    const runToSave = {
      ...run,
      id: run.id && isUuid(run.id) ? run.id : undefined,
      test_date: run.test_date || new Date().toISOString().split('T')[0],
    }

    try {
      const { data, error } = await supabase
        .from('emc_test_runs')
        .upsert(runToSave)
        .select()
        .single()

      if (!error && data) {
        const cached = await this.getTestRuns()
        const updated = [data, ...cached.filter((r) => r.id !== data.id)]
        localStorage.setItem(LOCAL_STORAGE_KEYS.TEST_RUNS, JSON.stringify(updated))
        return data
      }
    } catch (err) {
      console.warn('Supabase save test run error, caching locally:', err.message)
    }

    const localRun = { ...runToSave, id: runToSave.id || `local-${Date.now()}` }
    const cached = await this.getTestRuns()
    const updated = [localRun, ...cached.filter((r) => r.id !== localRun.id)]
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEST_RUNS, JSON.stringify(updated))
    return localRun
  },
}
