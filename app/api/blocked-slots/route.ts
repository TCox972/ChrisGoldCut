import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import BlockedSlot from '@/models/BlockedSlot';
import { requireStaff } from '@/lib/auth';

// ─── GET /api/blocked-slots?month=2026-04&employeId=xxx ─────────────────────
// Retourne les créneaux bloqués pour un mois.
// employeId optionnel : si absent, retourne les blocages globaux + ceux de tous les employés
export async function GET(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const month      = searchParams.get('month');
  const employeId  = searchParams.get('employeId');

  if (!month) {
    return NextResponse.json({ error: 'Paramètre month requis.' }, { status: 400 });
  }

  try {
    await connectDB();
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end   = new Date(year, m, 0, 23, 59, 59);

    const filter: Record<string, unknown> = {
      date: { $gte: start, $lte: end },
    };

    const user = session!.user as any;
    if (user.role === 'employe') {
      // Un employé ne voit que ses propres blocages + les globaux
      filter.$or = [{ employeId: null }, { employeId: user.id }];
    } else if (employeId) {
      // Admin filtre par employé spécifique
      filter.$or = [{ employeId: null }, { employeId }];
    }

    const blocked = await BlockedSlot.find(filter).lean();
    return NextResponse.json(blocked);
  } catch (err) {
    console.error('[GET /api/blocked-slots]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/blocked-slots ─────────────────────────────────────────────────
// Body: { date: "2026-04-10", heure: "09:00", employeId?: "xxx" | null }
// Toggle : ajoute ou retire le créneau bloqué
// - Admin: peut bloquer pour tout le monde (employeId=null) ou un employé spécifique
// - Employé: ne peut bloquer que ses propres créneaux
export async function POST(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (error) return error;

  try {
    await connectDB();
    const { date: dateStr, heure, employeId: reqEmployeId } = await req.json();

    if (!dateStr || !heure) {
      return NextResponse.json({ error: 'date et heure requis.' }, { status: 400 });
    }

    const user = session!.user as any;

    // Déterminer l'employeId effectif
    let effectiveEmployeId: string | null = null;
    if (user.role === 'employe') {
      // Un employé ne peut bloquer que ses propres créneaux
      effectiveEmployeId = user.id;
    } else {
      // Admin : null = global, sinon ID spécifique
      effectiveEmployeId = reqEmployeId ?? null;
    }

    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd   = new Date(`${dateStr}T23:59:59`);

    const query: Record<string, unknown> = {
      date: { $gte: dayStart, $lte: dayEnd },
      employeId: effectiveEmployeId,
    };

    let doc = await BlockedSlot.findOne(query);

    if (!doc) {
      doc = await BlockedSlot.create({
        date: dayStart,
        heures: [heure],
        employeId: effectiveEmployeId,
      });
    } else if (doc.heures.includes(heure)) {
      doc.heures = doc.heures.filter(h => h !== heure);
      if (doc.heures.length === 0) {
        await BlockedSlot.findByIdAndDelete(doc._id);
        return NextResponse.json({ heures: [], employeId: effectiveEmployeId });
      }
      await doc.save();
    } else {
      doc.heures.push(heure);
      doc.heures.sort();
      await doc.save();
    }

    return NextResponse.json({ heures: doc.heures, employeId: effectiveEmployeId });
  } catch (err) {
    console.error('[POST /api/blocked-slots]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
