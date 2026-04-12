import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  prenom:    string;
  nom:       string;
  email:     string;
  telephone: string;
  password:  string;
  role:      'client' | 'admin' | 'employe';
  /** Société (pour les employés) */
  societe:   string;
  /** Personnes rattachées au compte (enfants, proches) */
  autresPersonnes: { prenom: string; nom: string }[];
  createdAt: Date;
  updatedAt: Date;
  /** Compare un mot de passe en clair avec le hash stocké */
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const UserSchema = new Schema<IUser>(
  {
    prenom:    { type: String, required: true, trim: true },
    nom:       { type: String, default: '',    trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    telephone: { type: String, default: '' },
    password:  { type: String, required: true, minlength: 6 },
    role:      { type: String, enum: ['client', 'admin', 'employe'], default: 'client' },
    societe:   { type: String, default: '' },
    autresPersonnes: [
      {
        prenom: { type: String, required: true },
        nom:    { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

// ─── Hooks ────────────────────────────────────────────────────────────────────
/** Hash le mot de passe avant chaque sauvegarde si modifié */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Méthodes ─────────────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Index ────────────────────────────────────────────────────────────────────


// ─── Export ───────────────────────────────────────────────────────────────────
// Évite l'erreur "Cannot overwrite model once compiled" en hot-reload Next.js
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
