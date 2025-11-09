import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './frappe-gantt.css'; // <-- LIGNE CORRECTE

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Générateur de GANTT", // <-- J'ai changé ça
  description: "Projet Alpha GANTT", // <-- Et ça
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-black text-white`} // <-- LIGNE CORRIGÉE
      >
        {children}
      </body>
    </html>
  );
}