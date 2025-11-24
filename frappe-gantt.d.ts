declare module 'frappe-gantt' {
  
  interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  interface Options {
    header_height?: number;
    bar_height?: number;
    step?: number;
    view_modes?: string[];
    view_mode?: string; // <-- J'AI AJOUTÉ CETTE LIGNE
    bar_corner_radius?: number;
    bar_progress_height?: number;
    padding?: number;
    language?: string;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: string) => void;
  }

  export default class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGSVGElement, 
      tasks: Task[], 
      options?: Options
    );
    
    refresh(tasks: Task[]): void;
    change_view_mode(mode: string): void;
  }
}