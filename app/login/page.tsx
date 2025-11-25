'use client';

// --- IMPORTS MANQUANTS (CRUCIAUX) ---
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
// On importe le hook ET le wrapper depuis notre provider
import { useSupabase, ClientOnlyWrapper } from '../../components/SupabaseProvider';

// --- COMPOSANT DE CONTENU ---
function LoginContent() {
  const supabase = useSupabase();
  const router = useRouter(); 
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Vérifie si l'utilisateur est DÉJÀ connecté (au chargement)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/'); 
      }
    });

    // 2. ÉCOUTE les nouveaux événements de connexion (Standard)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const plan = searchParams.get('plan');
        if (plan === 'pro') {
          router.push('/?plan=pro'); 
        } else {
          router.push('/'); 
        }
      }
    });

    // 3. GESTION SPÉCIALE GOOGLE (Le Hash URL)
    // Si l'URL contient un access_token (retour de Google en mode implicite),
    // on force la vérification de session après un court délai.
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
        setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    router.push('/');
                }
            });
        }, 1000);
    }

    return () => subscription.unsubscribe();

  }, [supabase, router, searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-white text-slate-900">
      <div className="w-full max-w-lg">
        <h1 className="text-4xl font-bold mb-8 text-center">Connexion</h1>
        <p className="text-lg text-slate-500 mb-6 text-center">
          Connectez-vous ou créez un compte pour accéder à l'outil.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={['google']}
          // On laisse Supabase gérer la redirection par défaut ou on pointe vers la page courante
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
        />
      </div>
    </main>
  );
}

// --- EXPORT PAR DÉFAUT (PROTÉGÉ) ---
export default function Login() {
    return (
        <ClientOnlyWrapper>
            <LoginContent />
        </ClientOnlyWrapper>
    );
}