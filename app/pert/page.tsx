'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, AlertCircle, ArrowLeft, Network, Info } from 'lucide-react';

// --- MOTEUR DE CALCUL PERT ---
const calculatePERT = (tasks: any[]) => {
  if (tasks.length === 0) return { computedTasks: [], criticalPath: [], maxDuration: 0, hasCycle: false };

  // 1. Initialisation
  let computed = tasks.map(t => ({
    ...t,
    es: 0, ef: 0, ls: Infinity, lf: Infinity,
    slack: 0, successors: [], level: 0
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

  // 2. Passe Avant
  let changed = true;
  let iterations = 0;
  let hasCycle = false;
  const MAX_ITERATIONS = tasks.length + 5;

  while(changed) {
    if (iterations > MAX_ITERATIONS) { hasCycle = true; break; }
    changed = false;
    iterations++;

    computed.forEach(t => {
      let maxPredEF = 0;
      let maxLevel = -1;
      
      t.predecessors.forEach((predId: string) => {
        if (taskMap[predId]) {
          maxPredEF = Math.max(maxPredEF, taskMap[predId].ef);
          maxLevel = Math.max(maxLevel, taskMap[predId].level);
        }
      });

      const newES = maxPredEF;
      const newEF = newES + parseInt(t.duration || 0);
      const newLevel = maxLevel + 1;

      if (t.es !== newES || t.ef !== newEF || t.level !== newLevel) {
        t.es = newES; t.ef = newEF; t.level = newLevel;
        changed = true;
      }
    });
  }

  const projectDuration = Math.max(...computed.map(t => t.ef), 0);

  // 3. Passe Arrière
  if (!hasCycle) {
    computed.forEach(t => {
      if (!t.successors || t.successors.length === 0) {
        t.lf = projectDuration;
        t.ls = t.lf - parseInt(t.duration || 0);
      }
    });

    changed = true;
    iterations = 0;
    while(changed) {
       if (iterations > MAX_ITERATIONS) break;
       changed = false;
       iterations++;

      computed.forEach(t => {
        if (t.successors && t.successors.length > 0) {
          let minSuccLS = Infinity;
          t.successors.forEach((succId: string) => {
             if (taskMap[succId]) minSuccLS = Math.min(minSuccLS, taskMap[succId].ls);
          });

          const newLF = minSuccLS;
          const newLS = newLF - parseInt(t.duration || 0);

          if (t.lf !== newLF || t.ls !== newLS) {
            t.lf = newLF; t.ls = newLS;
            changed = true;
          }
        }
      });
    }
  }

  // 4. Marge et Chemin Critique
  const criticalPath: string[] = [];
  computed.forEach(t => {
    t.slack = t.ls - t.es;
    if (!hasCycle && t.slack === 0) {
      t.isCritical = true;
      criticalPath.push(t.id);
    } else {
      t.isCritical = false;
    }
  });

  return { computedTasks: computed, criticalPath, maxDuration: projectDuration, hasCycle };
};

// --- COMPOSANT PRINCIPAL ---

export default function PERTBuilder() {
  const [tasks, setTasks] = useState([
    { id: 'A', name: 'Analyse des besoins', duration: 3, predecessors: [] },
    { id: 'B', name: 'Conception Architecture', duration: 2, predecessors: ['A'] },
    { id: 'C', name: 'Design Interface', duration: 4, predecessors: ['A'] },
    { id: 'D', name: 'Développement Backend', duration: 5, predecessors: ['B'] },
    { id: 'E', name: 'Développement Frontend', duration: 4, predecessors: ['C'] },
    { id: 'F', name: 'Intégration', duration: 2, predecessors: ['D', 'E'] },
  ]);

  const [newTask, setNewTask] = useState({ id: '', name: '', duration: 1, predecessors: '' });
  const [error, setError] = useState<string | null>(null);

  // CORRECTION CRUCIALE : on récupère bien criticalPath
  const { computedTasks, maxDuration, hasCycle, criticalPath } = useMemo(() => calculatePERT(tasks), [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.id || !newTask.name) return;
    
    // @ts-ignore
    if (tasks.find(t => t.id === newTask.id)) {
      setError(`L'ID "${newTask.id}" existe déjà.`);
      return;
    }

    const preds = newTask.predecessors
      ? newTask.predecessors.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    // @ts-ignore
    const unknownPred = preds.find(p => !tasks.find(t => t.id === p));
    if (unknownPred) {
      setError(`Le prédécesseur "${unknownPred}" n'existe pas.`);
      return;
    }

    // @ts-ignore
    setTasks([...tasks, { ...newTask, predecessors: preds, duration: parseInt(newTask.duration as any) }]);
    setNewTask({ id: '', name: '', duration: 1, predecessors: '' });
    setError(null);
  };

  const removeTask = (id: string) => {
    // @ts-ignore
    setTasks(tasks.filter(t => t.id !== id).map(t => ({
      ...t,
      // @ts-ignore
      predecessors: t.predecessors.filter(p => p !== id)
    })));
  };

  const updateTask = (id: string, field: string, value: string) => {
    setTasks(prevTasks => prevTasks.map(t => {
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
    if (hasCycle) return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
            <AlertCircle size={48} className="mb-4" />
            <h3 className="text-xl font-bold">Boucle infinie détectée !</h3>
            <p className="text-sm mt-2">Vérifiez vos prédécesseurs (ex: A dépend de B, et B dépend de A).</p>
        </div>
    );

    const nodeWidth = 140;
    const nodeHeight = 80;
    const xSpacing = 200;
    const ySpacing = 120;
    const padding = 50;

    const levels: any = {};
    // @ts-ignore
    computedTasks.forEach(t => {
      if (!levels[t.level]) levels[t.level] = [];
      levels[t.level].push(t);
    });

    const positions: any = {};
    let maxLevel = 0;
    let maxTasksInLevel = 0;

    Object.keys(levels).forEach(lvl => {
      const levelTasks = levels[lvl];
      maxLevel = Math.max(maxLevel, parseInt(lvl));
      maxTasksInLevel = Math.max(maxTasksInLevel, levelTasks.length);
      
      levelTasks.forEach((t: any, index: number) => {
        positions[t.id] = {
          x: parseInt(lvl) * xSpacing + padding,
          y: index * ySpacing + padding
        };
      });
    });

    const svgWidth = (maxLevel + 1) * xSpacing + padding;
    const svgHeight = maxTasksInLevel * ySpacing + padding;

    const taskMapForRender: any = {};
    // @ts-ignore
    computedTasks.forEach(t => taskMapForRender[t.id] = t);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
           <marker id="arrowhead-crit" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {/* @ts-ignore */}
        {computedTasks.map(t => (
          // @ts-ignore
          t.predecessors.map(predId => {
            const startNode = positions[predId];
            const endNode = positions[t.id];
            if (!startNode || !endNode) return null;

            const isCriticalLink = t.isCritical && taskMapForRender[predId]?.isCritical && (taskMapForRender[predId].ef === t.es);
            
            const x1 = startNode.x + nodeWidth;
            const y1 = startNode.y + nodeHeight / 2;
            const x2 = endNode.x;
            const y2 = endNode.y + nodeHeight / 2;

            const path = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

            return (
              <path
                key={`${predId}-${t.id}`}
                d={path}
                fill="none"
                stroke={isCriticalLink ? "#ef4444" : "#cbd5e1"}
                strokeWidth={isCriticalLink ? 3 : 2}
                markerEnd={isCriticalLink ? "url(#arrowhead-crit)" : "url(#arrowhead)"}
              />
            );
          })
        ))}

        {/* @ts-ignore */}
        {computedTasks.map(t => {
          const pos = positions[t.id];
          if(!pos) return null;
          
          return (
            <g key={t.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill={t.isCritical ? "#fef2f2" : "white"}
                stroke={t.isCritical ? "#ef4444" : "#e2e8f0"}
                strokeWidth={t.isCritical ? 2 : 1}
                className="shadow-sm transition-colors duration-300"
              />
              
              <path d={`M 0 30 L ${nodeWidth} 30`} stroke={t.isCritical ? "#fecaca" : "#f1f5f9"} />
              <text x="10" y="20" className="font-bold text-sm fill-slate-700" style={{fontWeight: 700}}>
                {t.id}
              </text>
               <text x="35" y="20" className="text-xs fill-slate-500 truncate" style={{maxWidth: '100px'}}>
                {t.name.length > 15 ? t.name.substring(0,12) + '...' : t.name}
              </text>

              <g transform="translate(0, 30)">
                <path d={`M ${nodeWidth/2} 0 L ${nodeWidth/2} ${nodeHeight-30}`} stroke="#f1f5f9" />
                <text x="5" y="15" className="text-[10px] fill-slate-400">Tôt: {t.es} → {t.ef}</text>
                <text x="5" y="30" className="text-[10px] fill-slate-400">Tard: {t.ls} → {t.lf}</text>
                <text x={nodeWidth/2 + 5} y="15" className="text-[10px] font-semibold fill-slate-600">Durée: {t.duration}</text>
                <text x={nodeWidth/2 + 5} y="30" className={`text-[10px] font-bold ${t.isCritical ? "fill-red-500" : "fill-green-500"}`}>
                  Marge: {t.slack}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-3">
            <Link href="/" className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition text-slate-600">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="bg-blue-600 p-2 rounded-lg">
                <Network className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Éditeur PERT <span className="text-blue-600">Pro</span></h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Chemin Critique</span>
            </div>
            <div className="bg-slate-100 px-3 py-1 rounded-full font-mono text-blue-700 font-bold">
                Durée Projet : {hasCycle ? '--' : maxDuration} jours
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Ajouter une tâche</h2>
                <form onSubmit={addTask} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                    
                    <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">ID</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold uppercase"
                                placeholder="G"
                                value={newTask.id}
                                onChange={e => setNewTask({...newTask, id: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Nom..."
                                value={newTask.name}
                                onChange={e => setNewTask({...newTask, name: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Durée</label>
                            <input 
                                type="number" min="1"
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={newTask.duration}
                                onChange={e => setNewTask({...newTask, duration: e.target.value as any})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Prédécesseurs</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                                placeholder="A, B"
                                value={newTask.predecessors}
                                onChange={e => setNewTask({...newTask, predecessors: e.target.value})}
                            />
                        </div>
                    </div>
                    {error && <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded"><AlertCircle size={14} />{error}</div>}
                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
                        <Plus size={16} /> Ajouter
                    </button>
                </form>

                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex justify-between items-center">
                    Modifier les tâches
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{tasks.length}</span>
                </h2>
                <div className="space-y-2">
                    {/* @ts-ignore */}
                    {tasks.map(t => {
                        // CORRECTION CRUCIALE ICI : On utilise includes() et pas .isCritical
                        const isCrit = criticalPath.includes(t.id);
                        return (
                            <div key={t.id} className={`p-3 rounded-lg border flex justify-between items-center group transition-all ${isCrit ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
                                <div className="w-full mr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`font-bold text-sm px-1.5 rounded ${isCrit ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-700'}`}>{t.id}</span>
                                        <input 
                                            className="text-sm font-medium text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full"
                                            defaultValue={t.name}
                                            onBlur={(e) => updateTask(t.id, 'name', e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-500 flex gap-2 w-full">
                                        <div className="flex items-center gap-1 bg-white/50 rounded px-1 border border-transparent hover:border-slate-300 transition-colors cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200">
                                            <span className="opacity-50">⏱</span>
                                            <input 
                                                className="w-8 bg-transparent outline-none text-center font-medium"
                                                defaultValue={t.duration}
                                                type="number"
                                                min="1"
                                                onBlur={(e) => updateTask(t.id, 'duration', e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                            />
                                            <span className="opacity-50">j</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-1 bg-white/50 rounded px-1 border border-transparent hover:border-slate-300 transition-colors cursor-text focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200">
                                            <span className="opacity-50">Pre:</span>
                                            <input 
                                                className="w-full bg-transparent outline-none uppercase font-medium placeholder-slate-300"
                                                // @ts-ignore
                                                defaultValue={t.predecessors.join(', ')}
                                                placeholder="-"
                                                onBlur={(e) => updateTask(t.id, 'predecessors', e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeTask(t.id)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                                    title="Supprimer la tâche"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>

        <main className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm text-xs text-slate-500 max-w-xs">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2"><Info size={14}/> Guide</div>
                <ul className="space-y-1 ml-1">
                    <li><strong className="text-slate-700">Tôt/Tard:</strong> Dates début et fin.</li>
                    <li><strong className="text-red-500">Rouge:</strong> Chemin Critique.</li>
                    <li><strong className="text-blue-500">Modif:</strong> Cliquez sur les textes dans la liste pour éditer.</li>
                </ul>
            </div>
            <div className="flex-1 overflow-auto p-10 cursor-move custom-scrollbar">
                <div className="min-w-full min-h-full flex items-center justify-center">
                    {renderGraph()}
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}