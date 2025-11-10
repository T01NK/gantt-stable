'use client'; 

import { useEffect, useRef, useState } from 'react';
import type { Task } from 'frappe-gantt'; 
import type { Database } from '../types_db';
import { useSupabase } from '../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar'; // Le nouveau composant
import Header from '../components/Header';

export type Project = Database['public']['Tables']['projects']['Row'];

export default function Home() {
  const ganttContainerRef = useRef<SVGSVGElement | null>(null);
  const ganttInstanceRef = useRef<any | null>(null); // Pour l'instance GANTT

  const [inputText, setInputText] = useState(
    "task1, Tâche Parente 1, 2025-11-05, 2025-11-08\n" +
    "  task2, Sous-tâche 1.1 (indentée), 2025-11-06, 2025-11-07\n"
  );
  
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isPro, setIsPro] = useState(false); // État du statut Pro

  // Pour la redirection Pro
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutTriggered = useRef(false);

  // ------------------------------------------
  // EFFETS ET LOGIQUE DE BASE
  // ------------------------------------------

  // Effect 1: Gérer la session et la détection Pro/Redirection Stripe
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); 
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);


  // Effect 2: Gérer la redirection Stripe immédiate (si l'URL contient ?plan=pro)
  useEffect(() => {
    const plan = searchParams.get('plan');
    
    if (plan === 'pro' && session && !loading && !checkoutTriggered.current) {
      checkoutTriggered.current = true;
      
      // On va chercher le statut ici (car on est loggué)
      supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile && profile.subscription_status === 'free') {
            // L'utilisateur est connecté mais free, on le redirige immédiatement
            fetch('/api/stripe/create-checkout', { method: 'POST' })
              .then((res) => res.json())
              .then((data) => {
                if (data.url) {
                  router.replace('/'); 
                  window.location.href = data.url;
                }
              })
              .catch((e) => { console.error(e); });
          } else if (profile && profile.subscription_status === 'pro') {
            // L'utilisateur est déjà pro, on enlève le ?plan=pro de l'URL
            router.replace('/');
          }
        });
    }
  }, [session, loading, searchParams, supabase, router]);


  // Effect 3: Charger les projets et définir isPro au chargement
  useEffect(() => {
    const fetchProjects = async () => {
      if (!session) return;

      // Définir isPro (même si on ne l'utilise que dans la sidebar, c'est crucial)
      const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single();
      
      if (profile) {
          setIsPro(profile.subscription_status === 'pro');
      }

      // Charger les projets
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, gantt_data')
        .order('created_at', { ascending: false }); // On les ordonne par date récente

      if (error) {
        console.error("Erreur lors du chargement des projets :", error);
      } else if (data) {
        setProjects(data as Project[]);
      }
    };

    fetchProjects();
  }, [session, supabase]);


  // Effect 4: Créer l'instance GANTT
  // Effect 4: Créer l'instance GANTT
  useEffect(() => {
    if (session && ganttContainerRef.current) {
      import('frappe-gantt').then((GanttModule) => {
        const FrappeGantt = GanttModule.default;

        if (!ganttInstanceRef.current) {
          const gantt = new FrappeGantt(ganttContainerRef.current!, [], {
            header_height: 50, bar_height: 20, step: 24,
            view_modes: ['Day', 'Week', 'Month'], bar_corner_radius: 3,
          });
          ganttInstanceRef.current = gantt;
        }

        // Lancement initial + Fix du bug d'affichage (setTimeout)
        if (ganttInstanceRef.current) {
            const initialTasks = parseInputToTasks(inputText);
            ganttInstanceRef.current.refresh(initialTasks);

            // On force un rafraîchissement après 200ms pour s'assurer que le SVG est bien dimensionné
            setTimeout(() => {
                ganttInstanceRef.current.refresh(initialTasks);
            }, 200);
        }
      });
    }
  // Ajoutez 'inputText' aux dépendances ici pour que la page d'accueil se lance correctement
  }, [session, ganttContainerRef, inputText]);


  // ------------------------------------------
  // FONCTIONS (PARSER/HANDLER)
  // ------------------------------------------

  // Fonction de Parsing (ne change pas)
  const parseInputToTasks = (text: string): Task[] => {
    // ... (votre code de parsing est ici)
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

  // Handler GANTT (ne change pas)
  const handleGenerateGantt = () => {
    if (ganttInstanceRef.current && parseInputToTasks) {
      const newTasks = parseInputToTasks(inputText);
      ganttInstanceRef.current.refresh(newTasks);
    }
  };
  
  // Handler Déconnexion (ne change pas)
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Handler Sauvegarde (ne change pas)
  const handleSave = async () => {
    if (!session?.user) {
      alert("Erreur : Utilisateur non trouvé.");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('subscription_status').eq('id', session.user.id).single();
    if (profileError) {
      alert("Erreur lors de la vérification de votre profil. (Voir la console pour le détail).");
      console.error(profileError);
      return;
    }
    if (profile.subscription_status === 'free') {
      fetch('/api/stripe/create-checkout', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) { window.location.href = data.url; }
        })
        .catch((e) => { console.error(e); alert('Erreur lors de la création du paiement.'); });
      return;
    }
    const projectName = window.prompt("Comment voulez-vous nommer ce projet ?", "Nouveau Projet GANTT");
    if (!projectName || projectName.trim() === "") {
      alert("Sauvegarde annulée.");
      return;
    }
    alert("Vous êtes Pro ! Sauvegarde en cours...");
    const { error: saveError, data: savedProject } = await supabase
      .from('projects')
      .insert({ 
        user_id: session.user.id,
        gantt_data: inputText,
        project_name: projectName
      })
      .select() // On demande l'objet sauvegardé (pour l'ID)
      .single();

    if (saveError) {
      alert("Erreur lors de la sauvegarde.");
      console.error(saveError);
    } else {
      alert("Projet sauvegardé avec succès !");
      // On ajoute l'objet sauvegardé (avec le vrai ID de la base de données)
      setProjects([savedProject as Project, ...projects]);
    }
  };

  // Handler Chargement (ne change pas)
  const handleLoadProject = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = Number(e.target.value);
    const foundProject = projects.find(p => p.id === projectId);

    if (foundProject && foundProject.gantt_data) {
      setInputText(foundProject.gantt_data);
      if (ganttInstanceRef.current) {
        const newTasks = parseInputToTasks(foundProject.gantt_data);
        ganttInstanceRef.current.refresh(newTasks);
      }
    }
  };

  // ------------------------------------------
  // RENDU FINAL
  // ------------------------------------------
  
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-12">
        <p className="text-white">Chargement...</p>
      </main>
    );
  }

  // Rendu de la Vitrine (si déconnecté)
  if (!session) {
    // ... (votre code de vitrine ne change pas)
    return (
        <main className="flex min-h-screen flex-col items-center p-12 pt-32 pb-24">
            <Header />
          
          {/* --- 1. "Hero Section" --- */}
          <section className="flex flex-col items-center text-center max-w-3xl">
            <h1 className="text-6xl font-bold mb-6">
              Créez des diagrammes de GANTT
              <br />
              <span className="text-blue-500">en quelques secondes.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10">
              Notre outil simplifie la gestion de projet. Entrez vos tâches en texte brut,
              visualisez instantanément votre planning et sauvegardez vos projets
              dans le cloud avec notre offre Pro.
            </p>
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-md text-lg hover:bg-blue-700 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </section>

          {/* --- 2. Section "Fonctionnalités" --- */}
          <section className="w-full max-w-5xl mt-24">
            <h2 className="text-4xl font-bold text-center mb-12">
              Tout ce qu'il vous faut, sans le superflu.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              
              {/* Fonctionnalité 1 */}
              <div className="flex flex-col items-center">
                <p className="text-4xl mb-3">⚡️</p>
                <h3 className="text-2xl font-semibold mb-2">Ultra Rapide</h3>
                <p className="text-gray-400">
                  Pas de chargement, pas de menus complexes. Écrivez en texte brut,
                  votre GANTT se met à jour instantanément.
                </p>
              </div>

              {/* Fonctionnalité 2 */}
              <div className="flex flex-col items-center">
                <p className="text-4xl mb-3">💾</p>
                <h3 className="text-2xl font-semibold mb-2">Sauvegarde "Pro"</h3>
                <p className="text-gray-400">
                  Ne perdez jamais votre travail. Notre offre Pro vous permet de
                  sauvegarder et charger vos projets depuis le cloud.
                </p>
              </div>

              {/* Fonctionnalité 3 */}
              <div className="flex flex-col items-center">
                <p className="text-4xl mb-3">🔗</p>
                <h3 className="text-2xl font-semibold mb-2">Dépendances Simples</h3>
                <p className="text-gray-400">
                  Reliez vos tâches avec une syntaxe simple (`$tache1`) pour
                  visualiser les dépendances de votre projet.
                </p>
              </div>
              
            </div>
          </section>

          {/* --- 3. La Section "Tarifs" --- */}
          <section className="w-full max-w-4xl mt-24">
            <h2 className="text-4xl font-bold text-center mb-12">
              Un tarif simple et transparent.
            </h2>
            
            <div className="flex flex-col md:flex-row justify-center gap-8">

              {/* Carte "Gratuit" */}
              <div className="w-full md:w-1/2 lg:w-1/3 border border-gray-700 rounded-lg p-8 flex flex-col">
                <h3 className="text-2xl font-semibold mb-4">Gratuit</h3>
                <p className="text-5xl font-bold mb-4">0 €</p>
                <p className="text-gray-400 mb-6">Pour les projets rapides</p>
                <ul className="space-y-2 mb-8 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Générateur de GANTT
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Parser de texte
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Dépendances simples
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link
                    href="/login"
                    className="w-full block text-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Commencer
                  </Link>
                </div>
              </div>

              {/* Carte "Pro" (Mise en avant) */}
              <div className="w-full md:w-1/2 lg:w-1/3 border-2 border-blue-500 rounded-lg p-8 flex flex-col relative">
                <span className="absolute top-0 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  LE PLUS POPULAIRE
                </span>
                
                <h3 className="text-2xl font-semibold mb-4 text-blue-400">Pro</h3>
                <p className="text-5xl font-bold mb-4">5 €<span className="text-lg font-normal text-gray-400">/mois</span></p>
                <p className="text-gray-400 mb-6">Pour les pros organisés</p>
                <ul className="space-y-2 mb-8 text-gray-300">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> <span className="font-bold">Tout ce qui est gratuit</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Sauvegarde illimitée de projets
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Chargement des projets
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✔</span> Support prioritaire
                  </li>
                </ul>
                <div className="mt-auto">
                  <Link
                    href="/login"
                    className="w-full block text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Passer Pro
                  </Link>
                </div>
              </div>

            </div>
          </section>
        </main>
    );
  }

  // Rendu du Dashboard (si connecté)
  return (
    <div className="flex h-screen bg-black">
      
      {/* 1. Side Bar (Panneau de Contrôle) */}
      <div className="w-1/4 h-full">
        <Sidebar 
          inputText={inputText}
          setInputText={setInputText}
          projects={projects}
          handleLoadProject={handleLoadProject}
          handleGenerateGantt={handleGenerateGantt}
          handleSave={handleSave}
          isPro={isPro}
          userEmail={session!.user.email!}
          handleSignOut={handleSignOut}
        />
      </div>

      {/* 2. Zone GANTT Principal */}
      <main className="w-3/4 flex flex-col p-8 overflow-y-auto h-full">
        
        <h1 className="text-4xl font-bold mb-8 text-white">
          Tableau de Bord GANTT Pro
        </h1>

        <p className="mb-4 text-lg text-gray-400">
          Visualisation du GANTT généré :
        </p>

        {/* Le GANTT lui-même */}
        <div className="grow w-full border border-gray-700 rounded-lg p-4 bg-gray-900 overflow-hidden">
          <svg ref={ganttContainerRef} className="w-full h-full"></svg> 
        </div>

      </main>
    </div>
  );
}