'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSupabase } from '../../components/SupabaseProvider';
import Sidebar from '../../components/Sidebar';
import { Trash2, AlertCircle, Info } from 'lucide-react';

// --- MOTEUR DE CALCUL PERT (Inchangé) ---
const calculatePERT = (tasks: any[]) => {
  if (tasks.length === 0) return { computedTasks: [], criticalPath: [], maxDuration: 0, hasCycle: false };

  let computed = tasks.map(t => ({
    ...t, es: 0, ef: 0, ls: Infinity, lf: Infinity, slack: 0, successors: [], level: 0
  }));

  const taskMap: any = {};
  computed.forEach(t => taskMap[t.id] = t);

  computed.forEach(t => {
    t.predecessors.forEach((predId: string) => {
      if (taskMap[predId]) {
        if (!taskMap[predId].successors) taskMap[predId].successors = [];
        taskMap[predId].successors.push(t.id);
      }
    });
  });

  // Passe Avant
  let changed = true; let iterations = 0; let hasCycle = false;
  const MAX_ITERATIONS = tasks.length + 5;
  while(changed) {
    if (iterations > MAX_ITERATIONS) { hasCycle = true; break; }
    changed = false; iterations++;
    computed.forEach(t => {
      let maxPredEF = 0; let maxLevel = -1;
      t.predecessors.forEach((predId: string) => {
        if (taskMap[predId]) {
          maxPredEF = Math.max(maxPredEF, taskMap[predId].ef);
          maxLevel = Math.max(maxLevel, taskMap[predId].level);
        }
      });
      const newES = maxPredEF; const newEF = newES + parseInt(t.duration || 0); const newLevel = maxLevel + 1;
      if (t.es !== newES || t.ef !== newEF || t.level !== newLevel) {
        t.es = newES; t.ef = newEF; t.level = newLevel; changed = true;
      }
    });
  }

  const projectDuration = Math.max(...computed.map(t => t.ef), 0);

  // Passe Arrière
  if (!hasCycle) {
    computed.forEach(t => {
      if (!t.successors || t.successors.length === 0) { t.lf = projectDuration; t.ls = t.lf - parseInt(t.duration || 0); }
    });
    changed = true; iterations = 0;
    while(changed) {
       if (iterations > MAX_ITERATIONS) break; changed = false; iterations++;
      computed.forEach(t => {
        if (t.successors && t.successors.length > 0) {
          let minSuccLS = Infinity;
          t.successors.forEach((succId: string) => { if (taskMap[succId]) minSuccLS = Math.min(minSuccLS, taskMap[succId].ls); });
          const newLF = minSuccLS; const newLS = newLF - parseInt(t.duration || 0);
          if (t.lf !== newLF || t.ls !== newLS) { t.lf = newLF; t.ls = newLS; changed = true; }
        }
      });
    }
  }

  const criticalPath: string[] = [];
  computed.forEach(t => {
    t.slack = t.ls - t.es;
    if (!hasCycle && t.slack === 0) { t.isCritical = true; criticalPath.push(t.id); } else { t.isCritical = false; }
  });

  return { computedTasks: computed, criticalPath, maxDuration: projectDuration, hasCycle };
};

// --- COMPOSANT PRINCIPAL ---

export default function PERTBuilder() {
  const supabase = useSupabase();
  const [session, setSession] = useState<any>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);

  // Données initiales (Démo)
  const [tasks, setTasks] = useState([
    { id: 'A', name: 'Analyse', duration: 3, predecessors: [] },
    { id: 'B', name: 'Design', duration: 2, predecessors: ['A'] },
    { id: 'C', name: 'Dev', duration: 5, predecessors: ['B'] },
  ]);

  const [newTask, setNewTask] = useState({ id: '', name: '', duration: 1, predecessors: '' });
  const [error, setError] = useState<string | null>(null);

  const { computedTasks, maxDuration, hasCycle, criticalPath } = useMemo(() => calculatePERT(tasks), [tasks]);

  // --- 1. CHARGEMENT SUPABASE ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if(session) checkUserStatus(session.user.id);
    });
    const fetchProjects = async () => {
        const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (data) setSavedProjects(data);
    };
    fetchProjects();
  }, [supabase]);

  const checkUserStatus = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('subscription_status').eq('id', userId).single();
    if (data && data.subscription_status === 'pro') setIsPro(true);
  };

  // --- 2. LOGIQUE DE CONVERSION GANTT -> PERT ---
  const handleLoadProject = (projectId: any) => {
    const id = parseInt(projectId);
    const project = savedProjects.find(p => p.id === id);
    if (!project) return;

    setCurrentProjectId(id);

    // Cas A : Il existe déjà une sauvegarde PERT pour ce projet
    if (project.pert_data) {
        try {
            setTasks(JSON.parse(project.pert_data));
            return;
        } catch (e) { console.error("Erreur lecture PERT data", e); }
    }

    // Cas B : Pas de PERT, on convertit le GANTT
    if (project.gantt_data) {
        try {
            const ganttTasks = JSON.parse(project.gantt_data);
            if (Array.isArray(ganttTasks)) {
                // Conversion intelligente
                const convertedTasks = ganttTasks.map((gt: any, index: number) => {
                    // Calcul durée
                    const start = new Date(gt.start);
                    const end = new Date(gt.end);
                    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    
                    return {
                        id: String.fromCharCode(65 + index), // A, B, C...
                        name: gt.name,
                        duration: duration > 0 ? duration : 1,
                        predecessors: index > 0 ? [String.fromCharCode(65 + index - 1)] : [] // On suppose une suite linéaire par défaut
                    };
                });
                setTasks(convertedTasks);
                alert(`Projet "${project.project_name}" importé du Gantt ! Les durées ont été calculées.`);
            }
        } catch (e) { alert("Erreur conversion Gantt vers PERT."); }
    }
  };

  const handleSave = async () => {
      if (!session?.user || !currentProjectId) {
          alert("Veuillez charger un projet existant avant de sauvegarder le PERT associé.");
          return;
      }
      
      const { error } = await supabase
        .from('projects')
        // @ts-ignore
        .update({ pert_data: JSON.stringify(tasks) }) // On sauvegarde dans la nouvelle colonne
        .eq('id', currentProjectId);

      if (error) alert("Erreur sauvegarde : " + error.message);
      else alert("Diagramme PERT sauvegardé et lié au projet !");
  };

  // --- 3. GESTION TÂCHES ---
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.id || !newTask.name) return;
    // @ts-ignore
    if (tasks.find(t => t.id === newTask.id)) { setError("ID existe déjà"); return; }
    const preds = newTask.predecessors ? newTask.predecessors.split(',').map(s => s.trim()).filter(s => s !== '') : [];
    // @ts-ignore
    setTasks([...tasks, { ...newTask, predecessors: preds, duration: parseInt(newTask.duration as any) }]);
    setNewTask({ id: '', name: '', duration: 1, predecessors: '' });
    setError(null);
  };

  const removeTask = (id: string) => {
    // @ts-ignore
    setTasks(tasks.filter(t => t.id !== id).map(t => ({ ...t, predecessors: t.predecessors.filter(p => p !== id) })));
  };

  const updateTask = (id: string, field: string, value: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (field === 'duration') return { ...t, duration: Math.max(1, parseInt(value) || 0) };
      if (field === 'predecessors') {
        const preds = value.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');
        // @ts-ignore
        return { ...t, predecessors: preds };
      }
      if (field === 'name') return { ...t, name: value };
      return t;
    }));
  };

  // --- RENDU SVG ---
  const renderGraph = () => {
    // @ts-ignore
    if (computedTasks.length === 0) return <div className="p-10 text-gray-400">Aucune tâche à afficher</div>;
    if (hasCycle) return ( <div className="text-red-500 flex flex-col items-center justify-center h-full"><AlertCircle size={48} /><h3 className="font-bold mt-2">Boucle détectée !</h3></div> );

    const nodeWidth = 140; const nodeHeight = 80; const xSpacing = 200; const ySpacing = 120; const padding = 50;
    const levels: any = {};
    // @ts-ignore
    computedTasks.forEach(t => { if (!levels[t.level]) levels[t.level] = []; levels[t.level].push(t); });

    const positions: any = {}; let maxLevel = 0; let maxTasksInLevel = 0;
    Object.keys(levels).forEach(lvl => {
      const levelTasks = levels[lvl]; maxLevel = Math.max(maxLevel, parseInt(lvl)); maxTasksInLevel = Math.max(maxTasksInLevel, levelTasks.length);
      levelTasks.forEach((t: any, index: number) => { positions[t.id] = { x: parseInt(lvl) * xSpacing + padding, y: index * ySpacing + padding }; });
    });

    const svgWidth = (maxLevel + 1) * xSpacing + padding; const svgHeight = maxTasksInLevel * ySpacing + padding;
    const taskMapForRender: any = {};
    // @ts-ignore
    computedTasks.forEach(t => taskMapForRender[t.id] = t);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker>
           <marker id="arrowhead-crit" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" /></marker>
        </defs>
        {/* @ts-ignore */}
        {computedTasks.map(t => ( t.predecessors.map(predId => {
            const startNode = positions[predId]; const endNode = positions[t.id]; if (!startNode || !endNode) return null;
            const isCriticalLink = t.isCritical && taskMapForRender[predId]?.isCritical && (taskMapForRender[predId].ef === t.es);
            const path = `M ${startNode.x + nodeWidth} ${startNode.y + nodeHeight / 2} C ${(startNode.x + nodeWidth + endNode.x) / 2} ${startNode.y + nodeHeight / 2}, ${(startNode.x + nodeWidth + endNode.x) / 2} ${endNode.y + nodeHeight / 2}, ${endNode.x} ${endNode.y + nodeHeight / 2}`;
            return <path key={`${predId}-${t.id}`} d={path} fill="none" stroke={isCriticalLink ? "#ef4444" : "#cbd5e1"} strokeWidth={isCriticalLink ? 3 : 2} markerEnd={isCriticalLink ? "url(#arrowhead-crit)" : "url(#arrowhead)"} />;
          })
        ))}
        {/* @ts-ignore */}
        {computedTasks.map(t => {
          const pos = positions[t.id]; if(!pos) return null;
          // Correction : criticalPath est bien utilisé ici
          const isCrit = criticalPath.includes(t.id);
          return (
            <g key={t.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect width={nodeWidth} height={nodeHeight} rx="8" fill={isCrit ? "#fef2f2" : "white"} stroke={isCrit ? "#ef4444" : "#e2e8f0"} strokeWidth={isCrit ? 2 : 1} className="shadow-sm transition-colors duration-300" />
              <path d={`M 0 30 L ${nodeWidth} 30`} stroke={isCrit ? "#fecaca" : "#f1f5f9"} />
              <text x="10" y="20" className="font-bold text-sm fill-slate-700">{t.id}</text>
               <text x="35" y="20" className="text-xs fill-slate-500 truncate" style={{maxWidth: '100px'}}>{t.name.length > 15 ? t.name.substring(0,12) + '...' : t.name}</text>
              <g transform="translate(0, 30)">
                <path d={`M ${nodeWidth/2} 0 L ${nodeWidth/2} ${nodeHeight-30}`} stroke="#f1f5f9" />
                <text x="5" y="15" className="text-[10px] fill-slate-400">Tôt: {t.es} → {t.ef}</text>
                <text x="5" y="30" className="text-[10px] fill-slate-400">Tard: {t.ls} → {t.lf}</text>
                <text x={nodeWidth/2 + 5} y="15" className="text-[10px] font-semibold fill-slate-600">Durée: {t.duration}</text>
                <text x={nodeWidth/2 + 5} y="30" className={`text-[10px] font-bold ${isCrit ? "fill-red-500" : "fill-green-500"}`}>Marge: {t.slack}</text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR EN MODE PERT */}
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <Sidebar 
                mode="pert" // ON ACTIVE LE MODE PERT
                newPertTask={newTask}
                setNewPertTask={setNewTask}
                handleAddTask={addTask}
                
                projects={savedProjects}
                handleLoadProject={handleLoadProject}
                handleSave={handleSave}
                
                isPro={isPro}
                userEmail={session?.user?.email || ''}
                handleSignOut={() => supabase.auth.signOut()}
            />
            {/* LISTE TÂCHES (INLINE) */}
            <div className="p-6 pt-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex justify-between items-center">Modifier les tâches</h2>
                <div className="space-y-2">
                    {/* @ts-ignore */}
                    {tasks.map(t => {
                        const isCrit = criticalPath.includes(t.id);
                        return (
                            <div key={t.id} className={`p-3 rounded-lg border flex justify-between items-center group transition-all ${isCrit ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
                                <div className="w-full mr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`font-bold text-sm px-1.5 rounded ${isCrit ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-700'}`}>{t.id}</span>
                                        <input className="text-sm font-medium text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full" defaultValue={t.name} onBlur={(e) => updateTask(t.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                                    </div>
                                    <div className="text-xs text-slate-500 flex gap-2 w-full">
                                        <div className="flex items-center gap-1 bg-white/50 rounded px-1 border border-transparent hover:border-slate-300 transition-colors cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200">
                                            <span className="opacity-50">⏱</span>
                                            <input className="w-8 bg-transparent outline-none text-center font-medium" defaultValue={t.duration} type="number" min="1" onBlur={(e) => updateTask(t.id, 'duration', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /><span className="opacity-50">j</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-1 bg-white/50 rounded px-1 border border-transparent hover:border-slate-300 transition-colors cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200">
                                            <span className="opacity-50">Pre:</span>
                                            <input className="w-full bg-transparent outline-none uppercase font-medium placeholder-slate-300" 
                                            // @ts-ignore
                                            defaultValue={t.predecessors.join(', ')} placeholder="-" onBlur={(e) => updateTask(t.id, 'predecessors', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeTask(t.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={16} /></button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>

        <main className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm text-xs text-slate-500 max-w-xs">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><Info size={14}/> Guide</div>
                <ul className="space-y-1 ml-1"><li><strong className="text-slate-700">Import:</strong> Charger un projet GANTT crée un PERT auto.</li><li><strong className="text-red-500">Rouge:</strong> Chemin Critique.</li></ul>
            </div>
            <div className="flex-1 overflow-auto p-10 cursor-move custom-scrollbar">
                <div className="min-w-full min-h-full flex items-center justify-center">{renderGraph()}</div>
            </div>
        </main>
      </div>
    </div>
  );
}