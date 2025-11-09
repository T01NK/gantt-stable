'use client'; 

import { useEffect, useRef, useState } from 'react';
import type { Task } from 'frappe-gantt'; 
import { useSupabase } from '../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const ganttContainerRef = useRef<SVGSVGElement | null>(null);
  const [ganttInstance, setGanttInstance] = useState<any | null>(null);
  const [inputText, setInputText] = useState(
    "task1, Tâche Parente 1, 2025-11-05, 2025-11-08\n" +
    "  task2, Sous-tâche 1.1 (indentée), 2025-11-06, 2025-11-07\n" +
    "task3, Tâche Parente 2 (dépend de 1), 2025-11-09, 2025-11-12, $task1\n" +
    "task4, Tâche Parente 3, 2025-11-10, 2025-11-13\n" +
    "  task5, Sous-tâche 3.1, 2025-11-11, 2025-11-12, $task2"
  );
  
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);

  // --- NOUVEAUTÉ : On stocke l'état de chargement ---
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); // On a fini de charger
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // L'état a changé, on a fini de charger
    });

    return () => subscription.unsubscribe();
  }, [supabase]);
  
  // (Votre useEffect pour le GANTT ne change pas)
  useEffect(() => {
    if (session && ganttContainerRef.current) {
      import('frappe-gantt').then((GanttModule) => {
        const FrappeGantt = GanttModule.default;
        const gantt = new FrappeGantt(ganttContainerRef.current!, [], {
          header_height: 50, bar_height: 20, step: 24,
          view_modes: ['Day', 'Week', 'Month'], bar_corner_radius: 3,
        });
        setGanttInstance(gantt);
      });
    }
  }, [session, ganttContainerRef]); 
  
  // (Votre fonction parseInputToTasks ne change pas)
  const parseInputToTasks = (text: string): Task[] => {
    // ... (tout votre code de parsing est ici, il ne change pas)
    const lines = text.split('\n');
    const tasks: Task[] = [];
    let lastParentId: string | null = null; 
    for (let line of lines) {
      const isSubtask = line.startsWith('  ') || line.startsWith('\t');
      line = line.trim(); 
      if (line === "") continue;
      const parts = line.split(',').map(part => part.trim());
      if (parts.length < 4) continue; 
      const [id, name, start, end] = parts;
      let dependencies = "";
      if (parts.length > 4) {
        dependencies = parts.slice(4).filter(p => p.startsWith('$')).map(p => p.substring(1)).join(', ');
      }
      const newTask: Task = {
        id: id, name: name, start: start, end: end,
        progress: 0, dependencies: dependencies
      };
      if (isSubtask && lastParentId) {
        newTask.dependencies = newTask.dependencies ? `${newTask.dependencies}, ${lastParentId}` : lastParentId;
        newTask.name = `  ↳ ${name}`;
      } else if (!isSubtask) {
        lastParentId = id;
      }
      tasks.push(newTask);
    }
    return tasks;
  };

  // (Votre fonction handleGenerateGantt ne change pas)
  const handleGenerateGantt = () => {
    if (ganttInstance && parseInputToTasks) {
      const newTasks = parseInputToTasks(inputText);
      ganttInstance.refresh(newTasks);
    }
  };
  
  // --- NOUVELLE FONCTION : DÉCONNEXION ---
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // --- NOUVELLE FONCTION : SAUVEGARDER (Le Paywall) ---
  const handleSave = async () => {
    if (!session?.user) {
      alert("Erreur : Utilisateur non trouvé.");
      return;
    }

    // 1. On va chercher le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles') // Notre table
      .select('subscription_status') // On veut juste le statut
      .eq('id', session.user.id) // Où l'id est celui de l'utilisateur
      .single(); // On s'attend à un seul résultat

    if (profileError) {
      alert("Erreur lors de la vérification de votre profil.");
      console.error(profileError);
      return;
    }

    // 2. Le "Paywall" (Version Pro)
    if (profile.subscription_status === 'free') {
      // On appelle notre "mini-serveur" pour créer un lien unique
      fetch('/api/stripe/create-checkout', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          // data.url est le lien unique renvoyé par Stripe
          if (data.url) {
            window.location.href = data.url;
          }
        })
        .catch((e) => {
          console.error(e);
          alert('Erreur lors de la création du paiement.');
        });
      return; // On arrête la fonction ici
    }

    // 3. (Si l'utilisateur est 'Pro', il arrive ici)
    alert("Vous êtes Pro ! Sauvegarde en cours..."); // Message de test
    
    const { error: saveError } = await supabase
      .from('projects') // Notre table de projets
      .insert({ 
        user_id: session.user.id, // L'ID du propriétaire
        gantt_data: inputText // Le texte brut de la zone de texte
      });

    if (saveError) {
      alert("Erreur lors de la sauvegarde.");
      console.error(saveError);
    } else {
      alert("Projet sauvegardé avec succès !");
    }
  };
  
  // --- MISE À JOUR DU RENDU ---
  
  // On ajoute un état de chargement
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-12">
        <p>Chargement...</p>
      </main>
    );
  }

  // Si l'utilisateur n'est PAS connecté
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-12">
        <div className="w-full max-w-lg">
          <h1 className="text-4xl font-bold mb-8 text-center">Bienvenue !</h1>
          <p className="text-lg text-gray-400 mb-6 text-center">Connectez-vous pour utiliser le Générateur de GANTT.</p>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={['github', 'google']} // N'oubliez pas de les activer dans Supabase
          />
        </div>
      </main>
    );
  }

  // Si l'utilisateur EST connecté
  return (
    <main className="flex min-h-screen flex-col items-center p-12">
      
      {/* --- NOUVEAUTÉ : Barre de navigation simple --- */}
      <nav className="w-full max-w-4xl flex justify-between items-center mb-8">
        <span className="text-gray-400">Connecté en tant que : {session.user.email}</span>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
          onClick={handleSignOut}
        >
          Se Déconnecter
        </button>
      </nav>
      {/* --- FIN NOUVEAUTÉ --- */}

      <h1 className="text-4xl font-bold mb-4">Générateur de GANTT</h1>
      
      <div className="w-full max-w-4xl">
        <textarea
          className="w-full h-48 p-2 border border-gray-600 rounded-md bg-gray-900 text-gray-100" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Format: id, Nom, DateDébut, DateFin, $dépendance1, $dépendance2..."
        />
        
        <div className="flex gap-4 mt-4"> {/* Conteneur pour les boutons */}
          <button
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
            onClick={handleGenerateGantt}
          >
            Générer / Mettre à jour
          </button>
          
          {/* --- NOUVEAUTÉ : Le bouton Sauvegarder --- */}
          <button
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700"
            onClick={handleSave}
          >
            Sauvegarder
          </button>
          {/* --- FIN NOUVEAUTÉ --- */}
        </div>
      </div>
      
      <p className="mt-8 mb-4 text-lg">Résultat :</p>

      <div className="w-full max-w-4xl min-h-[200px]">
        <svg ref={ganttContainerRef}></svg>
      </div>
    </main>
  );
}