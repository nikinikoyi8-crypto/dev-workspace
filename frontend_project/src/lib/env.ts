const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const apiUrl = import.meta.env.VITE_API_URL ?? '';

export const env = {
  apiUrl,
  supabaseUrl,
  supabaseAnonKey,
  hasSupabaseConfig: Boolean(supabaseUrl && supabaseAnonKey),
} as const;