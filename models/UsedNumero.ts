import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

// ─── Interface ────────────────────────────────────────────────────────────────
// Collection qui trace TOUS les numéros déjà générés (réservations et
// commandes), y compris pour des enregistrements supprimés ou annulés.
// Elle sert uniquement à garantir l'unicité des numéros dans le temps :
// on n'en efface jamais les entrées.
export interface IUsedNumero extends Document {
  numero:    string;
  type:      'reservation' | 'commande';
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const UsedNumeroSchema = new Schema<IUsedNumero>(
  {
    numero: { type: String, required: true, unique: true, index: true },
    type:   { type: String, enum: ['reservation', 'commande'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const UsedNumero: Model<IUsedNumero> =
  mongoose.models.UsedNumero ??
  mongoose.model<IUsedNumero>('UsedNumero', UsedNumeroSchema);

export default UsedNumero;

// ─── Génération ───────────────────────────────────────────────────────────────
// Jeu de caractères sans 0/O, 1/I/L pour éviter toute ambiguïté lors de la
// communication orale/écrite du numéro au client.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 caractères
const LENGTH  = 6;

// crypto.randomInt : générateur cryptographiquement sûr — le numéro est
// public (apparaît dans les emails et le QR code de RDV), il ne doit pas
// être devinable par incrémentation ou pattern Math.random.
function randomCode(): string {
  let s = '';
  for (let i = 0; i < LENGTH; i++) {
    s += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return s;
}

/**
 * Génère un numéro unique de 6 caractères alphanumériques et le réserve
 * atomiquement dans la collection UsedNumero. En cas de collision (très
 * rare sur 31^6 ≈ 887 millions de combinaisons), on ré-essaie.
 *
 * L'insertion se fait via le driver natif pour bypasser le cache de schéma
 * Mongoose qui peut être obsolète en HMR dev.
 */
export async function generateUniqueNumero(
  type: 'reservation' | 'commande'
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const numero = randomCode();
    try {
      await UsedNumero.collection.insertOne({
        numero,
        type,
        createdAt: new Date(),
      });
      return numero;
    } catch (err: any) {
      if (err?.code === 11000) continue; // collision → on retente
      throw err;
    }
  }
  throw new Error('Impossible de générer un numéro unique après 10 tentatives.');
}
