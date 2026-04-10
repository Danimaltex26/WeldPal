import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth and DB features will not work.'
  );
}

// Default client — public schema (auth, profiles, subscriptions)
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder'
);

// WeldPal-schema client for app data (weld_analyses, weld_reference, cert_prep_*, etc.)
export const supabaseWeldpal = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  { db: { schema: 'weldpal' } }
);
