import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import Prestation from '@/models/Prestation';
import User from '@/models/User';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMonthParam(month: string | null): { year: number; m0: number } {
  if (month) {
    const [y, m] = month.split('-').map(Number);
    if (y && m >= 1 && m <= 12) return { year: y, m0: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), m0: now.getMonth() };
}

function monthRange(year: number, m0: number): { start: Date; end: Date } {
  // Bornes UTC alignées avec le stockage UTC des dates de RDV
  return {
    start: new Date(Date.UTC(year, m0, 1, 0, 0, 0, 0)),
    end:   new Date(Date.UTC(year, m0 + 1, 0, 23, 59, 59, 999)),
  };
}

/** Somme des prix des prestations d'un RDV, moins la prime fidélité éventuelle. */
function computeRdvCa(
  prestations: string[] | undefined,
  priceByName: Map<string, number>,
  fideliteReductionEur: number,
): number {
  const brut = (prestations ?? []).reduce(
    (acc, nom) => acc + (priceByName.get(nom) ?? 0),
    0,
  );
  return Math.max(0, brut - (fideliteReductionEur || 0));
}

// ─── GET /api/finances ───────────────────────────────────────────────────────
// Stats du mois pour un employé (staff only).
// Query : ?month=YYYY-MM (défaut = mois courant), ?employeId=<id>
//  - Un employé ne peut voir que ses propres stats (employeId forcé à son id)
//  - L'admin peut voir n'importe quel employé (par défaut : lui-même)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    if (!isStaff) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedEmployeId = searchParams.get('employeId');
    const { year, m0 } = parseMonthParam(searchParams.get('month'));
    const { start, end } = monthRange(year, m0);

    // Employé cible
    let targetId: string;
    if (user.role === 'admin') {
      targetId = requestedEmployeId || user.id;
    } else {
      targetId = user.id;
    }

    const employe = await User.findById(targetId).select('prenom nom role objectifMensuel').lean();
    if (!employe) {
      return NextResponse.json({ error: 'Employé introuvable.' }, { status: 404 });
    }

    // Toutes les réservations du mois pour cet employé (hors annulées)
    const rdvs = await Reservation.find({
      employeId: targetId,
      statut:    { $nin: ['annule', 'absent'] },
      date:      { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();

    // Map prix par nom de prestation
    const allPresta = await Prestation.find().select('nom prix').lean();
    const priceByName = new Map<string, number>();
    for (const p of allPresta) priceByName.set(p.nom, p.prix);

    // Relecture native pour récupérer fideliteReductionEur (cache HMR)
    const freshRdvs = await Reservation.collection
      .find({
        employeId: employe._id,
        statut:    { $nin: ['annule', 'absent'] },
        date:      { $gte: start, $lte: end },
      })
      .toArray();
    const fideliteById = new Map<string, number>();
    for (const r of freshRdvs) {
      fideliteById.set(String(r._id), Number(r.fideliteReductionEur ?? 0));
    }

    type RdvLite = {
      _id:                string;
      numero:             string;
      clientNom:          string;
      date:               string;
      prestations:        string[];
      dureeMinutes:       number;
      prestationValidee:  boolean;
      fideliteReductionEur: number;
      ca:                 number;
    };

    const effectuees: RdvLite[] = [];
    const aVenir:     RdvLite[] = [];
    let caEffectuees = 0;
    let caAVenir     = 0;

    for (const r of rdvs) {
      const id = String(r._id);
      const fidelite = fideliteById.get(id) ?? 0;
      const ca = computeRdvCa(r.prestations, priceByName, fidelite);
      const lite: RdvLite = {
        _id:                 id,
        numero:              r.numero,
        clientNom:           r.clientNom,
        date:                (r.date as Date).toISOString(),
        prestations:         r.prestations ?? [],
        dureeMinutes:        r.dureeMinutes,
        prestationValidee:   r.prestationValidee ?? false,
        fideliteReductionEur: fidelite,
        ca,
      };

      if (r.prestationValidee) {
        effectuees.push(lite);
        caEffectuees += ca;
      } else {
        aVenir.push(lite);
        caAVenir += ca;
      }
    }

    // Arrondi à 2 décimales
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      employeId:       String(employe._id),
      employeNom:      `${employe.prenom} ${employe.nom}`.trim(),
      role:            employe.role,
      month:           `${year}-${String(m0 + 1).padStart(2, '0')}`,
      objectifMensuel: employe.objectifMensuel ?? 0,
      effectuees: {
        count: effectuees.length,
        ca:    round2(caEffectuees),
        rdvs:  effectuees,
      },
      aVenir: {
        count: aVenir.length,
        ca:    round2(caAVenir),
        rdvs:  aVenir,
      },
      caTotal: round2(caEffectuees + caAVenir),
    });
  } catch (err) {
    console.error('[GET /api/finances]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/finances ─────────────────────────────────────────────────────
// Permet à un employé de fixer son propre objectif mensuel ; l'admin peut
// fixer l'objectif de n'importe quel employé via `employeId`.
// Body : { objectifMensuel: number, employeId?: string }
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    if (!isStaff) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await req.json();
    const objectifMensuel = Number(body.objectifMensuel);
    if (!Number.isFinite(objectifMensuel) || objectifMensuel < 0) {
      return NextResponse.json(
        { error: 'objectifMensuel doit être un nombre positif.' },
        { status: 400 },
      );
    }

    let targetId: string;
    if (user.role === 'admin') {
      targetId = body.employeId || user.id;
    } else {
      targetId = user.id;
    }

    // Bypass du cache de schéma Mongoose via le driver natif.
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(targetId) },
      { $set: { objectifMensuel } },
    );

    return NextResponse.json({ employeId: targetId, objectifMensuel });
  } catch (err) {
    console.error('[PATCH /api/finances]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
