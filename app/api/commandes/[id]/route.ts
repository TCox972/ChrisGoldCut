import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CommandeAchat from '@/models/CommandeAchat';
import { requireAuth } from '@/lib/auth';

type Params = { params: { id: string } };

// ─── GET /api/commandes/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const commande = await CommandeAchat.findById(params.id).lean();
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const user = session!.user as any;
    // Un client ne peut voir que ses propres commandes
    if (user.role !== 'admin' && commande.userId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    return NextResponse.json(commande);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/commandes/[id] ────────────────────────────────────────────────
// Client : peut annuler ou modifier les quantités de ses commandes "en-attente"
// Staff  : peut annuler, ou marquer un article comme livré
//
// Body accepté :
//   { statut: 'annulee' }                         → annulation
//   { articles: [...] }                           → modification quantités (client)
//   { livrerArticleIndex: number }                → marquer un article livré (staff)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const body    = await req.json();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    const commande = await CommandeAchat.findById(params.id);

    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    // ── Vérification propriété ──────────────────────────────────────────────
    if (!isStaff && commande.userId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // ── Commande déjà annulée ───────────────────────────────────────────────
    if (commande.statut === 'annulee') {
      return NextResponse.json(
        { error: 'Cette commande est déjà annulée.' },
        { status: 400 }
      );
    }

    // ── Annulation ──────────────────────────────────────────────────────────
    if (body.statut === 'annulee') {
      commande.statut = 'annulee';
    }

    // ── Marquer un article comme livré (staff uniquement) ──────────────────
    // On passe par le driver MongoDB natif (commande.collection) pour bypasser
    // le cache de schéma Mongoose (qui peut strip le champ `livre` après un HMR).
    if (isStaff && typeof body.livrerArticleIndex === 'number') {
      const idx = body.livrerArticleIndex;
      if (idx < 0 || idx >= commande.articles.length) {
        return NextResponse.json(
          { error: `Article index ${idx} introuvable (articles: ${commande.articles.length}).` },
          { status: 400 }
        );
      }
      const livre = body.livre !== false;

      const result = await CommandeAchat.collection.updateOne(
        { _id: commande._id },
        { $set: { [`articles.${idx}.livre`]: livre } }
      );
      console.log('[PATCH livrer] updateOne result', {
        id: commande._id.toString(),
        idx,
        livre,
        matched: result.matchedCount,
        modified: result.modifiedCount,
      });

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Commande introuvable lors de la mise à jour.' }, { status: 500 });
      }

      // Relecture via le driver natif (bypass total de Mongoose) pour être
      // certain de renvoyer la valeur réellement persistée en base.
      const updated = await CommandeAchat.collection.findOne({ _id: commande._id });
      console.log('[PATCH livrer] re-read livre =', (updated as any)?.articles?.[idx]?.livre);

      return NextResponse.json(updated);
    }

    // ── Modification des quantités (client uniquement) ──────────────────────
    if (body.articles && !isStaff) {
      // Valide que l'utilisateur ne modifie pas les produits, juste les quantités
      const nouveauxArticles: typeof commande.articles = body.articles.map((a: any) => {
        const existing = commande.articles.find(
          (e: any) => e.produitId.toString() === a.produitId
        );
        if (!existing) return null;
<<<<<<< HEAD
        return { ...(existing as any).toObject(), quantite: Math.max(1, parseInt(a.quantite)) };
=======
        return { ...existing.toObject(), quantite: Math.max(1, parseInt(a.quantite)) };
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
      }).filter(Boolean);

      if (nouveauxArticles.length === 0) {
        return NextResponse.json({ error: 'Aucun article valide.' }, { status: 400 });
      }

      commande.articles = nouveauxArticles;
    }

    await commande.save(); // recalcule sousTotal, remise, total via pre-save

    return NextResponse.json(commande);
  } catch (err: any) {
    console.error('[PATCH /api/commandes/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/commandes/[id] ───────────────────────────────────────────────
// Admin : peut supprimer n'importe quelle commande
// Client : peut supprimer uniquement ses propres commandes
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user = session!.user as any;
    const commande = await CommandeAchat.findById(params.id);
    if (!commande) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });

    if (user.role !== 'admin' && commande.userId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    await CommandeAchat.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Commande supprimée.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
