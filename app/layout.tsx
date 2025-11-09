import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './frappe-gantt.css';
import SupabaseProvider from '../components/SupabaseProvider'; // On garde l'import

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Générateur de GANTT",
  description: "Projet Alpha GANTT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ON A TOUT SUPPRIMÉ ICI
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-black text-white`}
      >
        {/* Le Provider enveloppe les enfants, sans propriété */}
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}