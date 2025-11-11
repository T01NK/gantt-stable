'use client';

import Link from 'next/link';
import Header from './Header'; // Assurez-vous d'avoir cet import si vous n'avez pas renommé le Header

// Ce composant contient tout le contenu de la Vitrine, protégé par 'use client'
export default function LandingLayout() {
    return (
        <main className="flex min-h-screen flex-col items-center p-12 pt-32 pb-24">
            <Header />

            {/* --- 1. "Hero Section" --- */}
            <section className="flex flex-col items-center text-center max-w-3xl">
                <h1 className="text-6xl font-bold mb-6">
                    Créez des diagrammes de GANTT
                    <br />
                    <span className="text-blue-500">en quelques secondes.</span>
                </h1>
                <p className="text-xl text-gray-400 mb-10">
                    Notre outil simplifie la gestion de projet. Entrez vos tâches en texte brut,
                    visualisez instantanément votre planning et sauvegardez vos projets
                    dans le cloud avec notre offre Pro.
                </p>
                <Link
                    href="/login"
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-md text-lg hover:bg-blue-700 transition-colors"
                >
                    Commencer gratuitement
                </Link>
            </section>

            {/* --- 2. Section "Fonctionnalités" --- */}
            <section className="w-full max-w-5xl mt-24">
                <h2 className="text-4xl font-bold text-center mb-12">
                    Tout ce qu'il vous faut, sans le superflu.
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">

                    {/* Fonctionnalité 1 */}
                    <div className="flex flex-col items-center">
                        <p className="text-4xl mb-3">⚡️</p>
                        <h3 className="text-2xl font-semibold mb-2">Ultra Rapide</h3>
                        <p className="text-gray-400">
                            Pas de chargement, pas de menus complexes. Écrivez en texte brut,
                            votre GANTT se met à jour instantanément.
                        </p>
                    </div>

                    {/* Fonctionnalité 2 */}
                    <div className="flex flex-col items-center">
                        <p className="text-4xl mb-3">💾</p>
                        <h3 className="text-2xl font-semibold mb-2">Sauvegarde "Pro"</h3>
                        <p className="text-gray-400">
                            Ne perdez jamais votre travail. Notre offre Pro vous permet de
                            sauvegarder et charger vos projets depuis le cloud.
                        </p>
                    </div>

                    {/* Fonctionnalité 3 */}
                    <div className="flex flex-col items-center">
                        <p className="text-4xl mb-3">🔗</p>
                        <h3 className="text-2xl font-semibold mb-2">Dépendances Simples</h3>
                        <p className="text-gray-400">
                            Reliez vos tâches avec une syntaxe simple (`$tache1`) pour
                            visualiser les dépendances de votre projet.
                        </p>
                    </div>

                </div>
            </section>

            {/* --- 3. La Section "Tarifs" --- */}
            <section className="w-full max-w-4xl mt-24">
                <h2 className="text-4xl font-bold text-center mb-12">
                    Un tarif simple et transparent.
                </h2>

                <div className="flex flex-col md:flex-row justify-center gap-8">

                    {/* Carte "Gratuit" */}
                    <div className="w-full md:w-1/2 lg:w-1/3 border border-gray-700 rounded-lg p-8 flex flex-col">
                        <h3 className="text-2xl font-semibold mb-4">Gratuit</h3>
                        <p className="text-5xl font-bold mb-4">0 €</p>
                        <p className="text-gray-400 mb-6">Pour les projets rapides</p>
                        <ul className="space-y-2 mb-8 text-gray-300">
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Générateur de GANTT
                            </li>
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Parser de texte
                            </li>
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Dépendances simples
                            </li>
                        </ul>
                        <div className="mt-auto">
                            <Link
                                href="/login"
                                className="w-full block text-center px-6 py-3 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Commencer
                            </Link>
                        </div>
                    </div>

                    {/* Carte "Pro" (Mise en avant) */}
                    <div className="w-full md:w-1/2 lg:w-1/3 border-2 border-blue-500 rounded-lg p-8 flex flex-col relative">
                        <span className="absolute top-0 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            LE PLUS POPULAIRE
                        </span>

                        <h3 className="text-2xl font-semibold mb-4 text-blue-400">Pro</h3>
                        <p className="text-5xl font-bold mb-4">5 €<span className="text-lg font-normal text-gray-400">/mois</span></p>
                        <p className="text-gray-400 mb-6">Pour les pros organisés</p>
                        <ul className="space-y-2 mb-8 text-gray-300">
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> <span className="font-bold">Tout ce qui est gratuit</span>
                            </li>
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Sauvegarde illimitée de projets
                            </li>
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Chargement des projets
                            </li>
                            <li className="flex items-center">
                                <span className="text-green-500 mr-2">✔</span> Support prioritaire
                            </li>
                        </ul>
                        <div className="mt-auto">
                            <Link
                                href="/login"
                                className="w-full block text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Passer Pro
                            </Link>
                        </div>
                    </div>

                </div>
            </section>
        </main>
    );
}