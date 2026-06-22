import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Invitation à créer un compte ─────────────────────────────────────────────
// Générée par le staff pour un client passager. Le client reçoit un lien par
// email (/inscription?invite=<token>) qui préremplit ses informations.
//
// Si `reservationId` est renseigné (invitation envoyée après paiement d'une
// prestation validée), la réservation est rattachée au nouveau compte lors de
// l'inscription → elle compte alors comme son premier point de fidélité.
export interface IAccountInvite extends Document {
  token:        string;
  email:        string;
  prenom:       string;
  nom:          string;
  telephone:    string;
  /** Réservation à rattacher au compte créé (pour le 1er point fidélité) */
  reservationId: Types.ObjectId | null;
  used:         boolean;
  expiresAt:    Date;
  createdAt:    Date;
}

const AccountInviteSchema = new Schema<IAccountInvite>(
  {
    token:        { type: String, required: true, unique: true, index: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    prenom:       { type: String, default: '' },
    nom:          { type: String, default: '' },
    telephone:    { type: String, default: '' },
    reservationId:{ type: Schema.Types.ObjectId, ref: 'Reservation', default: null },
    used:         { type: Boolean, default: false },
    expiresAt:    { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const AccountInvite: Model<IAccountInvite> =
  mongoose.models.AccountInvite ??
  mongoose.model<IAccountInvite>('AccountInvite', AccountInviteSchema);

export default AccountInvite;
