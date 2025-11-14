// components/Sidebar.tsx
import React from 'react';
import type { Project } from '../utils/appTypes';
import Link from 'next/link';

// On définit les propriétés que ce composant recevra de la page principale
interface SidebarProps {
  inputText: string;
  setInputText: (text: string) => void;
  projects: Project[];
  handleLoadProject: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleGenerateGantt: () => void;
  handleSave: () => void;
  isPro: boolean; 
  userEmail: string;
  handleSignOut: () => void;
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
    <div className="w-full h-screen bg-gray-900 border-r border-gray-800 p-6 flex flex-col overflow-y-auto">
      
      {/* 1. Header (Simplifié) */}
      <div className="mb-8 pb-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white mb-2">
          Gantt<span className="text-blue-500">Facile</span>
        </h2>
        <span className="text-sm text-gray-500 block mb-3">{userEmail}</span>
      </div>

      {/* 2. Liste de Chargement de Projets */}
      <div className="mb-6">
        <label htmlFor="project-select" className="block text-xs font-medium text-gray-400 mb-1">
          Charger un projet existant :
        </label>
        <select
          id="project-select"
          className="w-full p-2 border border-gray-700 rounded-md bg-gray-800 text-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500"
          onChange={handleLoadProject}
          defaultValue=""
        >
          <option value="" disabled>-- Choisir un projet --</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.project_name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Zone de Saisie */}
      <div className="grow mb-6">
        <label htmlFor="gantt-input" className="block text-xs font-medium text-gray-400 mb-1">
          Entrée des tâches (ID, Nom, Début, Fin, Dépendance) :
        </label>
        <textarea
          id="gantt-input"
          className="w-full h-full min-h-[150px] p-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ex: task1, Tâche 1, 2025-11-10, 2025-11-12"
        />
      </div>

      {/* 4. Boutons d'Action (Style Moderne) */}
      <div className="space-y-3 pt-6 border-t border-gray-800">
        <button
          onClick={handleGenerateGantt}
          className="w-full px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Générer / Mettre à jour
        </button>

        <button
          onClick={handleSave}
          className={`w-full px-4 py-2.5 text-white rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 ${
            isPro 
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
              : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
          }`}
        >
          {isPro ? 'Sauvegarder Projet' : 'Débloquer la Sauvegarde (Pro)'}
        </button>

        {/* ... (le message !isPro ne change pas) ... */}
      </div>

    </div>
  );
}