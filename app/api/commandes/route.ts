import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CommandeAchat from '@/models/CommandeAchat';
import Produit from '@/models/Produit';
import { generateUniqueNumero } from '@/models/UsedNumero';
import { requireAuth, getSession } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// ─── GET /api/commandes ───────────────────────────────────────────────────────
// Admin  → toutes les commandes
// Client → uniquement les siennes (filtré par userId)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user     = session!.user as any;
    const isStaff  = user.role === 'admin' || user.role === 'employe';
    const filter: Record<string, unknown> = {};

    const { searchParams } = new URL(req.url);
    const statut      = searchParams.get('statut');
    const clientEmail = searchParams.get('clientEmail');

    if (!isStaff) {
      // Client : ses propres commandes uniquement
      filter.userId = user.id;
    } else if (clientEmail) {
      // Staff : filtre par email client (utilisé par la modale RDV admin)
      // Match insensible à la casse car les emails sont sauvegardés tels quels
      const escaped = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.clientEmail = { $regex: `^${escaped}$`, $options: 'i' };
    }

    if (statut) filter.statut = statut;

    const commandes = await CommandeAchat
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(commandes);
  } catch (err) {
    console.error('[GET /api/commandes]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/commandes ──────────────────────────────────────────────────────
// Accessible à tout le monde (connecté ou invité)
// Body attendu :
// {
//   clientNom:   string,
//   clientEmail: string,
//   articles: [{
//     produitId, nom, description, image, prix, quantite
//   }]
// }
export async function POST(req: NextRequest) {
  // Anti-spam : limite par IP
  const rl = rateLimit({ key: `commandes:${getClientIp(req)}`, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de commandes en peu de temps. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  try {
    await connectDB();
    const session = await getSession();
    const body    = await req.json();

    const { clientNom, clientEmail, articles } = body;

    // ── Validation basique ──────────────────────────────────────────────────
    if (!clientNom || !clientEmail) {
      return NextResponse.json(
        { error: 'clientNom et clientEmail sont requis.' },
        { status: 400 }
      );
    }
    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un article est requis.' },
        { status: 400 }
      );
    }

    // ── Intégrité des prix ───────────────────────────────────────────────────
    // On NE fait PAS confiance au prix envoyé par le client : on recharge chaque
    // produit actif depuis la base et on reconstruit les articles avec le prix
    // serveur. Empêche un client de commander à un prix arbitraire.
    const ids = articles
      .map((a: any) => a?.produitId)
      .filter((id: any) => typeof id === 'string');
    const produits = await Produit.find({ _id: { $in: ids }, actif: true })
      .select('nom description prix image images')
      .lean();
    const byId = new Map(produits.map(p => [p._id.toString(), p]));

    const safeArticles = [];
    for (const a of articles) {
      const p = typeof a?.produitId === 'string' ? byId.get(a.produitId) : undefined;
      if (!p) {
        return NextResponse.json(
          { error: 'Un des produits commandés est introuvable ou indisponible.' },
          { status: 409 },
        );
      }
      const quantite = Math.max(1, Math.min(99, parseInt(a?.quantite, 10) || 1));
      safeArticles.push({
        produitId:   p._id,
        nom:         p.nom,
        description: p.description ?? '',
        image:       p.images?.[0] || p.image || '',
        prix:        p.prix,          // ← prix de référence serveur
        quantite,
      });
    }

    // ── Création ────────────────────────────────────────────────────────────
    // Numéro unique 6 caractères généré et réservé atomiquement
    const numero = await generateUniqueNumero('commande');

    const commande = await CommandeAchat.create({
      numero,
      userId:      session?.user ? (session.user as any).id : null,
      clientNom,
      clientEmail,
      articles:    safeArticles,    // les totaux sont calculés dans le hook pre-save
    });

    return NextResponse.json(commande, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/commandes]', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
