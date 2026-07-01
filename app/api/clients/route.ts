import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import Prestation from '@/models/Prestation';
import { requireStaff } from '@/lib/auth';
import { FIDELITE_PALIER, estEligibleFidelite } from '@/lib/fidelite';

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Staff (admin + employé) — liste paginée des clients avec stats enrichies.
// (Les employés en ont besoin pour créer un RDV au nom d'un client inscrit.)
// Query :
//   ?q=<recherche>  (nom, prénom, email ou téléphone)
//   ?page=N         (défaut: 1)
//   ?limit=N        (défaut: 50, max: 200)
//
// Réponse paginée : { clients: [...], total, page, limit }
// Si `page` n'est PAS fourni, on retourne le tableau brut (compat ascendante).
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const { error } = await requireStaff();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const pageParam  = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const paginated  = pageParam !== null;

    const page  = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );

    // Filtre de recherche
    const filter: Record<string, unknown> = { role: 'client' };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { prenom:    { $regex: escaped, $options: 'i' } },
        { nom:       { $regex: escaped, $options: 'i' } },
        { email:     { $regex: escaped, $options: 'i' } },
        { telephone: { $regex: escaped, $options: 'i' } },
      ];
    }

    // Total (pour l'UI de pagination), calculé en parallèle de la requête principale
    const totalPromise = paginated ? User.countDocuments(filter) : Promise.resolve(0);

    const query = User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    if (paginated) {
      query.skip((page - 1) * limit).limit(limit);
    }

    const [clients, total] = await Promise.all([query.lean(), totalPromise]);

    // Toutes les réservations validées pour les stats (batch, pas N+1)
    const clientIds = clients.map(c => c._id);
    const allRdvs = await Reservation.find({
      userId: { $in: clientIds },
      statut: { $ne: 'annule' },
    })
      .select('userId date prestations prestationValidee')
      .sort({ date: -1 })
      .lean();

    // Table nom → prix pour évaluer l'éligibilité fidélité (CA prestations ≥ 25 €).
    const prestaDocs = await Prestation.find().select('nom prix').lean();
    const priceByNom = new Map(prestaDocs.map(p => [p.nom, p.prix]));

    // Grouper par userId
    const rdvsByUser = new Map<string, typeof allRdvs>();
    for (const r of allRdvs) {
      const uid = String(r.userId);
      if (!rdvsByUser.has(uid)) rdvsByUser.set(uid, []);
      rdvsByUser.get(uid)!.push(r);
    }

    const enriched = clients.map(client => {
      const uid = String(client._id);
      const rdvs = rdvsByUser.get(uid) ?? [];
      const validated = rdvs.filter(r => r.prestationValidee);

      // Dernière réservation (la plus récente, triée desc)
      const derniereReservation = rdvs.length > 0
        ? { date: (rdvs[0].date as Date).toISOString() }
        : null;

      // Nombre de réservations effectuées (validées)
      const nbReservations = validated.length;

      // Fidélité : seules les réservations validées éligibles (CA prestations
      // ≥ 25 €) comptent pour un point.
      const palier = FIDELITE_PALIER;
      const nbPoints = validated.filter(r => estEligibleFidelite(r.prestations, priceByNom)).length;
      const cycleCount = nbPoints % palier;
      const reservationsUntilReward = palier - cycleCount;

      // Prestations favorites (top 3)
      const prestaCount = new Map<string, number>();
      for (const r of validated) {
        for (const p of (r.prestations ?? [])) {
          prestaCount.set(p, (prestaCount.get(p) ?? 0) + 1);
        }
      }
      const prestationsFavorites = Array.from(prestaCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nom, count]) => ({ nom, count }));

      // Fréquence moyenne (jours entre réservations validées)
      let frequenceMoyenneJours: number | null = null;
      if (validated.length >= 2) {
        const timestamps = validated
          .map(r => new Date(String(r.date)).getTime())
          .filter(t => !isNaN(t))
          .sort((a, b) => a - b);
        if (timestamps.length >= 2) {
          const first = timestamps[0];
          const last  = timestamps[timestamps.length - 1];
          const diffMs = last - first;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          frequenceMoyenneJours = Math.max(1, Math.round(diffDays / (timestamps.length - 1)));
        }
      }

      return {
        ...client,
        derniereReservation,
        nbReservations,
        fidelite: { cycleCount, reservationsUntilReward, palier },
        prestationsFavorites,
        frequenceMoyenneJours,
      };
    });

    if (paginated) {
      return NextResponse.json({ clients: enriched, total, page, limit });
    }
    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
