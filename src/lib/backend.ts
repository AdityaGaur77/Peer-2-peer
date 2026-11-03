import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase connection, or null when the site runs without one.
 *
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vercel → Settings →
 * Environment Variables, type Config, then redeploy) and the whole site
 * switches to the shared database. Leave them out and it keeps working the
 * old way, with everything saved in each visitor's own browser.
 *
 * The anon key is meant to be public. What protects the data is the
 * row-level security in supabase/schema.sql.
 */
const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const supabase: SupabaseClient | null =
  url && key && typeof window !== 'undefined'
    ? createClient(url, key, {
        auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
      })
    : null;

export const LIVE = supabase !== null;
