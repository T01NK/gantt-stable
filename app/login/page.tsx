'use client';

// Import du composant de protection
import { ClientOnlyWrapper } from '../../components/SupabaseProvider';

// C'est notre page de connexion dédiée
import { useSupabase } from '../../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Le composant principal qui contient la logique
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

    // 2. ÉCOUTE les nouveaux événements de connexion
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // CORRECTION : Lire et transmettre le paramètre d'URL
        const plan = searchParams.get('plan');
        
        if (plan === 'pro') {
          router.push('/?plan=pro'); // Redirige vers le paiement
        } else {
          router.push('/'); // Comportement normal
        }
      }
    });

    // 3. Nettoie l'écouteur
    return () => subscription.unsubscribe();

  }, [supabase, router, searchParams]);

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
          theme="light"
          providers={['github', 'google']}
          // On force la redirection vers notre nouvelle route API
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
        />
      </div>
    </main>
  );
}

// Le composant exporté par défaut, enveloppé dans la protection côté client
export default function Login() {
    return (
        <ClientOnlyWrapper>
            <LoginContent />
        </ClientOnlyWrapper>
    );
}