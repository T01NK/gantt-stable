'use client'; 

// --- IMPORTS ---
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { Plus, Trash2, Calendar, BarChart3, Sparkles, Loader2, FolderOpen, X, ChevronDown, ChevronUp } from 'lucide-react'; 
import type { Task } from 'frappe-gantt'; 
import type { Database } from '../types_db';
import type { Project } from '../utils/appTypes'; // Ligne 6
import { useSupabase } from '../components/SupabaseProvider'; // Ligne 7
import type { Session } from '@supabase/supabase-js'; // Ligne 8 (Le coupable présumé)
import { useSearchParams, useRouter } from 'next/navigation';
import LandingLayout from '../components/LandingLayout';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

// Type pour une tâche du GANTT
interface GanttTask {
  id: number;
  name: string;
  start: string;
  end: string;
  color: string;
}

// Type pour un Projet sauvegardé (depuis la DB)
type SavedProject = Database['public']['Tables']['projects']['Row'];

function HomeContent() {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- ÉTATS DE L'APPLICATION ---
  const [currentProjectName, setCurrentProjectName] = useState("Nouveau Projet");
  const [tasks, setTasks] = useState<GanttTask[]>([
    { id: 1, name: "Exemple: Analyse", start: "2025-11-20", end: "2025-11-23", color: "bg-blue-500" },
  ]);
  
  // Liste des projets sauvegardés (pour le menu déroulant)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  // --- NOUVEAU : État pour le menu déroulant personnalisé ---
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  // État pour la nouvelle tâche
  const [newTask, setNewTask] = useState({
    name: "",
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
  });

  // États IA (Réintégration)
  const [projectGoal, setProjectGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutTriggered = useRef(false);


  // ---------------------------------------------------------
  // 1. LOGIQUE SUPABASE & CHARGEMENT
  // ---------------------------------------------------------

  // Gestion Session
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

  // Gestion Redirection Pro (Inchangée)
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

  // Chargement de la LISTE des projets au démarrage
  useEffect(() => {
    const fetchProjectList = async () => {
      if (!session) return;
      
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setSavedProjects(data);
      }
    };
    fetchProjectList();
  }, [session, supabase]);

  // --- FONCTION DE CHARGEMENT D'UN PROJET ---
  const handleLoadProject = (projectId: number) => {
    const projectToLoad = savedProjects.find(p => p.id === projectId);
    
    if (projectToLoad && projectToLoad.gantt_data) {
        try {
            const loadedTasks = JSON.parse(projectToLoad.gantt_data);
            if (Array.isArray(loadedTasks)) {
                setTasks(loadedTasks);
                setCurrentProjectName(projectToLoad.project_name || "Projet Sans Nom");
            }
        } catch (e) {
            alert("Erreur lors de la lecture des données du projet.");
        }
    }
  };

  // --- FONCTION DE SUPPRESSION D'UN PROJET ---
  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!session?.user || !window.confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projectName}" ?`)) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', session.user.id);

    if (error) {
      alert("Erreur lors de la suppression du projet.");
    } else {
      // Met à jour la liste des projets sauvegardés
      setSavedProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Si le projet supprimé était celui affiché, on réinitialise l'interface
      if (savedProjects.find(p => p.id === projectId)?.project_name === currentProjectName) {
        setTasks([{ id: Date.now(), name: "Nouveau Projet - Commencez ici", start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0], color: "bg-blue-500" }]);
        setCurrentProjectName("Nouveau Projet");
      }
      alert("Projet supprimé avec succès !");
    }
  };


  // --- FONCTION DE SAUVEGARDE (Inchangée) ---
  // Dans app/page.tsx

  // ... les autres états ...

    // Sauvegarde (Version de débogage)
    const handleSave = async () => {
      console.log("--- DÉBUT DU PROCESSUS DE SAUVEGARDE ---");

      // 1. Vérification de la session
      if (!session?.user) {
        console.error("ERREUR BLOQUANTE : Aucune session utilisateur active.");
        alert("Erreur : Vous ne semblez pas connecté.");
        return;
      } 
      console.log("1. Session OK. Utilisateur ID :", session.user.id);

      // 2. Vérification du statut Pro (Paywall)
      console.log("2. Tentative de récupération du profil pour vérifier le statut...");
      // On utilise maybeSingle() pour ne pas lever d'erreur si le profil n'existe pas encore
      const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .maybeSingle();

      if (profileError) {
          console.error("ERREUR lors de la récupération du profil :", profileError.message);
          alert("Erreur technique lors de la vérification du profil.");
          return;
      }

      // C'EST SOUVENT ICI QUE ÇA BLOQUE AVEC GOOGLE :
      if (!profile) {
          console.error("ERREUR BLOQUANTE : Profil introuvable dans la table 'public.profiles'.");
          console.warn("Hypothèse : Le trigger de création de profil automatique n'a pas fonctionné pour cet utilisateur Google.");
          alert("Erreur : Votre profil utilisateur est incomplet en base de données.");
          return;
      }
      console.log("2. Profil trouvé. Statut abonnement :", profile.subscription_status);


      if (profile.subscription_status === 'free') {
        console.log("Statut 'free' détecté. Redirection vers Stripe...");
        
        // --- MODIFICATION ICI : On récupère le token d'accès ---
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession?.access_token) {
            alert("Erreur : Impossible de récupérer votre session pour le paiement.");
            return;
        }

        // On envoie le token dans le header "Authorization"
        fetch('/api/stripe/create-checkout', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentSession.access_token}`, // <--- LA CLÉ DU SUCCÈS
            }
        })
        .then((res) => res.json())
        .then((data) => { 
            if (data.url) { 
                window.location.href = data.url; 
            } else {
                console.error("Erreur Stripe retour:", data);
                alert("Erreur lors de la création du paiement.");
            }
        })
        .catch((e) => { console.error("Erreur Stripe:", e); alert('Erreur paiement.'); });
        
        return;
      }

      // 3. Demande du nom
      console.log("3. Statut Pro OK. Demande du nom du projet...");
      const projectName = window.prompt("Nom du projet :", currentProjectName);
      if (!projectName) {
          console.log("Annulation par l'utilisateur (pas de nom entré).");
          return;
      }

      // 4. Insertion Supabase
      console.log(`4. Tentative d'insertion du projet "${projectName}" dans la DB...`);
      setCurrentProjectName(projectName);

      const { error: saveError, data: savedProject } = await supabase
        .from('projects')
        .insert({
          user_id: session.user.id,
          gantt_data: JSON.stringify(tasks),
          project_name: projectName
        })
        .select()
        .single();

      if (saveError) {
        console.error("ERREUR FATALE lors de l'insertion Supabase :", saveError.message, saveError.details);
        alert(`Erreur sauvegarde : ${saveError.message}`);
      }
      else {
          console.log("--- SUCCÈS : PROJET SAUVEGARDÉ ! ---", savedProject);
          alert("Projet sauvegardé avec succès !");
          if (savedProject) setSavedProjects([savedProject, ...savedProjects]);
      }
    };
  // ... suite du code ...
  
  const handleSignOut = async () => { await supabase.auth.signOut(); };


  // ---------------------------------------------------------
  // 2. LOGIQUE IA (Réintégration)
  // ---------------------------------------------------------

  const handleGenerateGanttAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectGoal.trim()) {
      setAiError("Veuillez décrire votre objectif de projet.");
      return;
    }
    
    // --- SIMULATION IA ---
    setIsGenerating(true);
    setAiError(null);
    setCurrentProjectName(projectGoal.length > 50 ? projectGoal.substring(0, 50) + "..." : projectGoal);

    setTimeout(() => {
        setIsGenerating(false);
        // Exemple de tâches générées
        const generatedTasks: GanttTask[] = [
            { id: Date.now() + 1, name: "Étape 1: Analyse du besoin", start: "2025-12-01", end: "2025-12-03", color: "bg-fuchsia-500" },
            { id: Date.now() + 2, name: "Étape 2: Développement du prototype", start: "2025-12-04", end: "2025-12-10", color: "bg-orange-500" },
            { id: Date.now() + 3, name: "Étape 3: Tests et livraison", start: "2025-12-11", end: "2025-12-15", color: "bg-indigo-500" },
        ];
        setTasks(generatedTasks);
        setProjectGoal(""); // Nettoyer l'entrée
        alert("Gantt généré par IA (Simulation) ! N'oubliez pas de Sauvegarder !");
    }, 2000);
  };

  // ---------------------------------------------------------
  // 3. LOGIQUE GANTT & CALCULS (Inchangée)
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


  // ---------------------------------------------------------
  // 4. RENDU
  // ---------------------------------------------------------

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Chargement...</div>;
  if (!session) return <LandingLayout />;

  const cellWidth = 40;
  const leftColumnWidth = 250;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER APPLICATION */}
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
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 z-10 flex flex-col gap-8">
  
          {/* --- BLOC UNIFIÉ : GESTION MANUELLE & PROJETS --- */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            
            {/* 1. AJOUT MANUEL (Toujours en haut) */}
            <div className="mb-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nouvelle Tâche
              </h2>
              <form onSubmit={handleAddTask} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nom</label>
                  <input 
                    type="text" 
                    value={newTask.name} 
                    onChange={e => setNewTask({...newTask, name: e.target.value})} 
                    placeholder="Ex: Réunion..." 
                    className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Début</label>
                    <input 
                      type="date" 
                      value={newTask.start} 
                      onChange={e => setNewTask({...newTask, start: e.target.value})} 
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fin</label>
                    <input 
                      type="date" 
                      value={newTask.end} 
                      onChange={e => setNewTask({...newTask, end: e.target.value})} 
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" 
                      required 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm shadow-sm">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </form>
            </div>

            {/* SÉPARATEUR */}
            <div className="border-t border-slate-200 my-4"></div>

            {/* 2. MES PROJETS (MENU DÉROULANT INTELLIGENT) */}
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Mes Projets
              </h2>
              
              <div className="relative">
                {/* LE BOUTON DÉCLENCHEUR (Ressemble à un Select) */}
                <button 
                    onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg flex justify-between items-center text-sm text-slate-700 hover:border-blue-400 transition shadow-sm"
                >
                    <span className="truncate">
                        {savedProjects.length > 0 ? "Gérer mes projets..." : "Aucun projet"}
                    </span>
                    {isProjectMenuOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {/* LA LISTE DÉROULANTE (Apparaît par dessus) */}
                {isProjectMenuOpen && savedProjects.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {savedProjects.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group">
                                {/* Zone de clic pour charger (prend toute la place dispo) */}
                                <button 
                                    onClick={() => {
                                        handleLoadProject(p.id);
                                        setIsProjectMenuOpen(false); // Ferme le menu après choix
                                    }}
                                    className="flex-1 text-left text-sm text-slate-700 truncate font-medium pr-2"
                                    title={`Charger ${p.project_name}`}
                                >
                                    {p.project_name}
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                        {new Date(p.created_at).toLocaleDateString()}
                                    </span>
                                </button>

                                {/* Bouton Supprimer (Rouge au survol) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Empêche de charger le projet quand on clique sur supprimer
                                        handleDeleteProject(p.id, p.project_name || "Projet");
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                    title="Supprimer définitivement"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            </div>

          </div>
          
          {/* --- SECTION IA --- */}
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-700">
                <Sparkles className="w-5 h-5 text-blue-500" /> Générer par IA
            </h2>
            <form onSubmit={handleGenerateGanttAI} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Objectif du projet</label>
                    <textarea 
                        value={projectGoal} 
                        onChange={e => setProjectGoal(e.target.value)} 
                        placeholder="Ex: Créer une application mobile..." 
                        rows={3}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none" 
                        required 
                    />
                </div>
                {aiError && <p className="text-red-500 text-xs">{aiError}</p>}
                <button 
                    type="submit" 
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    disabled={isGenerating}
                >
                    {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</> : <><Sparkles className="w-4 h-4" /> Générer GANTT par IA</>}
                </button>
            </form>
          </div>

        </aside>

        {/* VISUALISATION GANTT */}
        <section className="flex-1 overflow-auto bg-slate-100 relative">
          <div className="min-w-max p-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative select-none">
              
              {/* ENTÊTE */}
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

              {/* CORPS */}
              <div className="relative">
                {/* Grille */}
                <div className="absolute inset-0 flex pointer-events-none" style={{ paddingLeft: leftColumnWidth }}>
                   {allDays.map((day, i) => {
                     const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                     return (
                      <div key={`grid-${i}`} className={`shrink-0 border-r border-slate-100 h-full ${isWeekend ? 'bg-slate-50/50' : ''}`} style={{ width: cellWidth }} />
                    );
                   })}
                </div>

                {/* Barres */}
                {tasks.map(task => {
                  const offsetDays = getOffsetInDays(dateRange.start, task.start);
                  const durationDays = getDurationInDays(task.start, task.end);
                  
                  return (
                    <div key={task.id} className="flex border-b border-slate-100 hover:bg-blue-50/30 transition relative group h-12">
                      <div className="shrink-0 border-r border-slate-200 p-3 text-sm font-medium text-slate-700 truncate bg-white/95 sticky left-0 z-10 flex items-center justify-between" style={{ width: leftColumnWidth }}>
                        <span className="truncate pr-2" title={task.name}>{task.name}</span>
                        {/* Bouton Supprimer (directement sur la ligne du GANTT) */}
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
                    Utilisez le menu à gauche pour ajouter une tâche ou générer un projet par IA.
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