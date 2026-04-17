import { sendMail } from '@/lib/mail';
// import { sendSMS } from '@/lib/sms'; // WhatsApp désactivé pour le moment

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

function formatHeure(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}h${String(date.getMinutes()).padStart(2, '0')}`;
}

function emailLayout(content: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; letter-spacing: 3px; margin: 0;">
          <span style="color: #D4A017;">GOLD</span> <span style="color: #111;">CUT</span>
        </h1>
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 11px; color: #bbb; text-align: center;">
        Gold Cut — Salon de Coiffure Premium<br />
        Impasse de la Sablière, 97224 DUCOS<br />
        +596 (0)696 10 20 30
      </p>
    </div>
  `;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type RdvInfo = {
  numero: string;
  _id: string;
  clientNom: string;
  clientEmail: string;
  clientTel: string;
  prestations: string[];
  date: Date;
  pourQui: string;
};

// ─── 1. Confirmation de réservation ──────────────────────────────────────────

export async function notifyBookingConfirmation(rdv: RdvInfo) {
  const date = new Date(rdv.date);
  const manageUrl = `${BASE_URL}/mes-rdv/${rdv._id}`;

  await sendMail({
    to: rdv.clientEmail,
    subject: `Gold Cut — Confirmation de votre RDV #${rdv.numero}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; color: #111; margin-bottom: 8px;">Réservation confirmée</h2>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Bonjour <strong>${rdv.clientNom}</strong>,
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Votre rendez-vous a bien été enregistré.
      </p>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Date :</strong> ${formatDate(date)}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Heure :</strong> ${formatHeure(date)}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Prestation(s) :</strong> ${rdv.prestations.join(', ')}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Pour :</strong> ${rdv.pourQui}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Référence :</strong> #${rdv.numero}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${manageUrl}"
          style="display: inline-block; background: #D4A017; color: #111; font-weight: bold;
            font-size: 14px; letter-spacing: 1px; text-decoration: none;
            padding: 14px 32px; border-radius: 6px;">
          Gérer mon rendez-vous
        </a>
      </div>
      <p style="font-size: 12px; color: #999; line-height: 1.6;">
        À bientôt chez Gold Cut !
      </p>
    `),
  }).catch(err => console.error('[notifyBookingConfirmation] email error:', err));
}

// ─── 2. Rappel 24h avant ────────────────────────────────────────────────────

export async function notifyReminder24h(rdv: RdvInfo) {
  const date = new Date(rdv.date);
  const manageUrl = `${BASE_URL}/mes-rdv/${rdv._id}`;

  // Email
  await sendMail({
    to: rdv.clientEmail,
    subject: `Gold Cut — Rappel : votre RDV demain à ${formatHeure(date)}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; color: #111; margin-bottom: 8px;">Rappel de rendez-vous</h2>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Bonjour <strong>${rdv.clientNom}</strong>,
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Nous vous rappelons votre rendez-vous prévu demain :
      </p>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Date :</strong> ${formatDate(date)}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Heure :</strong> ${formatHeure(date)}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Prestation(s) :</strong> ${rdv.prestations.join(', ')}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Référence :</strong> #${rdv.numero}</p>
      </div>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Si vous souhaitez annuler ou modifier votre rendez-vous, cliquez ci-dessous :
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${manageUrl}"
          style="display: inline-block; background: #D4A017; color: #111; font-weight: bold;
            font-size: 14px; letter-spacing: 1px; text-decoration: none;
            padding: 14px 32px; border-radius: 6px;">
          Modifier ou annuler
        </a>
      </div>
      <p style="font-size: 12px; color: #999; line-height: 1.6;">
        Adresse : Impasse de la Sablière, 97224 DUCOS
      </p>
    `),
  }).catch(err => console.error('[notifyReminder24h] email error:', err));

  // WhatsApp désactivé pour le moment
  // if (rdv.clientTel) {
  //   await sendSMS({ to: rdv.clientTel, body: `...` }).catch(console.error);
  // }
}

// ─── 3. Annulation par le salon (avec motif) ────────────────────────────────

export async function notifyCancellation(rdv: RdvInfo, motif: string) {
  const date = new Date(rdv.date);

  // Email
  await sendMail({
    to: rdv.clientEmail,
    subject: `Gold Cut — Annulation de votre RDV #${rdv.numero}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; color: #c0392b; margin-bottom: 8px;">Rendez-vous annulé</h2>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Bonjour <strong>${rdv.clientNom}</strong>,
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Nous sommes au regret de vous informer que votre rendez-vous a été annulé.
      </p>
      <div style="background: #fdf2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #c0392b;">
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Date :</strong> ${formatDate(date)} à ${formatHeure(date)}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Prestation(s) :</strong> ${rdv.prestations.join(', ')}</p>
        <p style="font-size: 13px; color: #333; margin: 4px 0;"><strong>Motif :</strong> ${motif}</p>
      </div>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Nous vous invitons à reprendre rendez-vous à votre convenance.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/reservation"
          style="display: inline-block; background: #D4A017; color: #111; font-weight: bold;
            font-size: 14px; letter-spacing: 1px; text-decoration: none;
            padding: 14px 32px; border-radius: 6px;">
          Reprendre rendez-vous
        </a>
      </div>
      <p style="font-size: 12px; color: #999; line-height: 1.6;">
        Nous nous excusons pour la gêne occasionnée.
      </p>
    `),
  }).catch(err => console.error('[notifyCancellation] email error:', err));

  // WhatsApp désactivé pour le moment
  // if (rdv.clientTel) {
  //   await sendSMS({ to: rdv.clientTel, body: `...` }).catch(console.error);
  // }
}

// ─── 4. Signalement de retard ────────────────────────────────────────────────

export async function notifyDelay(rdv: RdvInfo) {
  if (!rdv.clientTel) return;

  const date = new Date(rdv.date);

  // WhatsApp désactivé pour le moment — envoi par email
  await sendMail({
    to: rdv.clientEmail,
    subject: `Gold Cut — Retard sur votre RDV de ${formatHeure(date)}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; color: #e67e22; margin-bottom: 8px;">Information retard</h2>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Bonjour <strong>${rdv.clientNom}</strong>,
      </p>
      <p style="font-size: 14px; color: #555; line-height: 1.6;">
        Votre coiffeur a pris un peu de retard sur votre rendez-vous de <strong>${formatHeure(date)}</strong>.
        Merci de votre patience, nous vous accueillerons dès que possible.
      </p>
      <p style="font-size: 12px; color: #999; line-height: 1.6;">
        L'équipe Gold Cut
      </p>
    `),
  }).catch(err => console.error('[notifyDelay] email error:', err));
}
