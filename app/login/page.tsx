'use client';

export const dynamic = 'force-dynamic';

// C'est notre page de connexion dédiée
import { useSupabase } from '../../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect } from 'react';

// --- NOUVEAUTÉ : Importer useSearchParams ---
import { useRouter, useSearchParams } from 'next/navigation';
// --- FIN NOUVEAUTÉ ---

export default function Login() {
  const supabase = useSupabase();
  const router = useRouter(); 

  // --- NOUVEAUTÉ : Lire les paramètres de l'URL ---
  const searchParams = useSearchParams();
  // --- FIN NOUVEAUTÉ ---

  useEffect(() => {
    // 1. Vérifie si l'utilisateur est DÉJÀ connecté (au chargement)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/'); // Redirige vers la page principale
      }
    });

    // 2. ÉCOUTE les nouveaux événements de connexion
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Si l'événement est une connexion réussie
      if (event === 'SIGNED_IN' && session) {
        
        // --- CORRECTION : Lire le paramètre d'URL ---
        const plan = searchParams.get('plan');
        
        if (plan === 'pro') {
          // On le transmet à la page d'accueil !
          router.push('/?plan=pro');
        } else {
          // Comportement normal
          router.push('/');
        }
        // --- FIN CORRECTION ---
      }
    });

    // 3. Nettoie l'écouteur quand on quitte la page
    return () => subscription.unsubscribe();

  }, [supabase, router, searchParams]); // <-- On ajoute searchParams aux dépendances
  // --- FIN DE LA MISE À JOUR ---

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold mb-8 text-center">Connexion</h1>
        <p className="text-lg text-gray-400 mb-6 text-center">
          Connectez-vous ou créez un compte pour accéder à l'outil.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={['github', 'google']}
        />
      </div>
    </main>
  );
}