import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client cho browser (có RLS - dùng trong components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client cho server/API routes (bypass RLS - dùng trong route.ts)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
