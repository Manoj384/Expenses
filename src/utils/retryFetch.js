/**
 * retryFetch — wraps any async fn with exponential backoff retry
 *
 * Usage:
 *   const data = await retryFetch(() =>
 *     supabase.from('transactions').select('*').eq('user_id', uid)
 *   )
 *
 * Options:
 *   retries  — number of attempts (default 3)
 *   delay    — initial delay ms (default 500, doubles each retry)
 *   onRetry  — optional callback(attempt, error) for logging/toast
 */
export async function retryFetch(fn, { retries = 3, delay = 500, onRetry } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn()
      // Supabase returns { data, error } — treat error as throw
      if (result && result.error) {
        throw result.error
      }
      return result
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        if (onRetry) onRetry(attempt, err)
        await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt - 1)))
      }
    }
  }
  throw lastError
}

/**
 * withRetry — higher-order wrapper for Supabase queries
 * Automatically unwraps { data, error } and retries on failure.
 *
 * Usage:
 *   const rows = await withRetry(() =>
 *     supabase.from('goals').select('*').eq('user_id', uid)
 *   )
 */
export async function withRetry(queryFn, options = {}) {
  const result = await retryFetch(queryFn, options)
  return result?.data ?? result
}
