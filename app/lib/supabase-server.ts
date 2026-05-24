import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Crée un client Supabase server-side. Si un token JWT Clerk est fourni, il est
 * passé dans le header Authorization → Supabase l'utilise pour résoudre
 * `auth.uid()` et `auth.jwt()->>'sub'`, ce qui active les RLS policies et
 * remplit automatiquement les colonnes `user_id` (default `auth.jwt()->>'sub'`).
 */
export function createSupabaseServer(token?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error('Supabase: URL ou clé publishable manquante dans .env')
  }

  return createClient(url.trim(), key.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  })
}
