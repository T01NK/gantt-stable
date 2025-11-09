import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types_db' // Nous créerons ce fichier plus tard

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Note : On utilise process.env... pour lire les clés que vous avez mises sur Vercel