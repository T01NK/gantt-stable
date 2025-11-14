'use client'; 

// --- IMPORTS ---
import { useEffect, useRef, useState, Suspense } from 'react';
import type { Task } from 'frappe-gantt'; 
import type { Database } from '../types_db';
import type { Project } from '../utils/appTypes'; 
import { useSupabase } from '../components/SupabaseProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import LandingLayout from '../components/LandingLayout';
import Sidebar from '../components/Sidebar';

// --- LE COMPOSANT D'APPLICATION PRINCIPAL ---
function HomeContent() {
  // --- Références et États ---
  const ganttContainerRef = useRef<SVGSVGElement | null>(null);
  const ganttInstanceRef = useRef<any | null>(null); // Stocke l'instance GANTT

  const [inputText, setInputText] = useState(
    "t1, Idée initiale, 2025-11-20, 2025-11-25\n" +
    "  t2, Prototype (dépend de 1), 2025-11-22, 2025-11-29, $t1\n"
  );
  
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isPro, setIsPro] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutTriggered = useRef(false);

  // ------------------------------------------
  // EFFETS ET LOGIQUE DE BASE
  // ------------------------------------------

  // Effect 1: Gérer la session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); 
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);


  // Effect 2: Gérer la redirection Stripe (?plan=pro)
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'pro' && session && !loading && !checkoutTriggered.current) {
      checkoutTriggered.current = true;
      supabase.from('profiles').select('subscription_status').eq('id', session.user.id).single()
        .then(({ data: profile }) => {
          if (profile && profile.subscription_status === 'free') {
            fetch('/api/stripe/create-checkout', { method: 'POST' })
              .then((res) => res.json()).then((data) => { if (data.url) { router.replace('/'); window.location.href = data.url; }})
              .catch((e) => { console.error(e); });
          } else if (profile && profile.subscription_status === 'pro') {
            router.replace('/');
          }
        });
    }
  }, [session, loading, searchParams, supabase, router]);


  // Effect 3: Charger les projets et le statut Pro
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('subscription_status').eq('id', session.user.id).single();
      if (profile) { setIsPro(profile.subscription_status === 'pro'); }
      const { data, error } = await supabase.from('projects').select('id, project_name, gantt_data').order('created_at', { ascending: false });
      if (error) { console.error("Erreur chargement projets :", error); } 
      else if (data) { setProjects(data as Project[]); }
    };
    fetchUserData();
  }, [session, supabase]);


  // --- CORRECTION DU BUG GANTT (FINALE) ---
  // Effect 4/5: Gérer la CRÉATION et la MISE À JOUR du GANTT
  useEffect(() => {
    // Ne rien faire si la session n'est pas chargée ou si le conteneur SVG n'est pas prêt
    if (!session || !ganttContainerRef.current) {
      return;
    }

    const tasks = parseInputToTasks(inputText);

    // Cas 1: L'instance GANTT n'existe pas encore. On la CRÉE.
    // Cas 1: L'instance GANTT n'existe pas encore. On la CRÉE.
    if (!ganttInstanceRef.current) {
      import('frappe-gantt').then((GanttModule) => {
        // Vérifier à nouveau au cas où l'utilisateur se déconnecte pendant l'import
        if (!ganttContainerRef.current) return; 

        const FrappeGantt = GanttModule.default;
        
        // Vider le conteneur SVG (sécurité anti-doublon)
        ganttContainerRef.current!.innerHTML = ''; 

        const gantt = new FrappeGantt(ganttContainerRef.current!, tasks, {
          header_height: 50, bar_height: 20, step: 24,
          view_modes: ['Day', 'Week', 'Month'], bar_corner_radius: 3,
        });
        
        // On stocke l'instance
        ganttInstanceRef.current = gantt;

        // --- CORRECTION CLÉ ICI : FORCER LE PREMIER AFFICHAGE AVEC DÉLAI ---
        setTimeout(() => {
            if(ganttInstanceRef.current) {
                ganttInstanceRef.current.refresh(tasks);
            }
        }, 50); // Seulement 50ms suffisent
      });
    } 
    // Cas 2: L'instance GANTT existe DÉJÀ. On la RAFRAÎCHIT.
    // (Le code ici ne change pas, c'était déjà le bon fix)
    else { 
      ganttInstanceRef.current.refresh(tasks);
      setTimeout(() => {
        if (ganttInstanceRef.current) {
          ganttInstanceRef.current.refresh(tasks);
        }
      }, 100);
    }

  // Ce 'useEffect' se redéclenche si la session OU le texte change.
  }, [session, inputText]); 
  
  // Fonction de nettoyage (pour la déconnexion / rechargement)
  useEffect(() => {
    return () => {
      if (ganttInstanceRef.current) {
        if (ganttContainerRef.current) {
          ganttContainerRef.current.innerHTML = ''; 
        }
        ganttInstanceRef.current = null;
      }
    };
  }, []); // Ce cleanup ne s'exécute qu'une fois (au démontage)
  
  // --- FIN CORRECTION BUG GANTT ---


  // ------------------------------------------
  // FONCTIONS (PARSER/HANDLER)
  // ------------------------------------------

  // Fonction de Parsing (ne change pas)
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
      const newTask: Task = { id, name, start, end, progress: 0, dependencies };
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

  // Handler GANTT (simple)
  const handleGenerateGantt = () => {
    // Met simplement à jour 'inputText', l'Effect 4/5 s'occupe du reste.
    // (Cette ligne est subtile : elle force un re-render qui redéclenche l'Effect 5)
    setInputText(inputText + " "); 
    setInputText(inputText);
    // Note: C'est un "hack" pour forcer le refresh. 
    // Une meilleure méthode est juste de rafraîchir directement :
    if (ganttInstanceRef.current) {
      const newTasks = parseInputToTasks(inputText);
      ganttInstanceRef.current.refresh(newTasks);
    }
  };
  
  // Handler Déconnexion (simple)
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Handler Sauvegarde (ne change pas)
  const handleSave = async () => {
    if (!session?.user) { alert("Erreur : Utilisateur non trouvé."); return; }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('subscription_status').eq('id', session.user.id).single();
    if (profileError) { alert("Erreur lors de la vérification de votre profil."); console.error(profileError); return; }
    if (profile.subscription_status === 'free') {
      fetch('/api/stripe/create-checkout', { method: 'POST' })
        .then((res) => res.json()).then((data) => { if (data.url) { window.location.href = data.url; }})
        .catch((e) => { console.error(e); alert('Erreur lors de la création du paiement.'); });
      return;
    }
    const projectName = window.prompt("Comment voulez-vous nommer ce projet ?", "Nouveau Projet GANTT");
    if (!projectName || projectName.trim() === "") { alert("Sauvegarde annulée."); return; }
    alert("Vous êtes Pro ! Sauvegarde en cours...");
    const { error: saveError, data: savedProject } = await supabase
      .from('projects').insert({ user_id: session.user.id, gantt_data: inputText, project_name: projectName }).select().single();
    if (saveError) { alert("Erreur lors de la sauvegarde."); console.error(saveError); } 
    else {
      alert("Projet sauvegardé avec succès !");
      setProjects([savedProject as Project, ...projects]);
    }
  };

  // Handler Chargement (simple)
  const handleLoadProject = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = Number(e.target.value);
    const foundProject = projects.find(p => p.id === projectId);
    if (foundProject && foundProject.gantt_data) {
      // Met à jour le texte. L'Effect 4/5 (ci-dessus) s'occupera du rafraîchissement.
      setInputText(foundProject.gantt_data);
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
      <main className="w-3/4 flex flex-col p-8 overflow-y-auto h-full relative">
        
        <button
          onClick={handleSignOut}
          className="absolute top-8 right-8 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 text-sm"
        >
          Se Déconnecter
        </button>
        
        <h1 className="text-4xl font-bold mb-8 text-white">
          Tableau de Bord GANTT Pro
        </h1>

        <p className="mb-4 text-lg text-gray-400">
          Visualisation du GANTT généré :
        </p>

        {/* Le GANTT lui-même (avec le fix de hauteur) */}
        <div className="w-full border border-gray-700 rounded-lg p-4 bg-gray-900 relative overflow-hidden" style={{ height: '80vh' }}>
          <svg ref={ganttContainerRef} className="w-full h-full"></svg>
        </div>

      </main>
    </div>
  );
}

// L'export final avec <Suspense> pour corriger le bug de déploiement
export default function Home() {
    return (
        <Suspense>
            <HomeContent />
        </Suspense>
    );
}