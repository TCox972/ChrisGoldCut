import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Reservation from '@/models/Reservation';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Admin uniquement — liste tous les clients avec stats enrichies.
// Query : ?q=<recherche> (nom, prénom ou téléphone)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    // Filtre de recherche
    const filter: Record<string, unknown> = { role: 'client' };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { prenom:    { $regex: escaped, $options: 'i' } },
        { nom:       { $regex: escaped, $options: 'i' } },
        { telephone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const clients = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Toutes les réservations validées pour les stats (batch, pas N+1)
    const clientIds = clients.map(c => c._id);
    const allRdvs = await Reservation.find({
      userId: { $in: clientIds },
      statut: { $ne: 'annule' },
    })
      .select('userId date prestations prestationValidee')
      .sort({ date: -1 })
      .lean();

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

      // Fidélité
      const palier = 6;
      const cycleCount = nbReservations % palier;
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

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
