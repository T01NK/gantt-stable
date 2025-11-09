import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '../../../../utils/supabaseAdmin';

// On initialise Stripe (il lit la clé secrète automatiquement)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  // Étape 1: Vérifier que le message vient BIEN de Stripe
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Étape 2: Traiter le message "Paiement Réussi"
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // On récupère l'ID utilisateur qu'on avait attaché !
    const userId = session.client_reference_id;

    if (!userId) {
      console.error('Webhook Error: No user ID in Stripe session');
      return new NextResponse('Webhook Error: No user ID', { status: 400 });
    }

    // Étape 3: Mettre à jour la base de données !
    try {
      const { error } = await supabaseAdmin
        .from('profiles') // Notre table de profils
        .update({ subscription_status: 'pro' }) // On met à jour le statut
        .eq('id', userId); // Pour cet utilisateur

      if (error) {
        throw error;
      }

      console.log(`Utilisateur ${userId} est maintenant "pro" !`);

    } catch (dbError: any) {
      console.error('Supabase DB Error:', dbError.message);
      return new NextResponse(`Database Error: ${dbError.message}`, { status: 500 });
    }
  }

  // Étape 4: Renvoyer une réponse "OK" à Stripe
  return NextResponse.json({ received: true });
}