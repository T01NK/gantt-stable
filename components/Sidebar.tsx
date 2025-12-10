import React from 'react';
import type { Project } from '../utils/appTypes'; 
import Link from 'next/link';
import { FolderOpen, Plus, LogOut, Network, BarChart3 } from 'lucide-react';

interface SidebarProps {
  // Mode d'affichage (Gantt par défaut)
  mode?: 'gantt' | 'pert';

  // Props pour la tâche (GANTT)
  newTask?: { name: string; start: string; end: string };
  setNewTask?: (task: { name: string; start: string; end: string }) => void;
  
  // Props pour la tâche (PERT)
  newPertTask?: { id: string; name: string; duration: number; predecessors: string };
  setNewPertTask?: (task: any) => void;

  handleAddTask: (e: React.FormEvent) => void;

  projects: Project[];
  handleLoadProject: (projectId: string) => void;
  handleSave: () => void;
  isPro: boolean; 
  userEmail: string;
  handleSignOut: () => void;
}

export default function Sidebar({
  mode = 'gantt', // Par défaut
  newTask,
  setNewTask,
  newPertTask,
  setNewPertTask,
  handleAddTask,
  projects,
  handleLoadProject,
  handleSave,
  isPro,
  userEmail,
  handleSignOut,
}: SidebarProps) {
  
  return (
    <div className="w-full h-full bg-white border-r border-slate-200 p-6 flex flex-col overflow-y-auto gap-8">
      
      {/* 1. Header & Navigation */}
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          Gantt<span className="text-blue-600">Intelligent</span>
        </h2>
        <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-slate-500 truncate max-w-[150px]" title={userEmail}>{userEmail}</span>
            <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition">
                <LogOut className="w-4 h-4" />
            </button>
        </div>

        {/* SÉLECTEUR D'OUTILS */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <Link href="/" className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${mode === 'gantt' ? 'bg-white shadow-sm text-blue-700 border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                <BarChart3 className="w-3 h-3" /> Gantt
            </Link>
            <Link href="/pert" className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${mode === 'pert' ? 'bg-white shadow-sm text-blue-700 border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}>
                <Network className="w-3 h-3" /> PERT
            </Link>
        </div>
      </div>

      {/* 2. PROJETS (CHARGER / SAUVEGARDER) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
           <FolderOpen className="w-4 h-4" /> {mode === 'gantt' ? 'Projets Gantt' : 'Charger Données'}
        </h2>
        {projects.length > 0 ? (
            <select 
                className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                onChange={(e) => handleLoadProject(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>Choisir un projet...</option>
                {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
            </select>
        ) : (
            <p className="text-xs text-slate-400 italic">Aucun projet trouvé.</p>
        )}
        <button
          onClick={handleSave}
          className={`w-full mt-3 px-3 py-2 text-xs font-bold text-white uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 ${
            isPro ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPro ? `Sauvegarder ${mode === 'pert' ? 'PERT' : 'Projet'}` : 'Débloquer Pro (5€)'}
        </button>
      </div>

      {/* 3. FORMULAIRE INTELLIGENT (Change selon le mode) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> {mode === 'gantt' ? 'Ajouter Tâche' : 'Ajouter Noeud'}
        </h2>
        
        <form onSubmit={handleAddTask} className="space-y-3">
            
            {/* MODE GANTT : NOM + DATES */}
            {mode === 'gantt' && newTask && setNewTask && (
                <>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nom</label>
                        <input 
                            type="text" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} 
                            placeholder="Ex: Réunion..." className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" required 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Début</label>
                            <input type="date" value={newTask.start} onChange={e => setNewTask({...newTask, start: e.target.value})} className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fin</label>
                            <input type="date" value={newTask.end} onChange={e => setNewTask({...newTask, end: e.target.value})} className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" required />
                        </div>
                    </div>
                </>
            )}

            {/* MODE PERT : ID + NOM + DURÉE + PRÉDÉCESSEURS */}
            {mode === 'pert' && newPertTask && setNewPertTask && (
                <>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">ID</label>
                            <input type="text" value={newPertTask.id} onChange={e => setNewPertTask({...newPertTask, id: e.target.value.toUpperCase()})} placeholder="A" className="w-full p-2 text-sm border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nom</label>
                            <input type="text" value={newPertTask.name} onChange={e => setNewPertTask({...newPertTask, name: e.target.value})} placeholder="Tâche..." className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Durée (j)</label>
                            <input type="number" min="1" value={newPertTask.duration} onChange={e => setNewPertTask({...newPertTask, duration: parseInt(e.target.value)})} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prédéc.</label>
                            <input type="text" value={newPertTask.predecessors} onChange={e => setNewPertTask({...newPertTask, predecessors: e.target.value})} placeholder="A, B" className="w-full p-2 text-sm border border-slate-300 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </>
            )}

            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm shadow-sm">
                <Plus className="w-4 h-4" /> Ajouter
            </button>
        </form>
      </div>
    </div>
  );
}