import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import Prestation from '@/models/Prestation';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/finances/all ───────────────────────────────────────────────────
// Récapitulatif mensuel pour TOUS les coiffeurs du salon.
// Admin uniquement.
// Query : ?month=YYYY-MM (défaut = mois courant)
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');

    let year: number, m0: number;
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      year = y;
      m0   = m - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      m0   = now.getMonth();
    }
    const start = new Date(year, m0,     1, 0, 0, 0, 0);
    const end   = new Date(year, m0 + 1, 0, 23, 59, 59, 999);

    // Prix par prestation
    const allPresta = await Prestation.find().select('nom prix').lean();
    const priceByName = new Map<string, number>();
    for (const p of allPresta) priceByName.set(p.nom, p.prix);

    // Tous les staff
    const staff = await User.find({ role: { $in: ['admin', 'employe'] } })
      .select('prenom nom role objectifMensuel')
      .lean();

    // Toutes les réservations du mois (hors annulées) via driver natif
    // pour récupérer fideliteReductionEur fiable
    const rdvs = await Reservation.collection
      .find({
        statut: { $ne: 'annule' },
        date:   { $gte: start, $lte: end },
      })
      .toArray();

    // Agrégation par employé
    type Bucket = {
      employeId:       string;
      employeNom:      string;
      role:            string;
      objectifMensuel: number;
      caEffectuees:    number;
      countEffectuees: number;
      caAVenir:        number;
      countAVenir:     number;
    };
    const buckets = new Map<string, Bucket>();
    for (const s of staff) {
      const id = String(s._id);
      buckets.set(id, {
        employeId:       id,
        employeNom:      `${s.prenom} ${s.nom}`.trim(),
        role:            s.role,
        objectifMensuel: s.objectifMensuel ?? 0,
        caEffectuees:    0,
        countEffectuees: 0,
        caAVenir:        0,
        countAVenir:     0,
      });
    }

    for (const r of rdvs) {
      const empId = r.employeId ? String(r.employeId) : null;
      if (!empId) continue;
      const bucket = buckets.get(empId);
      if (!bucket) continue;

      const prestations: string[] = Array.isArray(r.prestations) ? r.prestations : [];
      const brut = prestations.reduce((acc, nom) => acc + (priceByName.get(nom) ?? 0), 0);
      const fidelite = Number(r.fideliteReductionEur ?? 0);
      const ca = Math.max(0, brut - fidelite);

      if (r.prestationValidee) {
        bucket.caEffectuees    += ca;
        bucket.countEffectuees += 1;
      } else {
        bucket.caAVenir    += ca;
        bucket.countAVenir += 1;
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const list = Array.from(buckets.values()).map(b => ({
      ...b,
      caEffectuees: round2(b.caEffectuees),
      caAVenir:     round2(b.caAVenir),
      caTotal:      round2(b.caEffectuees + b.caAVenir),
    }));

    // Tri : admin d'abord, puis par CA total décroissant
    list.sort((a, b) => b.caTotal - a.caTotal);

    const totalSalon = round2(list.reduce((s, b) => s + b.caTotal, 0));

    return NextResponse.json({
      month: `${year}-${String(m0 + 1).padStart(2, '0')}`,
      totalSalon,
      coiffeurs: list,
    });
  } catch (err) {
    console.error('[GET /api/finances/all]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
