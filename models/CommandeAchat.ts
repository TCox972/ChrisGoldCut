import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Sous-document article ────────────────────────────────────────────────────
export interface IArticle {
  produitId:   Types.ObjectId;
  nom:         string;
  description: string;
  image:       string;
  prix:        number;
  quantite:    number;
  /** Article livré au client par le coiffeur */
  livre:       boolean;
}

// ─── Interface principale ─────────────────────────────────────────────────────
export interface ICommandeAchat extends Document {
  numero:      string;          // ex: "CMD-0001" auto-généré
  userId:      Types.ObjectId | null;   // null si invité
  clientNom:   string;
  clientEmail: string;
  articles:    IArticle[];
  sousTotal:   number;
  remise:      number;
  total:       number;
  statut:      'en-attente' | 'annulee';
  createdAt:   Date;
  updatedAt:   Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const ArticleSchema = new Schema<IArticle>(
  {
    produitId:   { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
    nom:         { type: String, required: true },
    description: { type: String, default: '' },
    image:       { type: String, default: '' },
    prix:        { type: Number, required: true, min: 0 },
    quantite:    { type: Number, required: true, min: 1 },
    livre:       { type: Boolean, default: false },
  },
  { _id: false }
);

const CommandeAchatSchema = new Schema<ICommandeAchat>(
  {
    numero:      { type: String, required: true, unique: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    clientNom:   { type: String, required: true },
    clientEmail: { type: String, required: true },
    articles:    { type: [ArticleSchema], required: true, validate: [(a: IArticle[]) => a.length > 0, 'Au moins un article requis'] },
    sousTotal:   { type: Number, default: 0 },
    remise:      { type: Number, default: 0 },
    total:       { type: Number, default: 0 },
    statut:      { type: String, enum: ['en-attente', 'annulee'], default: 'en-attente' },
  },
  { timestamps: true }
);

// ─── Calculs totaux ───────────────────────────────────────────────────────────
// Le numéro est désormais généré côté route via generateUniqueNumero() puis
// injecté lors du create. On ne s'occupe plus que des totaux ici.
CommandeAchatSchema.pre('save', function (next) {
  const sousTotal = this.articles.reduce(
    (sum, a) => sum + a.prix * a.quantite, 0
  );
  const totalArticles = this.articles.reduce(
    (sum, a) => sum + a.quantite, 0
  );

  this.sousTotal = sousTotal;
  this.remise    = totalArticles >= 4 ? 10 : 0;   // remise fidélité 10€ dès 4 articles
  this.total     = this.sousTotal - this.remise;

  next();
});

CommandeAchatSchema.index({ userId: 1, createdAt: -1 });
CommandeAchatSchema.index({ statut: 1 });

const CommandeAchat: Model<ICommandeAchat> =
  mongoose.models.CommandeAchat ??
  mongoose.model<ICommandeAchat>('CommandeAchat', CommandeAchatSchema);

export default CommandeAchat;
