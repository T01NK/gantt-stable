import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types_db';

// On lit les clés secrètes que SEUL LE SERVEUR peut voir
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// C'est notre client "Admin"
const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      // C'est important
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;