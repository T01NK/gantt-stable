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
      
      {/* 1. Header & Déconnexion */}
      <div className="mb-8 pb-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white mb-2">
          Gantt<span className="text-blue-500">Facile</span>
        </h2>
        <span className="text-sm text-gray-500 block mb-3">{userEmail}</span>
        
        <button
          onClick={handleSignOut}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
        >
          Se Déconnecter
        </button>
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

      {/* 4. Boutons d'Action */}
      <div className="space-y-3 pt-6 border-t border-gray-800">
        <button
          onClick={handleGenerateGantt}
          className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
        >
          Générer / Mettre à jour GANTT
        </button>
        
        <button
          onClick={handleSave}
          className={`w-full px-4 py-2 text-white font-semibold rounded-md transition-colors ${
            isPro 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          {isPro ? 'Sauvegarder Projet' : 'Débloquer la Sauvegarde (Pro)'}
        </button>

        {/* Message Pro */}
        {!isPro && (
          <p className="text-xs text-yellow-400 text-center mt-2">
            Passez Pro pour sauvegarder et charger vos projets.
          </p>
        )}
      </div>

    </div>
  );
}