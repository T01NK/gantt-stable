import React from 'react';
import type { Project } from '../utils/appTypes'; 
import Link from 'next/link';
import { Sparkles, FolderOpen, Plus, LogOut, Lock, Network, BarChart3 } from 'lucide-react';

interface SidebarProps {
  inputText: string;
  setInputText: (text: string) => void;
  projects: Project[];
  handleLoadProject: (projectId: string) => void;
  handleGenerateGantt: () => void;
  handleSave: () => void;
  isPro: boolean; 
  userEmail: string;
  handleSignOut: () => void;
  setTasks: (tasks: any[]) => void;
}

export default function Sidebar({
  inputText,
  setInputText,
  projects,
  handleLoadProject,
  handleGenerateGantt,
  handleSave,
  isPro,
  userEmail,
  handleSignOut,
}: SidebarProps) {
  
  return (
    <div className="w-full h-full bg-white border-r border-slate-200 p-6 flex flex-col overflow-y-auto gap-8">
      
      {/* 1. Header & Déconnexion */}
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
            <div className="flex-1 py-1.5 px-2 bg-white shadow-sm rounded-md text-xs font-bold text-blue-700 flex items-center justify-center gap-2 cursor-default border border-slate-200">
                <BarChart3 className="w-3 h-3" /> Gantt
            </div>
            <Link href="/pert" className="flex-1 py-1.5 px-2 hover:bg-white hover:shadow-sm rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 transition-all">
                <Network className="w-3 h-3" /> PERT
            </Link>
        </div>
      </div>

      {/* 2. PROJETS (SAUVEGARDE) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
           <FolderOpen className="w-4 h-4" /> Mes Projets
        </h2>
        {projects.length > 0 ? (
            <select 
                /* CORRECTION : Uniquement text-sm ici */
                className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                onChange={(e) => handleLoadProject(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>Charger un projet...</option>
                {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
            </select>
        ) : (
            <p className="text-xs text-slate-400 italic">Aucun projet sauvegardé.</p>
        )}
        <button
          onClick={handleSave}
          /* CORRECTION : Uniquement text-xs ici pour le bouton */
          className={`w-full mt-3 px-3 py-2 text-xs font-bold text-white uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 ${
            isPro ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPro ? 'Sauvegarder' : 'Débloquer Pro (5€)'}
        </button>
      </div>

      {/* 3. IA GENERATOR (COMING SOON) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative overflow-hidden opacity-80 select-none group cursor-not-allowed">
         <div className="absolute top-2 right-2 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full z-20">
            BIENTÔT
         </div>

         <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2 relative z-10">
            <Sparkles className="w-4 h-4" /> Générateur IA
         </h2>
         
         <div className="w-full h-20 bg-slate-100 border border-slate-200 rounded-lg mb-2 p-3 text-xs text-slate-400 italic flex items-center justify-center text-center">
            Décrivez votre projet et laissez l'IA organiser les tâches...
         </div>
         
         <button disabled className="w-full py-2 bg-slate-200 text-slate-400 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 cursor-not-allowed">
            <Lock className="w-3 h-3" /> Fonctionnalité à venir
         </button>
      </div>

      {/* 4. MODIFICATION MANUELLE */}
      <div className="grow flex flex-col min-h-0">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Édition Manuelle
        </h2>
        <textarea
          className="grow w-full p-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed resize-none"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Format: ID, Nom, Début, Fin, Dépendance"
        />
        <button
          onClick={handleGenerateGantt}
          className="w-full mt-3 px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors text-sm"
        >
          Mettre à jour le Graphique
        </button>
      </div>

    </div>
  );
}