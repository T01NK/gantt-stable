'use client'; 

import { useEffect, useRef, useState, Suspense } from 'react';
import type { Task } from 'frappe-gantt'; 
import { useSupabase } from '../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import LandingLayout from '../components/LandingLayout';
import Sidebar from '../components/Sidebar';
import type { Project } from '../utils/appTypes';

// --- Le composant principal est renommé pour l'encapsulation ---
function HomeContent() {
  const ganttContainerRef = useRef<SVGSVGElement | null>(null);
  const ganttInstanceRef = useRef<any | null>(null);

  const [inputText, setInputText] = useState(
    "task1, Tâche Parente 1, 2025-11-05, 2025-11-08\n" +
    "  task2, Sous-tâche 1.1 (indentée), 2025-11-06, 2025-11-07\n" +
    "task3, Tâche Parente 2 (dépend de 1), 2025-11-09, 2025-11-12, $task1\n" +
    "task4, Tâche Parente 3, 2025-11-10, 2025-11-13\n" +
    "  task5, Sous-tâche 3.1, 2025-11-11, 2025-11-12, $task2"
  );
  
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isPro, setIsPro] = useState(false);

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

      // Définir isPro
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors du chargement des projets :", error);
      } else if (data) {
        setProjects(data as Project[]);
      }
    };

    fetchProjects();
  }, [session, supabase]);


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

        // Lancement initial + Fix du bug d'affichage
        if (ganttInstanceRef.current) {
          const tasksToRender = parseInputToTasks(inputText);
          ganttInstanceRef.current.refresh(tasksToRender);
        
          // Fix de redimensionnement :
          setTimeout(() => {
            ganttInstanceRef.current.refresh(tasksToRender);
          }, 200);
        }
        // --- FIN CORRECTION ---
      });
    }
  }, [session, ganttContainerRef, inputText]);


  // ------------------------------------------
  // FONCTIONS (PARSER/HANDLER)
  // ------------------------------------------

  // Fonction de Parsing
  const parseInputToTasks = (text: string): Task[] => {
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

  // Handler GANTT
  const handleGenerateGantt = () => {
    if (ganttInstanceRef.current && parseInputToTasks) {
      const newTasks = parseInputToTasks(inputText);
      ganttInstanceRef.current.refresh(newTasks);
    }
  };
  
  // Handler Déconnexion
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Handler Sauvegarde
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
      .select()
      .single();

    if (saveError) {
      alert("Erreur lors de la sauvegarde.");
      console.error(saveError);
    } else {
      alert("Projet sauvegardé avec succès !");
      setProjects([savedProject as Project, ...projects]);
    }
  };

  // Handler Chargement
  const handleLoadProject = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = Number(e.target.value);
    const foundProject = projects.find(p => p.id === projectId);

    //  setInputText(foundProject.gantt_data);
    //    const newTasks = parseInputToTasks(foundProject.gantt_data);
    //    ganttInstanceRef.current.refresh(newTasks);
    //  }
    //}
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
    return (
      <LandingLayout />
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
        <div className="grow w-full border border-gray-700 rounded-lg p-4 bg-gray-900 relative overflow-hidden">
          <svg ref={ganttContainerRef} className="w-full h-full"></svg>
        </div>

      </main>
    </div>
  );
}

// Le composant final EXPORTÉ
export default function Home() {
    return (
        <Suspense>
            <HomeContent />
        </Suspense>
    );
}