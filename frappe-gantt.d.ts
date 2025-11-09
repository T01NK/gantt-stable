// Ceci est notre "fichier d'indice" pour TypeScript

// On dit à TypeScript : "Il existe un module qui s'appelle 'frappe-gantt'"
declare module 'frappe-gantt' {

  // On définit une "Tâche" (vous pouvez l'ignorer pour l'instant)
  interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  // On définit les "Options" (vous pouvez l'ignorer)
  interface Options {
    header_height?: number;
    bar_height?: number;
    step?: number;
    view_modes?: string[];
    bar_corner_radius?: number;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: string) => void;
  }

  // C'EST LA PARTIE IMPORTANTE :
  // On dit: "Ce module exporte par défaut une 'classe' qui s'appelle Gantt"
  // Et on décrit comment l'utiliser (son "constructeur")
  export default class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGSVGElement, 
      tasks: Task[], 
      options?: Options
    );

    // On lui dit aussi qu'il a une fonction "refresh"
    refresh(tasks: Task[]): void;
  }
}