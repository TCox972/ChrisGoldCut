import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import BlockedSlot from '@/models/BlockedSlot';
import { requireStaff } from '@/lib/auth';
import { dayStartUTC, dayEndUTC } from '@/lib/dates';

// ─── POST /api/blocked-slots/bulk ────────────────────────────────────────────
// Body: {
//   slots: [{ date: "YYYY-MM-DD", heures: ["09:00", "09:30", ...] }, ...],
//   action: "block" | "unblock",
//   employeId?: "xxx" | null
// }
// Chaque date a SES propres heures (fix : avant on appliquait toutes les heures
// à toutes les dates, ce qui bloquait par erreur des créneaux non sélectionnés).
type SlotEntry = { date: string; heures: string[] };

export async function POST(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { action, employeId: reqEmployeId } = body;

    // Acceptation de deux formats :
    //  - nouveau : { slots: [{date, heures}], ... }
    //  - ancien  : { dates: [...], heures: [...], ... }  (legacy, conservé pour
    //              compatibilité, mais à éviter — applique heures à chaque date)
    let slots: SlotEntry[];
    if (Array.isArray(body.slots)) {
      slots = body.slots;
    } else if (Array.isArray(body.dates) && Array.isArray(body.heures)) {
      slots = body.dates.map((date: string) => ({ date, heures: body.heures as string[] }));
    } else {
      return NextResponse.json(
        { error: 'slots ([{date, heures}]) et action ("block"|"unblock") requis.' },
        { status: 400 },
      );
    }

    if (!['block', 'unblock'].includes(action)) {
      return NextResponse.json({ error: 'action invalide.' }, { status: 400 });
    }

    const user = session!.user as any;
    const isAdmin = user.role === 'admin';
    const effectiveEmployeId: string | null = user.role === 'employe'
      ? user.id
      : (reqEmployeId ?? null);

    for (const entry of slots) {
      if (!entry?.date || !Array.isArray(entry.heures) || entry.heures.length === 0) continue;

      const dayStart = dayStartUTC(entry.date);
      const dayEnd   = dayEndUTC(entry.date);
      const heures   = entry.heures;

      let doc = await BlockedSlot.findOne({
        date: { $gte: dayStart, $lte: dayEnd },
        employeId: effectiveEmployeId,
      });

      if (action === 'block') {
        if (!doc) {
          await BlockedSlot.create({
            date: dayStart,
            heures: heures.slice().sort(),
            employeId: effectiveEmployeId,
            adminHeures: isAdmin ? heures.slice().sort() : [],
          });
        } else {
          const set = new Set(doc.heures);
          for (const h of heures) set.add(h);
          doc.heures = Array.from(set).sort();
          if (isAdmin) {
            const adminSet = new Set(doc.adminHeures || []);
            for (const h of heures) adminSet.add(h);
            doc.adminHeures = Array.from(adminSet).sort();
          }
          await doc.save();
        }
      } else {
        if (doc) {
          // Un employé ne peut pas débloquer les créneaux posés par un admin
          const adminSet = new Set(doc.adminHeures || []);
          const heuresToUnblock = isAdmin
            ? heures
            : heures.filter((h: string) => !adminSet.has(h));

          doc.heures = doc.heures.filter((h: string) => !heuresToUnblock.includes(h));
          if (isAdmin) {
            doc.adminHeures = (doc.adminHeures || []).filter((h: string) => !heures.includes(h));
          }
          if (doc.heures.length === 0) {
            await BlockedSlot.findByIdAndDelete(doc._id);
          } else {
            await doc.save();
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/blocked-slots/bulk]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
