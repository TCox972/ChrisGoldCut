import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import BlockedSlot from '@/models/BlockedSlot';
import { requireStaff } from '@/lib/auth';

// ─── POST /api/blocked-slots/bulk ────────────────────────────────────────────
// Body: { dates: [...], heures: [...], action: "block"|"unblock", employeId?: "xxx"|null }
export async function POST(req: NextRequest) {
  const { session, error } = await requireStaff();
  if (error) return error;

  try {
    await connectDB();
    const { dates, heures, action, employeId: reqEmployeId } = await req.json();

    if (!Array.isArray(dates) || !Array.isArray(heures) || !['block', 'unblock'].includes(action)) {
      return NextResponse.json(
        { error: 'dates (string[]), heures (string[]) et action ("block"|"unblock") requis.' },
        { status: 400 }
      );
    }

    const user = session!.user as any;
<<<<<<< HEAD
    const isAdmin = user.role === 'admin';
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    let effectiveEmployeId: string | null = null;
    if (user.role === 'employe') {
      effectiveEmployeId = user.id;
    } else {
      effectiveEmployeId = reqEmployeId ?? null;
    }

    for (const dateStr of dates) {
      const dayStart = new Date(`${dateStr}T00:00:00`);
      const dayEnd   = new Date(`${dateStr}T23:59:59`);

      let doc = await BlockedSlot.findOne({
        date: { $gte: dayStart, $lte: dayEnd },
        employeId: effectiveEmployeId,
      });

      if (action === 'block') {
        if (!doc) {
          await BlockedSlot.create({
            date: dayStart,
            heures: (heures as string[]).slice().sort(),
            employeId: effectiveEmployeId,
<<<<<<< HEAD
            adminHeures: isAdmin ? (heures as string[]).slice().sort() : [],
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
          });
        } else {
          const set = new Set(doc.heures);
          for (const h of heures as string[]) set.add(h);
          doc.heures = Array.from(set).sort();
<<<<<<< HEAD
          if (isAdmin) {
            const adminSet = new Set(doc.adminHeures || []);
            for (const h of heures as string[]) adminSet.add(h);
            doc.adminHeures = Array.from(adminSet).sort();
          }
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
          await doc.save();
        }
      } else {
        if (doc) {
<<<<<<< HEAD
          // Un employé ne peut pas débloquer les créneaux admin
          const adminSet = new Set(doc.adminHeures || []);
          const heuresToUnblock = isAdmin
            ? (heures as string[])
            : (heures as string[]).filter((h: string) => !adminSet.has(h));

          doc.heures = doc.heures.filter((h: string) => !heuresToUnblock.includes(h));
          if (isAdmin) {
            doc.adminHeures = (doc.adminHeures || []).filter((h: string) => !(heures as string[]).includes(h));
          }
=======
          doc.heures = doc.heures.filter((h: string) => !heures.includes(h));
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
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
