'use client'; 

// --- IMPORTS ---
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { BarChart3, Trash2 } from 'lucide-react'; 
import type { Database } from '../types_db';
import type { Project } from '../utils/appTypes'; 
import { useSupabase } from '../components/SupabaseProvider'; 
import type { Session } from '@supabase/supabase-js'; 
import { useSearchParams, useRouter } from 'next/navigation';
import LandingLayout from '../components/LandingLayout';
import Sidebar from '../components/Sidebar';

// Type pour une tâche du GANTT
interface GanttTask {
  id: number;
  name: string;
  start: string;
  end: string;
  color: string;
}

// Type pour un Projet sauvegardé
type SavedProject = Database['public']['Tables']['projects']['Row'];

function HomeContent() {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- ÉTATS DE L'APPLICATION ---
  const [currentProjectName, setCurrentProjectName] = useState("Nouveau Projet");
  // NOUVEAU : On stocke l'ID pour savoir si on met à jour ou si on crée
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null); 

  const [tasks, setTasks] = useState<GanttTask[]>([
    { id: 1, name: "Exemple: Analyse", start: "2025-11-20", end: "2025-11-23", color: "bg-blue-500" },
  ]);
  
  // États pour la Sidebar
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isPro, setIsPro] = useState(false); 

  // État pour le formulaire d'ajout manuel
  const [newTask, setNewTask] = useState({
    name: "",
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutTriggered = useRef(false);

  // ---------------------------------------------------------
  // 1. LOGIQUE SUPABASE & CHARGEMENT
  // ---------------------------------------------------------

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserStatus(session.user.id);
      setLoading(false); 
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserStatus(session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const checkUserStatus = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('subscription_status').eq('id', userId).single();
      if (data && data.subscription_status === 'pro') {
          setIsPro(true);
      }
  };

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

  useEffect(() => {
    const fetchProjectList = async () => {
      if (!session) return;
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (data) setSavedProjects(data);
    };
    fetchProjectList();
  }, [session, supabase]);

  // --- ACTIONS ---

  const handleLoadProject = (projectId: any) => {
    const id = typeof projectId === 'string' ? parseInt(projectId) : projectId;
    const projectToLoad = savedProjects.find(p => p.id === id);
    
    if (projectToLoad && projectToLoad.gantt_data) {
        try {
            const loadedTasks = JSON.parse(projectToLoad.gantt_data);
            if (Array.isArray(loadedTasks)) {
                setTasks(loadedTasks);
                setCurrentProjectName(projectToLoad.project_name || "Projet Sans Nom");
                setCurrentProjectId(id); // IMPORTANT : On retient l'ID du projet chargé
            }
        } catch (e) {
            alert("Erreur lors de la lecture des données du projet.");
        }
    }
  };

  const handleSave = async () => {
      if (!session?.user) return;

      if (!isPro) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.access_token) return alert("Erreur session.");
        
        fetch('/api/stripe/create-checkout', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` }
        })
        .then((res) => res.json())
        .then((data) => { if (data.url) window.location.href = data.url; })
        .catch((e) => alert('Erreur paiement.'));
        return;
      }

      // On demande le nom (pré-rempli) pour confirmer ou renommer
      const projectName = window.prompt("Nom du projet :", currentProjectName);
      if (!projectName) return;
      setCurrentProjectName(projectName);

      let error, savedProject;

      if (currentProjectId) {
          // --- CAS 1 : MISE À JOUR (UPDATE) ---
          const response = await supabase
            .from('projects')
            .update({ 
                gantt_data: JSON.stringify(tasks), 
                project_name: projectName 
            })
            .eq('id', currentProjectId)
            .select()
            .single();
          
          error = response.error;
          savedProject = response.data;

      } else {
          // --- CAS 2 : CRÉATION (INSERT) ---
          const response = await supabase
            .from('projects')
            .insert({ 
                user_id: session.user.id, 
                gantt_data: JSON.stringify(tasks), 
                project_name: projectName 
            })
            .select()
            .single();

          error = response.error;
          savedProject = response.data;
      }

      if (error) {
          alert(`Erreur sauvegarde : ${error.message}`);
      } else {
          alert(currentProjectId ? "Projet mis à jour !" : "Nouveau projet créé !");
          
          if (savedProject) {
              if (currentProjectId) {
                  // On met à jour la liste locale sans recharger
                  setSavedProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
              } else {
                  // On ajoute le nouveau projet à la liste
                  setSavedProjects([savedProject, ...savedProjects]);
                  // On passe en mode "édition" de ce nouveau projet
                  setCurrentProjectId(savedProject.id); 
              }
          }
      }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name || !newTask.start || !newTask.end) return;
    if (new Date(newTask.end) < new Date(newTask.start)) {
      alert("La fin doit être après le début !"); return;
    }
    const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setTasks([...tasks, { ...newTask, id: Date.now(), color: randomColor }]);
    setNewTask({ ...newTask, name: "" }); 
  };

  const handleDeleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  // ---------------------------------------------------------
  // 3. LOGIQUE GANTT (Calculs dates)
  // ---------------------------------------------------------

  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 14);
      return { start: today, end: nextWeek };
    }
    const startDates = tasks.map(t => new Date(t.start));
    const endDates = tasks.map(t => new Date(t.end));
    const minDate = new Date(Math.min(...startDates as any));
    minDate.setDate(minDate.getDate() - 2); 
    const maxDate = new Date(Math.max(...endDates as any));
    maxDate.setDate(maxDate.getDate() + 5);
    return { start: minDate, end: maxDate };
  }, [tasks]);

  const allDays = useMemo(() => {
    const days = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [dateRange]);

  const months = useMemo(() => {
    const groups: any[] = [];
    if (allDays.length === 0) return groups;
    let currentMonth = allDays[0].getMonth();
    let currentYear = allDays[0].getFullYear();
    let count = 0;
    allDays.forEach((day) => {
      if (day.getMonth() === currentMonth && day.getFullYear() === currentYear) {
        count++;
      } else {
        groups.push({
          key: `${currentYear}-${currentMonth}`,
          count: count,
          label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth))
        });
        currentMonth = day.getMonth();
        currentYear = day.getFullYear();
        count = 1;
      }
    });
    groups.push({
      key: `${currentYear}-${currentMonth}`,
      count: count,
      label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth))
    });
    return groups;
  }, [allDays]);

  const formatDateFr = (date: Date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(date);
  const formatDateFull = (date: Date) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date);
  const getDayName = (date: Date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
  
  const getDurationInDays = (start: string, end: string) => {
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getOffsetInDays = (globalStart: Date, taskStart: string) => {
    const diffTime = new Date(taskStart).getTime() - globalStart.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // ---------------------------------------------------------
  // 4. RENDU
  // ---------------------------------------------------------

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Chargement...</div>;
  if (!session) return <LandingLayout />;

  const cellWidth = 40;
  const leftColumnWidth = 250;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 p-4 shadow-sm z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            {currentProjectName}
          </h1>
        </div>
        
        <div className="flex gap-3">
           <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-sm shadow-sm transition-colors flex items-center gap-2">
              Sauvegarder
           </button>
           <button onClick={handleSignOut} className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-md text-sm transition-colors">
              Déconnexion
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        <aside className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0 z-10 flex flex-col h-full">
            <Sidebar 
                // Props pour le formulaire manuel
                newTask={newTask}
                setNewTask={setNewTask}
                handleAddTask={handleAddTask}

                projects={savedProjects as any} 
                handleLoadProject={handleLoadProject}
                handleSave={handleSave}
                isPro={isPro}
                userEmail={session.user.email || ''}
                handleSignOut={handleSignOut}
            />
        </aside>

        {/* VISUALISATION GANTT */}
        <section className="flex-1 overflow-auto bg-slate-100 relative">
          <div className="min-w-max p-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative select-none">
              
              {/* ENTÊTE CALENDRIER */}
              <div className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                <div className="flex border-b border-slate-200">
                   <div className="shrink-0 border-r border-slate-200 bg-slate-50" style={{ width: leftColumnWidth }}></div>
                   <div className="flex">
                      {months.map((m: any, i: number) => (
                        <div key={i} className="shrink-0 border-r border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center justify-center uppercase tracking-wider" style={{ width: m.count * cellWidth, height: 32 }}>
                          {m.label}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="flex border-b border-slate-200">
                  <div className="shrink-0 border-r border-slate-200 bg-slate-50 p-3 font-bold text-slate-500 text-sm flex items-center justify-center" style={{ width: leftColumnWidth }}>
                    Tâches
                  </div>
                  <div className="flex">
                    {allDays.map((day, i) => {
                       const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                       return (
                        <div key={i} className={`shrink-0 border-r border-slate-100 flex flex-col items-center justify-center text-xs ${isWeekend ? 'bg-slate-50/50 text-slate-400' : 'bg-white'}`} style={{ width: cellWidth, height: 40 }}>
                          <span className="font-bold text-slate-700">{formatDateFr(day).split('/')[0]}</span>
                          <span className="text-[10px] uppercase">{getDayName(day)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CORPS GANTT */}
              <div className="relative">
                {/* Grille de fond */}
                <div className="absolute inset-0 flex pointer-events-none" style={{ paddingLeft: leftColumnWidth }}>
                   {allDays.map((day, i) => {
                     const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                     return (
                      <div key={`grid-${i}`} className={`shrink-0 border-r border-slate-100 h-full ${isWeekend ? 'bg-slate-50/50' : ''}`} style={{ width: cellWidth }} />
                    );
                   })}
                </div>

                {/* Liste des Tâches */}
                {tasks.map(task => {
                  const offsetDays = getOffsetInDays(dateRange.start, task.start);
                  const durationDays = getDurationInDays(task.start, task.end);
                  
                  return (
                    <div key={task.id} className="flex border-b border-slate-100 hover:bg-blue-50/30 transition relative group h-12">
                      <div className="shrink-0 border-r border-slate-200 p-3 text-sm font-medium text-slate-700 truncate bg-white/95 sticky left-0 z-10 flex items-center justify-between" style={{ width: leftColumnWidth }}>
                        <span className="truncate pr-2" title={task.name}>{task.name}</span>
                        {/* Bouton Supprimer */}
                        <button onClick={() => handleDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grow relative">
                        <div 
                          className={`absolute top-2 h-8 rounded shadow-sm border border-white/20 ${task.color} hover:brightness-110 transition cursor-pointer flex items-center px-2 text-white text-xs font-medium overflow-hidden whitespace-nowrap`}
                          style={{
                            left: offsetDays * cellWidth,
                            width: durationDays * cellWidth,
                          }}
                          title={`${task.name} (${formatDateFull(new Date(task.start))} - ${formatDateFull(new Date(task.end))})`}
                        >
                          {durationDays > 1 && task.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {tasks.length === 0 && (
                  <div className="p-10 text-center text-slate-400">
                    Utilisez le menu à gauche pour ajouter une tâche manuellement.
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default function Home() {
    return (
        <Suspense>
            <HomeContent />
        </Suspense>
    );
}