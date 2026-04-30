import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import BlockedSlot from '@/models/BlockedSlot';
import ClosedDay from '@/models/ClosedDay';
import Prestation from '@/models/Prestation';
import { requireAuth } from '@/lib/auth';
import { dateToSlot, generateAllSlots, getOccupiedSlots, isSlotAvailable, parseDuree } from '@/lib/slots';
<<<<<<< HEAD
import { notifyCancellation, notifyDelay } from '@/lib/notifications';
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272

type Params = { params: { id: string } };

// ─── GET /api/reservations/[id] ───────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const rdv = await Reservation.findById(params.id).lean();
    if (!rdv) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });

    // Un client ne peut voir que ses propres réservations
    const user = session!.user as any;
    if (user.role !== 'admin' && rdv.userId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    return NextResponse.json(rdv);
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── PATCH /api/reservations/[id] ─────────────────────────────────────────────
// Client : peut annuler ou modifier la date/heure de son propre RDV
// Staff  : peut signaler retard, valider la prestation, marquer produits livrés
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const user = session!.user as any;
    const isStaff = user.role === 'admin' || user.role === 'employe';

    const rdv = await Reservation.findById(params.id);
    if (!rdv) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });

    // ─── Client ────────────────────────────────────────────────────────────
    if (!isStaff) {
      if (rdv.userId?.toString() !== user.id) {
        return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
      }

      // Annulation
      if (body.statut === 'annule') {
        rdv.statut = 'annule';
        await rdv.save();
        return NextResponse.json(rdv);
      }

      // Modification date/heure
      if (body.date) {
        const newDate = new Date(body.date);
        const slot    = dateToSlot(newDate);

        if (!generateAllSlots().includes(slot)) {
          return NextResponse.json({ error: 'Créneau invalide.' }, { status: 400 });
        }

        // Refuser si dans le passé
        if (newDate.getTime() < Date.now()) {
          return NextResponse.json({ error: 'Impossible de choisir un créneau passé.' }, { status: 400 });
        }

        // Vérifier jour de fermeture
        const dateStr  = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
        const dayStart = new Date(`${dateStr}T00:00:00`);
        const dayEnd   = new Date(`${dateStr}T23:59:59`);

        const closed = await ClosedDay.findOne({ date: { $gte: dayStart, $lte: dayEnd } }).lean();
        if (closed) {
          return NextResponse.json({ error: 'Le salon est fermé ce jour-là.' }, { status: 409 });
        }

        // Vérifier disponibilité de l'employé assigné (en excluant le RDV courant)
        const empRdvs = await Reservation.find({
          _id:       { $ne: rdv._id },
          date:      { $gte: dayStart, $lte: dayEnd },
          statut:    { $ne: 'annule' },
          employeId: rdv.employeId,
        }).select('date dureeMinutes').lean();

        const blockedDocs = await BlockedSlot.find({
          date: { $gte: dayStart, $lte: dayEnd },
          $or:  [{ employeId: null }, { employeId: rdv.employeId }],
        }).lean();

        const occupiedSet = getOccupiedSlots(empRdvs);
        const blockedSet  = new Set<string>();
        for (const doc of blockedDocs) {
          for (const h of doc.heures) blockedSet.add(h);
        }

        if (!isSlotAvailable(slot, rdv.dureeMinutes, occupiedSet, blockedSet)) {
          return NextResponse.json({ error: 'Ce créneau n\'est plus disponible.' }, { status: 409 });
        }

        rdv.date = newDate;
        await rdv.save();
        return NextResponse.json(rdv);
      }

      return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 });
    }

    // ─── Staff (admin / employe) ───────────────────────────────────────────
    // Un employé ne peut modifier que ses propres RDV
    if (user.role === 'employe' && rdv.employeId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

<<<<<<< HEAD
    // ── Marquer absent (staff) ───────────────────────────────────────────
    if (body.statut === 'absent') {
      rdv.statut = 'absent';
      await Reservation.collection.updateOne({ _id: rdv._id }, { $set: { statut: 'absent' } });
      const fresh = await Reservation.collection.findOne({ _id: rdv._id });
      return NextResponse.json(fresh ?? rdv);
    }

=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    // ── Champs booléens : retardSignale / prestationValidee ───────────────
    // On contourne Mongoose (bug de cache de schéma en HMR dev qui peut
    // silencieusement ignorer les nouveaux champs) en utilisant le driver natif.
    const nativeSet: Record<string, any> = {};
    if (typeof body.retardSignale === 'boolean') {
      rdv.retardSignale = body.retardSignale;
      nativeSet.retardSignale = body.retardSignale;
<<<<<<< HEAD

      // Envoyer un SMS au client pour l'informer du retard
      if (body.retardSignale) {
        notifyDelay({
          numero: rdv.numero,
          _id: rdv._id.toString(),
          clientNom: rdv.clientNom,
          clientEmail: rdv.clientEmail,
          clientTel: rdv.clientTel,
          prestations: rdv.prestations,
          date: rdv.date,
          pourQui: rdv.pourQui,
        });
      }
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    }
    if (typeof body.prestationValidee === 'boolean') {
      const wasValidee = rdv.prestationValidee === true;
      rdv.prestationValidee = body.prestationValidee;
      nativeSet.prestationValidee = body.prestationValidee;
      if (body.prestationValidee) {
        rdv.statut = 'termine';
        nativeSet.statut = 'termine';

<<<<<<< HEAD
        // ── Fidélité par bénéficiaire (pourQui) : on compte les
        // prestations validées pour la même personne (même userId +
        // même pourQui). La 6ème (12ème, etc.) déclenche la prime.
=======
        // ── Fidélité : si c'est une nouvelle validation et qu'un userId
        // existe, on compte les autres prestations déjà validées de ce
        // client. Si cette validation devient la 6ème (ou 12ème, etc.),
        // on fige la prime de 10€ sur ce RDV.
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
        if (!wasValidee && rdv.userId) {
          const PALIER = 6;
          const REWARD_EUR = 10;
          const otherCount = await Reservation.countDocuments({
            _id:               { $ne: rdv._id },
            userId:            rdv.userId,
<<<<<<< HEAD
            pourQui:           rdv.pourQui || 'moi',
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
            prestationValidee: true,
          });
          if ((otherCount + 1) % PALIER === 0) {
            rdv.fideliteReductionEur = REWARD_EUR;
            nativeSet.fideliteReductionEur = REWARD_EUR;
          }
        }
      } else {
        // Dé-validation : on libère toute prime figée sur ce RDV.
        rdv.fideliteReductionEur = 0;
        nativeSet.fideliteReductionEur = 0;
      }
    }
    if (Object.keys(nativeSet).length > 0) {
      await Reservation.collection.updateOne({ _id: rdv._id }, { $set: nativeSet });
    }

    // Marquer un produit comme livré : { livrerProduitIndex: number, livre: boolean }
    if (typeof body.livrerProduitIndex === 'number') {
      const idx = body.livrerProduitIndex;
      if (rdv.achats[idx]) {
        rdv.achats[idx].livre = body.livre !== false;
        rdv.markModified('achats');
      }
    }

    // Admin : autres champs libres (date, employeId, statut...)
    if (user.role === 'admin') {
      // ── Modification des prestations (jusqu'à 3) ────────────────────────
      // Si on change les prestations, on recalcule la durée totale depuis la BDD
      // et on revérifie la disponibilité du créneau pour éviter les collisions.
      if (body.prestations !== undefined) {
        if (!Array.isArray(body.prestations) || body.prestations.length < 1 || body.prestations.length > 3) {
          return NextResponse.json(
            { error: 'Une réservation doit contenir entre 1 et 3 prestations.' },
            { status: 400 }
          );
        }

        // Recalcul durée totale à partir des prestations connues
        const prestaDocs = await Prestation.find({ nom: { $in: body.prestations } })
          .select('nom duree').lean();

        const dureeByNom = new Map<string, number>();
        for (const p of prestaDocs) dureeByNom.set(p.nom, parseDuree(p.duree));

        // Si certaines prestations sont inconnues, on refuse
        const inconnues = body.prestations.filter((n: string) => !dureeByNom.has(n));
        if (inconnues.length > 0) {
          return NextResponse.json(
            { error: `Prestation(s) inconnue(s) : ${inconnues.join(', ')}.` },
            { status: 400 }
          );
        }

        const nouvelleDuree = body.prestations.reduce(
          (sum: number, nom: string) => sum + (dureeByNom.get(nom) ?? 30), 0
        ) || 30;

        // Revalider la disponibilité (en excluant le RDV courant)
        const d = new Date(rdv.date);
        const dateStr  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayStart = new Date(`${dateStr}T00:00:00`);
        const dayEnd   = new Date(`${dateStr}T23:59:59`);

        const empRdvs = await Reservation.find({
          _id:       { $ne: rdv._id },
          date:      { $gte: dayStart, $lte: dayEnd },
          statut:    { $ne: 'annule' },
          employeId: rdv.employeId,
        }).select('date dureeMinutes').lean();

        const blockedDocs = await BlockedSlot.find({
          date: { $gte: dayStart, $lte: dayEnd },
          $or:  [{ employeId: null }, { employeId: rdv.employeId }],
        }).lean();

        const occupiedSet = getOccupiedSlots(empRdvs);
        const blockedSet  = new Set<string>();
        for (const doc of blockedDocs) {
          for (const h of doc.heures) blockedSet.add(h);
        }

        const slot = dateToSlot(d);
        if (!isSlotAvailable(slot, nouvelleDuree, occupiedSet, blockedSet)) {
          return NextResponse.json(
            { error: 'Impossible : la nouvelle durée dépasse un créneau occupé ou bloqué.' },
            { status: 409 }
          );
        }

        rdv.prestations  = body.prestations;
        rdv.dureeMinutes = nouvelleDuree;
      }

      // Autres champs libres (date, employeId, statut, dureeMinutes explicite)
      const allowed = ['date', 'employeId', 'statut', 'dureeMinutes'];
      for (const key of allowed) {
        if (body[key] !== undefined) (rdv as any)[key] = body[key];
      }
    }

<<<<<<< HEAD
    // ── Annulation par le staff avec motif → notifications ──────────────
    if (body.statut === 'annule' && body.motifAnnulation) {
      nativeSet.motifAnnulation = body.motifAnnulation;
      notifyCancellation({
        numero: rdv.numero,
        _id: rdv._id.toString(),
        clientNom: rdv.clientNom,
        clientEmail: rdv.clientEmail,
        clientTel: rdv.clientTel,
        prestations: rdv.prestations,
        date: rdv.date,
        pourQui: rdv.pourQui,
      }, body.motifAnnulation);
    }

=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    await rdv.save();

    // Relecture via driver natif pour garantir la présence des champs
    // éventuellement non reflétés dans le schéma Mongoose en cache HMR.
    const fresh = await Reservation.collection.findOne({ _id: rdv._id });
    return NextResponse.json(fresh ?? rdv);
  } catch (err) {
    console.error('[PATCH /api/reservations/:id]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

// ─── DELETE /api/reservations/[id] ────────────────────────────────────────────
// Admin : peut supprimer n'importe quelle réservation
// Client : peut supprimer uniquement ses propres réservations
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const user = session!.user as any;
    const rdv = await Reservation.findById(params.id);
    if (!rdv) return NextResponse.json({ error: 'Réservation introuvable.' }, { status: 404 });

    if (user.role !== 'admin' && rdv.userId?.toString() !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    await Reservation.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Réservation supprimée.' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
