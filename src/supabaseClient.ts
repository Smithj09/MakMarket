import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'NOT FOUND');
console.log('Supabase Key:', supabaseAnonKey ? 'Found' : 'NOT FOUND');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials not found!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
