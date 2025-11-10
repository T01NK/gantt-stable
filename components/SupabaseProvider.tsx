'use client'; // Ce composant est "côté client"

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '../utils/supabase'; // On importe notre fonction
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types_db'; // On importe le type

// On type le client avec notre base de données
type SupabaseContext = {
  supabase: SupabaseClient<Database>;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// On met à jour ce composant
export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  // C'EST ICI que l'on crée le client, UNE SEULE FOIS,
  // à l'intérieur du composant client.
  const [supabase] = useState(() => createClient());

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

// Cette fonction ne change pas, mais elle est maintenant correcte
export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context.supabase;
};

// (Ajoutez ce bloc tout en bas de components/SupabaseProvider.tsx)

// Composant de protection qui gère les Hooks côté client
export function ClientOnlyWrapper({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Si nous sommes sur le serveur (ou avant l'hydratation), on retourne null
    return null; 
  }

  // Sinon, on retourne le contenu normal
  return <>{children}</>;
}