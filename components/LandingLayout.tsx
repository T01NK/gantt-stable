'use client';

import Link from 'next/link';

export default function LandingLayout() {
    return (
        <main className="flex min-h-screen flex-col items-center bg-white text-slate-900 font-sans">
            
            {/* HEADER VITRINE (Light) */}
            <header className="w-full absolute top-0 left-0 p-6 z-10">
                <nav className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 rounded-lg">
                            {/* Petite icône simple */}
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        Gantt<span className="text-blue-600">Intelligent</span>
                    </Link>

                    <Link
                        href="/login"
                        className="px-5 py-2.5 bg-slate-900 text-white font-medium rounded-lg text-sm hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        Connexion
                    </Link>
                </nav>
            </header>
            
            <div className="pt-40 pb-24 px-6 w-full flex flex-col items-center">
                
                {/* 1. HERO SECTION */}
                <section className="flex flex-col items-center text-center max-w-4xl">
                    <div className="inline-block px-3 py-1 mb-6 text-xs font-semibold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full">
                        Nouveau : Gestion par IA
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 tracking-tight leading-tight">
                        Planifiez vos projets <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            sans complexité.
                        </span>
                    </h1>
                    <p className="text-xl text-slate-500 mb-10 max-w-2xl leading-relaxed">
                        L'outil de GANTT conçu pour les ingénieurs. Simple, rapide, et esthétique.
                        Oubliez les usines à gaz, concentrez-vous sur la livraison.
                    </p>
                    <Link
                        href="/login"
                        className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30"
                    >
                        Commencer gratuitement
                    </Link>
                </section>

                {/* 2. FONCTIONNALITÉS */}
                <section className="w-full max-w-6xl mt-32">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-2xl">⚡️</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Ultra Rapide</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Interface réactive. Ajoutez des tâches, déplacez-les, tout se met à jour instantanément.
                            </p>
                        </div>
                        {/* Feature 2 */}
                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-2xl">💾</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Sauvegarde Cloud</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Retrouvez vos projets n'importe où. Sauvegarde sécurisée et chargement instantané.
                            </p>
                        </div>
                        {/* Feature 3 */}
                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-2xl">✨</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Esthétique</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Un design clair et moderne pour présenter vos plannings à vos clients ou professeurs.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. TARIFS */}
                <section className="w-full max-w-5xl mt-32 mb-20">
                    <h2 className="text-3xl font-bold text-center mb-16 text-slate-900">Un tarif transparent</h2>
                    
                    <div className="flex flex-col md:flex-row justify-center gap-8 items-stretch">
                        
                        {/* Gratuit */}
                        <div className="flex-1 p-8 rounded-2xl border border-slate-200 bg-white">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Gratuit</h3>
                            <div className="text-4xl font-bold mb-6">0€</div>
                            <ul className="space-y-4 mb-8 text-slate-600">
                                <li className="flex gap-3"><span className="text-green-500">✓</span> Création illimitée</li>
                                <li className="flex gap-3"><span className="text-green-500">✓</span> Export visuel</li>
                                <li className="flex gap-3"><span className="text-slate-300">✕</span> Pas de sauvegarde</li>
                            </ul>
                            <Link href="/login" className="block w-full py-3 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition">
                                Découvrir
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="flex-1 p-8 rounded-2xl border-2 border-blue-600 bg-blue-50/50 relative">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase">Populaire</div>
                            <h3 className="text-xl font-bold text-blue-900 mb-2">Pro</h3>
                            <div className="text-4xl font-bold mb-6 text-blue-600">5€ <span className="text-lg text-slate-500 font-normal">/mois</span></div>
                            <ul className="space-y-4 mb-8 text-slate-700">
                                <li className="flex gap-3"><span className="text-blue-600">✓</span> Tout le gratuit</li>
                                <li className="flex gap-3"><span className="text-blue-600">✓</span> <strong>Sauvegarde Cloud</strong></li>
                                <li className="flex gap-3"><span className="text-blue-600">✓</span> <strong>Chargement de projets</strong></li>
                            </ul>
                            <Link href="/login?plan=pro" className="block w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-md">
                                Devenir Pro
                            </Link>
                        </div>

                    </div>
                </section>

            </div>
        </main>
    );
}