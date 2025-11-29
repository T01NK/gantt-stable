import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js'; // On utilise le client standard, plus simple ici

console.log("--- API STRIPE: Mode Token Direct ---");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-10-29.clover',
});

// Client Supabase Admin (pour vérifier le token)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Récupérer le Token depuis le Header "Authorization"
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
        console.error("Erreur: Pas de header Authorization envoyé !");
        return new NextResponse(JSON.stringify({ error: 'Token manquant' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 2. Vérifier le Token auprès de Supabase
    console.log("Vérification du token reçu...");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Erreur Auth Token invalide :", error?.message);
      return new NextResponse(JSON.stringify({ error: 'Token invalide' }), { status: 401 });
    }
    
    console.log("Succès ! Utilisateur identifié :", user.email);

    // 3. Configuration Stripe
    const priceId = 'price_1SRf5VRrN1Tkn8VtQn50AnHR'; 

    // 4. Créer la session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.nextUrl.origin}/?payment=success`,
      cancel_url: `${req.nextUrl.origin}/?payment=cancelled`,
      client_reference_id: user.id,
    });

    return NextResponse.json({ url: session.url });

  } catch (e: any) {
    console.error("ERREUR CRITIQUE :", e);
    return new NextResponse(JSON.stringify({ error: e.message }), { status: 500 });
  }
}