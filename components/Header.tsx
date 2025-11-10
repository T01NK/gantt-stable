'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full absolute top-0 left-0 p-6 z-10">
      <nav className="max-w-5xl mx-auto flex justify-between items-center">
        {/* 1. Votre Logo ou Nom de Site */}
        <Link href="/" className="text-2xl font-bold text-white">
          Gantt<span className="text-blue-500">Facile</span>
          {/* (Vous pouvez changer "GanttFacile" par ce que vous voulez) */}
        </Link>

        {/* 2. Le Bouton de Connexion */}
        <Link
          href="/login"
          className="px-5 py-2 bg-gray-800 text-white font-semibold rounded-md text-sm hover:bg-gray-700 transition-colors"
        >
          Connexion
        </Link>
      </nav>
    </header>
  );
}