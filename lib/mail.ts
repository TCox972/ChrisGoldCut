import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Expéditeur ────────────────────────────────────────────────────────────────
// IMPORTANT (anti-spam) : l'adresse d'expédition DOIT correspondre au compte
// authentifié auprès du serveur SMTP. Avec Gmail, mettre un From "noreply@goldcut.com"
// casse l'alignement DKIM/SPF (Gmail signe pour gmail.com) → DMARC échoue → spam.
// On force donc l'adresse = SMTP_USER, en gardant un nom d'affichage lisible.
const FROM_NAME    = process.env.SMTP_FROM_NAME || 'Gold Cut';
const FROM_ADDRESS = process.env.SMTP_USER || 'noreply@goldcut.com';
const REPLY_TO     = process.env.SMTP_REPLY_TO || FROM_ADDRESS;

/** Convertit un HTML simple en texte brut lisible (version alternative de l'email). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type MailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  /** Texte brut optionnel ; généré automatiquement depuis le HTML si absent. */
  text?: string;
  /** Pièces jointes (ex. fichier .ics d'ajout au calendrier). */
  attachments?: MailAttachment[];
};

export async function sendMail({ to, subject, html, text, attachments }: SendMailOptions) {
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    replyTo: REPLY_TO,
    to,
    subject,
    html,
    // multipart/alternative : un email avec une version texte est mieux noté
    // par les filtres anti-spam qu'un email HTML seul.
    text: text || htmlToText(html),
    attachments,
  });
}
