import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are not set in environment variables.');
}

export const DEFAULT_QUERY_TIMEOUT_MS = 10_000;

/**
 * Universal fetch wrapper applying an AbortController timeout (10,000ms)
 * to prevent hung network connections or database stalls across all Supabase queries.
 */
export const timeoutFetch: typeof fetch = (input, init = {}) => {
  if (init.signal) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Supabase query timed out after ${DEFAULT_QUERY_TIMEOUT_MS}ms`));
  }, DEFAULT_QUERY_TIMEOUT_MS);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: timeoutFetch,
  },
});

