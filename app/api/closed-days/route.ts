import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ClosedDay from '@/models/ClosedDay';
import { requireAdmin } from '@/lib/auth';

// ─── GET /api/closed-days?month=2026-04 ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0, 23, 59, 59) };
    }

    const days = await ClosedDay.find(filter).sort({ date: 1 }).lean();
    return NextResponse.json(days);
  } catch (err) {
    console.error('[GET /api/closed-days]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── POST /api/closed-days ──────────────────────────────────────────────────
// Body: { date: "2026-04-10", motif?: "Jour férié" }
// Toggle : ajoute ou supprime le jour de fermeture
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { date: dateStr, motif } = await req.json();

    if (!dateStr) {
      return NextResponse.json({ error: 'Date requise.' }, { status: 400 });
    }

    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd   = new Date(`${dateStr}T23:59:59`);

    const existing = await ClosedDay.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (existing) {
      await ClosedDay.findByIdAndDelete(existing._id);
      return NextResponse.json({ removed: true });
    }

    const doc = await ClosedDay.create({ date: dayStart, motif: motif ?? '' });
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('[POST /api/closed-days]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
