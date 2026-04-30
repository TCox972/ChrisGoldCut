import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
<<<<<<< HEAD
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
=======
import { requireAuth } from '@/lib/auth';

// ─── Configuration fidélité ──────────────────────────────────────────────────
// Une réduction de REWARD_EUR est offerte toutes les PALIER prestations validées.
export const PALIER      = 6;
export const REWARD_EUR  = 10;

// ─── GET /api/fidelite ───────────────────────────────────────────────────────
// Retourne le compteur de fidélité d'un client.
// - Client  : ses propres stats (filtre forcé par userId)
// - Staff   : peut préciser ?userId=... ou ?clientEmail=...
//
// Réponse :
// {
//   totalValidees:            number,  // total historique
//   cycleCount:               number,  // 0..PALIER-1 : avancement dans le cycle courant
//   reservationsUntilReward:  number,  // 1..PALIER (nb de RDV restants avant la prochaine prime)
//   palier:                   number,  // constante
//   rewardEur:                number,  // constante
// }
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user    = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = { prestationValidee: true };
<<<<<<< HEAD
    let targetUserId: string | null = null;
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272

    if (isStaff) {
      const userId      = searchParams.get('userId');
      const clientEmail = searchParams.get('clientEmail');
      if (userId) {
        filter.userId = userId;
<<<<<<< HEAD
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
=======
      } else if (clientEmail) {
        const escaped = clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.clientEmail = { $regex: `^${escaped}$`, $options: 'i' };
      } else {
        // Staff qui consulte sans préciser → on retombe sur son propre compteur
        filter.userId = user.id;
      }
    } else {
      filter.userId = user.id;
    }

    const totalValidees            = await Reservation.countDocuments(filter);
    const cycleCount               = totalValidees % PALIER;
    const reservationsUntilReward  = PALIER - cycleCount; // cycleCount=0 → 6, cycleCount=5 → 1

    return NextResponse.json({
      totalValidees,
      cycleCount,
      reservationsUntilReward,
      palier:    PALIER,
      rewardEur: REWARD_EUR,
    });
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  } catch (err) {
    console.error('[GET /api/fidelite]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
