import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Étape 1: Initialiser Stripe
// On utilise la clé secrète (du .env.local ou de Vercel)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Étape 2: Initialiser Supabase (pour la v4/v5 de "ssr")
// Note : C'est une manière différente de créer le client,
// car nous sommes sur un serveur et avons besoin de la session de l'utilisateur.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  // On doit lire le cookie store pour que Supabase puisse trouver l'utilisateur
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Étape 3: Vérifier qui est l'utilisateur
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
      });
    }

    // Étape 4: Chercher le Prix de notre produit
    // Vous devez créer votre produit "GANTT Pro" dans Stripe
    // et coller son "ID de prix" ici (il commence par price_...)
    const priceId = 'price_1SRf5VRrN1Tkn8VtQn50AnHR'; // <-- !!! METTEZ À JOUR CECI !!!

    // Étape 5: Créer la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.nextUrl.origin}`, // Redirige vers la page d'accueil
      cancel_url: `${req.nextUrl.origin}`, // Redirige vers la page d'accueil
      // C'EST LA PARTIE MAGIQUE:
      // On attache l'ID de l'utilisateur Supabase à la session Stripe
      client_reference_id: user.id,
    });

    // Étape 6: Renvoyer l'URL de paiement au client
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e.message }), {
      status: 500,
    });
  }
}