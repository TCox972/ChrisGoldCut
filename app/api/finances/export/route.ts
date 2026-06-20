import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { connectDB } from '@/lib/mongodb';
import Reservation from '@/models/Reservation';
import Prestation from '@/models/Prestation';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const user = session!.user as any;
  const isStaff = user.role === 'admin' || user.role === 'employe';
  if (!isStaff) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Paramètre month invalide (YYYY-MM).' }, { status: 400 });
  }

  const [year, mon] = month.split('-').map(Number);
  // Bornes UTC alignées avec le stockage UTC des dates de RDV
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));

  try {
    await connectDB();

    // Récupérer les réservations effectuées du mois
    const rdvs = await Reservation.find({
      prestationValidee: true,
      statut: { $nin: ['annule', 'absent'] },
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();

    // Map des prix par prestation
    const prestations = await Prestation.find().select('nom prix').lean();
    const priceByName = new Map<string, number>();
    for (const p of prestations) priceByName.set(p.nom, p.prix);

    // Map des utilisateurs pour nom/prénom
    const userIds = Array.from(new Set(rdvs.filter(r => r.userId).map(r => r.userId!.toString())));
    const users = await User.find({ _id: { $in: userIds } }).select('prenom nom').lean();
    const userMap = new Map<string, { prenom: string; nom: string }>();
    for (const u of users) {
      userMap.set(u._id.toString(), { prenom: u.prenom, nom: u.nom || '' });
    }

    // Fidélité via driver natif
    const freshRdvs = await Reservation.collection
      .find({
        prestationValidee: true,
        statut: { $nin: ['annule', 'absent'] },
        date: { $gte: start, $lte: end },
      })
      .toArray();
    const fideliteById = new Map<string, number>();
    for (const r of freshRdvs) {
      fideliteById.set(String(r._id), Number(r.fideliteReductionEur ?? 0));
    }

    // ── Créer le workbook Excel ──────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Gold Cut';
    wb.created = new Date();

    const monthLabel = `${MOIS[mon - 1]} ${year}`;
    const ws = wb.addWorksheet(`Prestations ${monthLabel}`);

    // ── En-tête salon ────────────────────────────────────────────────────────
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'GOLD CUT';
    titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFD4A017' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 40;

    ws.mergeCells('A2:F2');
    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = 'Salon de Coiffure Premium — Impasse de la Sablière, 97224 DUCOS';
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF888888' } };
    subtitleCell.alignment = { horizontal: 'center' };

    ws.mergeCells('A3:F3');
    const monthCell = ws.getCell('A3');
    monthCell.value = `Prestations effectuées — ${monthLabel}`;
    monthCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF333333' } };
    monthCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 30;

    // Ligne vide
    ws.addRow([]);

    // ── En-têtes de colonnes ─────────────────────────────────────────────────
    const headerRow = ws.addRow(['N° Réservation', 'Date', 'Heure', 'Nom', 'Prénom', 'Montant (€)']);
    headerRow.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4A017' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFB8860B' } },
      };
    });
    headerRow.height = 28;

    // ── Données ──────────────────────────────────────────────────────────────
    let totalCA = 0;

    for (const rdv of rdvs) {
      const d = new Date(rdv.date);
      // UTC : la date du RDV est stockée comme heure murale du salon en UTC
      const dateStr = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
      const heureStr = `${String(d.getUTCHours()).padStart(2, '0')}h${String(d.getUTCMinutes()).padStart(2, '0')}`;

      // Nom et prénom depuis le User lié, sinon depuis clientNom
      const linked = rdv.userId ? userMap.get(rdv.userId.toString()) : null;
      const prenom = linked?.prenom || rdv.clientNom || '';
      const nom = linked?.nom || '';

      // Calcul montant
      const brut = (rdv.prestations || []).reduce(
        (acc: number, n: string) => acc + (priceByName.get(n) ?? 0), 0
      );
      const fidelite = fideliteById.get(String(rdv._id)) ?? 0;
      const montant = Math.max(0, brut - fidelite);
      totalCA += montant;

      const row = ws.addRow([rdv.numero, dateStr, heureStr, nom, prenom, montant]);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF333333' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } },
        };
        // Alternance de couleur de fond
        if ((row.number % 2) === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAF6ED' },
          };
        }
        // Format montant
        if (colNumber === 6) {
          cell.numFmt = '#,##0.00 €';
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF333333' } };
        }
      });
    }

    // ── Ligne de total ───────────────────────────────────────────────────────
    ws.addRow([]);
    const totalRow = ws.addRow(['', '', '', '', 'TOTAL', totalCA]);
    totalRow.getCell(5).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFD4A017' } };
    totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(6).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFD4A017' } };
    totalRow.getCell(6).numFmt = '#,##0.00 €';
    totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(6).border = {
      top: { style: 'double', color: { argb: 'FFD4A017' } },
    };
    totalRow.height = 30;

    // ── Pied de page ─────────────────────────────────────────────────────────
    ws.addRow([]);
    ws.mergeCells(`A${ws.rowCount + 1}:F${ws.rowCount + 1}`);
    const footerRow = ws.getRow(ws.rowCount);
    footerRow.getCell(1).value = `Exporté le ${new Date().toLocaleDateString('fr-FR')} — Gold Cut`;
    footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFAAAAAA' } };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // ── Largeurs de colonnes ─────────────────────────────────────────────────
    ws.getColumn(1).width = 18; // N° Réservation
    ws.getColumn(2).width = 14; // Date
    ws.getColumn(3).width = 10; // Heure
    ws.getColumn(4).width = 22; // Nom
    ws.getColumn(5).width = 22; // Prénom
    ws.getColumn(6).width = 16; // Montant

    // ── Générer le buffer ────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const filename = `GoldCut_Prestations_${monthLabel.replace(' ', '_')}.xlsx`;

    return new NextResponse(Buffer.from(buffer as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/finances/export]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
