/**
 * Aspire LMS — Centralized Backend Supabase Client Singleton
 * Provides unified credentials, timeout protection, and authenticated fetch helpers.
 */
const path = require('path');

let clientSingleton = null;

const DEFAULT_SUPABASE_URL = 'https://maahwymvereyofrhrytx.supabase.co';
const DEFAULT_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';
const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Resolves Supabase credentials from environment with fallback defaults.
 */
function resolveConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).trim().replace(/\/+$/, '');

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON
  ).trim();

  if (!supabaseUrl) {
    throw new Error('Supabase configuration error: SUPABASE_URL must not be empty.');
  }
  if (!supabaseKey) {
    throw new Error('Supabase configuration error: SUPABASE_ANON_KEY must not be empty.');
  }

  return { supabaseUrl, supabaseKey };
}

/**
 * Creates the client wrapper instance.
 */
function createClientInstance(config) {
  const { supabaseUrl, supabaseKey } = config;

  // Try loading official createClient if @supabase/supabase-js is installed
  let officialCreateClient = null;
  try {
    officialCreateClient = require('@supabase/supabase-js').createClient;
  } catch {
    try {
      officialCreateClient = require(path.resolve(__dirname, '../../frontend/node_modules/@supabase/supabase-js')).createClient;
    } catch {}
  }

  const customFetch = (url, options = {}) => {
    if (!options.signal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      options.signal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
    }
    return fetch(url, options);
  };

  let client;
  if (typeof officialCreateClient === 'function') {
    client = officialCreateClient(supabaseUrl, supabaseKey, {
      global: { fetch: customFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    client = {};
  }

  // Common properties and REST helpers
  client.supabaseUrl = supabaseUrl;
  client.supabaseKey = supabaseKey;
  client.restUrl = `${supabaseUrl}/rest/v1`;
  client.headers = {
    apikey: supabaseKey,
    authorization: `Bearer ${supabaseKey}`,
  };

  client.authFetch = async (endpoint, init = {}) => {
    const fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${client.restUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const mergedHeaders = {
      ...client.headers,
      ...(init.headers || {}),
    };
    return customFetch(fullUrl, {
      ...init,
      headers: mergedHeaders,
    });
  };

  return client;
}

/**
 * Returns the singleton Supabase client wrapper.
 */
function getSupabaseClient() {
  if (!clientSingleton) {
    const config = resolveConfig();
    clientSingleton = createClientInstance(config);
  }
  return clientSingleton;
}

function resetSupabaseClient() {
  clientSingleton = null;
}

module.exports = {
  getSupabaseClient,
  get supabase() {
    return getSupabaseClient();
  },
  resetSupabaseClient,
};
