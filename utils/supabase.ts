import { createClient as createSupabaseClient } from '@supabase/supabase-js' // On le renomme ici
import type { Database } from '../types_db' 

// On utilise le client standard de Supabase, qui est plus robuste pour le navigateur
export const createClient = () =>
  createSupabaseClient<Database>( // On utilise le nom renommé
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Options minimales pour éviter les bugs de rafraîchissement
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      // Ajout du fetch global
      global: {
        fetch
      }
    }
  );