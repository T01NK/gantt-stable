import type { Database } from '../types_db';

// Définition publique de notre type Projet
export type Project = Database['public']['Tables']['projects']['Row'];