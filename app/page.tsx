// Forcer ce composant à s'exécuter uniquement sur le navigateur
'use client'; 

import { useEffect, useRef, useState } from 'react';
// On importe le type 'Task' qu'on a défini
import type { Task } from 'frappe-gantt'; 

// C'est notre composant de page d'accueil
export default function Home() {
  const ganttContainerRef = useRef<SVGSVGElement | null>(null);
  const [ganttInstance, setGanttInstance] = useState<any | null>(null);
  
  // --- NOUVEAUTÉ: On met à jour le texte par défaut
  // pour montrer le nouveau format
  const [inputText, setInputText] = useState(
    "task1, Tâche Parente 1, 2025-11-05, 2025-11-08\n" +
    "  task2, Sous-tâche 1.1 (indentée), 2025-11-06, 2025-11-07\n" +
    "task3, Tâche Parente 2 (dépend de 1), 2025-11-09, 2025-11-12, $task1\n" +
    "task4, Tâche Parente 3, 2025-11-10, 2025-11-13\n" +
    "  task5, Sous-tâche 3.1, 2025-11-11, 2025-11-12, $task2"
  );
  // --- FIN NOUVEAUTÉ ---


  // useEffect ne change pas, il initialise le GANTT vide
  useEffect(() => {
    if (ganttContainerRef.current) {
      import('frappe-gantt').then((GanttModule) => {
        const FrappeGantt = GanttModule.default;
        
        const gantt = new FrappeGantt(ganttContainerRef.current!, [], {
          header_height: 50,
          bar_height: 20,
          step: 24,
          view_modes: ['Day', 'Week', 'Month'],
          bar_corner_radius: 3,
        });
        
        setGanttInstance(gantt);
      });
    }
  }, [ganttContainerRef]); 

  
  // --- NOUVELLE FONCTION "PARSER" AMÉLIORÉE ---
  const parseInputToTasks = (text: string): Task[] => {
    const lines = text.split('\n');
    const tasks: Task[] = [];
    const taskMap = new Map<string, Task>(); // Pour retrouver les tâches par ID
    let lastParentId: string | null = null; // Pour gérer la hiérarchie

    for (let line of lines) {
      const isSubtask = line.startsWith('  ') || line.startsWith('\t');
      line = line.trim(); // On enlève les espaces/tabulations
      
      if (line === "") continue;

      const parts = line.split(',').map(part => part.trim());
      if (parts.length < 4) continue; // On a besoin au min: id, nom, début, fin

      const [id, name, start, end] = parts;
      
      // On cherche les dépendances
      let dependencies = "";
      if (parts.length > 4) {
        dependencies = parts.slice(4) // Prend tout le reste
                           .filter(p => p.startsWith('$')) // Garde que les $...
                           .map(p => p.substring(1)) // Enlève le $
                           .join(', '); // Les sépare par une virgule
      }
      
      const newTask: Task = {
        id: id,
        name: name,
        start: start,
        end: end,
        progress: 0,
        dependencies: dependencies
      };
      
      // Gestion de la Hiérarchie
      if (isSubtask && lastParentId) {
        // C'est une sous-tâche, on la lie au parent
        newTask.dependencies = newTask.dependencies 
          ? `${newTask.dependencies}, ${lastParentId}` 
          : lastParentId;
          
        // Note: Frappe-Gantt gère mal la "visualisation" hiérarchique,
        // mais la dépendance force l'ordre, ce qui est le plus important.
        // Pour une vraie hiérarchie visuelle, on ajouterait "  " au nom.
        newTask.name = `  ↳ ${name}`;
      } else if (!isSubtask) {
        // C'est une tâche parente
        lastParentId = id;
      }

      tasks.push(newTask);
      taskMap.set(id, newTask);
    }
    return tasks;
  };
  // --- FIN DU NOUVEAU PARSER ---

  
  // Le "Handler" ne change pas, il appelle juste le nouveau parser
  const handleGenerateGantt = () => {
    if (ganttInstance && parseInputToTasks) {
      const newTasks = parseInputToTasks(inputText);
      
      // On met à jour le GANTT
      ganttInstance.refresh(newTasks);
    }
  };
  
  // Le HTML (JSX)
  return (
    <main className="flex min-h-screen flex-col items-center p-12">
      <h1 className="text-4xl font-bold mb-4">Générateur de GANTT</h1>
      
      <div className="w-full max-w-4xl">
        <textarea
          // Les classes pour le "dark mode"
          className="w-full h-32 p-2 border border-gray-600 rounded-md bg-gray-900 text-gray-100"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Format: id, Nom, DateDébut, DateFin, $dépendance1, $dépendance2..."
        />
        
        <button
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
          onClick={handleGenerateGantt}
        >
          Générer / Mettre à jour le GANTT
        </button>
      </div>
      
      <p className="mt-8 mb-4 text-lg">Résultat :</p>

      <div className="w-full max-w-4xl">
        <svg ref={ganttContainerRef}></svg>
      </div>
    </main>
  );
}