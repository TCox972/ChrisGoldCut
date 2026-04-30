import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

// ─── Configuration fidélité ──────────────────────────────────────────────────
const PALIER      = 6;
const REWARD_EUR  = 10;

function buildEntry(pourQui: string, label: string, count: number) {
  return {
    pourQui,
    label,
    totalValidees: count,
    cycleCount: count % PALIER,
    reservationsUntilReward: PALIER - (count % PALIER),
    palier: PALIER,
    rewardEur: REWARD_EUR,
  };
}

// ─── GET /api/fidelite ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = { prestationValidee: true };
    let targetUserId: string | null = null;

    if (isStaff) {
      const userId      = searchParams.get('userId');
      const clientEmail = searchParams.get('clientEmail');
      if (userId) {
        filter.userId = userId;
        targetUserId = userId;
      } else if (clientEmail) {
        const escaped = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.clientEmail = { $regex: `^${escaped}$`, $options: 'i' };
        // Trouver le userId correspondant pour récupérer le profil
        const found = await User.findOne({ email: clientEmail.toLowerCase() }).select('_id').lean();
        if (found) targetUserId = found._id.toString();
      } else {
        filter.userId = user.id;
        targetUserId = user.id;
      }
    } else {
      filter.userId = user.id;
      targetUserId = user.id;
    }

    // Récupérer toutes les réservations validées
    const rdvs = await Reservation.find(filter).select('pourQui').lean();

    // Compter par pourQui
    const countByPourQui = new Map<string, number>();
    for (const rdv of rdvs) {
      const key = rdv.pourQui || 'moi';
      countByPourQui.set(key, (countByPourQui.get(key) || 0) + 1);
    }

    // Récupérer le profil pour les noms
    let userPrenom = '';
    let userNom = '';
    const autresPersonnes: { prenom: string; nom: string }[] = [];
    if (targetUserId) {
      const userDoc = await User.findById(targetUserId).select('prenom nom autresPersonnes').lean();
      if (userDoc) {
        userPrenom = userDoc.prenom || '';
        userNom = userDoc.nom || '';
        if (userDoc.autresPersonnes) {
          autresPersonnes.push(...userDoc.autresPersonnes);
        }
      }
    }

    // Noms possibles du propriétaire (le formulaire stocke le prénom ou "prénom nom")
    // On fusionne tous ces alias en une seule jauge "Moi"
    const ownerAliases = new Set<string>(['moi']);
    if (userPrenom) {
      ownerAliases.add(userPrenom);
      ownerAliases.add(userPrenom.toLowerCase());
    }
    if (userPrenom && userNom) {
      ownerAliases.add(`${userPrenom} ${userNom}`.trim());
      ownerAliases.add(`${userPrenom} ${userNom}`.trim().toLowerCase());
    }

    // Compter les RDV du propriétaire (toutes les variantes fusionnées)
    let ownerCount = 0;
    for (const [key, count] of Array.from(countByPourQui.entries())) {
      if (ownerAliases.has(key) || ownerAliases.has(key.toLowerCase())) {
        ownerCount += count;
      }
    }

    // Noms complets des proches
    const procheNames = autresPersonnes.map(p => `${p.prenom} ${p.nom}`.trim());
    const procheNamesLower = new Set(procheNames.map(n => n.toLowerCase()));

    const personnes = [];

    // Propriétaire du compte
    personnes.push(buildEntry(
      'moi',
      userPrenom ? `Moi (${userPrenom})` : 'Moi',
      ownerCount,
    ));

    // Proches enregistrés
    for (let i = 0; i < autresPersonnes.length; i++) {
      const fullName = procheNames[i];
      const count = countByPourQui.get(fullName) || 0;
      personnes.push(buildEntry(fullName, fullName, count));
    }

    // Autres pourQui non rattachés (anciens proches supprimés, etc.)
    for (const [key, count] of Array.from(countByPourQui.entries())) {
      // Ignorer si c'est le propriétaire ou un proche connu
      if (ownerAliases.has(key) || ownerAliases.has(key.toLowerCase())) continue;
      if (procheNamesLower.has(key.toLowerCase())) continue;
      personnes.push(buildEntry(key, key, count));
    }

    return NextResponse.json({ personnes });
  } catch (err) {
    console.error('[GET /api/fidelite]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
