import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Sous-document : article du panier lié au RDV ────────────────────────────
export interface IArticleRdv {
  produitId:   Types.ObjectId;
  nom:         string;
  prix:        number;
  quantite:    number;
  /** Produit livré au client par le coiffeur */
  livre:       boolean;
}

// ─── Interface principale ─────────────────────────────────────────────────────
export interface IReservation extends Document {
  numero:      string;               // ex: "0001" — auto-généré
  /** Référence vers User (peut être null si réservation invité) */
  userId:      Types.ObjectId | null;
  /** Employé assigné au RDV */
  employeId:   Types.ObjectId | null;
  /** Snapshot des infos client au moment de la réservation */
  clientNom:   string;
  clientEmail: string;
  clientTel:   string;
  /** Qui est concerné par la prestation (le client lui-même ou une autre personne) */
  pourQui:     string;
  prestations:  string[];             // noms des prestations choisies
  dureeMinutes: number;              // durée totale en minutes
  date:         Date;                // date + heure du RDV
<<<<<<< HEAD
  statut:      'a-venir' | 'termine' | 'annule' | 'absent';
=======
  statut:      'a-venir' | 'termine' | 'annule';
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  /** Produits commandés à récupérer lors du RDV */
  achats:      IArticleRdv[];
  totalAchats: number;
  /** Retard signalé par l'admin */
  retardSignale: boolean;
  /** Prestation effectuée et payée — validée par le coiffeur */
  prestationValidee: boolean;
  /**
   * Réduction fidélité appliquée à cette réservation (en euros).
   * > 0 uniquement sur la 6ème réservation validée d'un même utilisateur
   * (puis la 12ème, 18ème, etc.). Figée au moment de la validation.
   */
  fideliteReductionEur: number;
<<<<<<< HEAD
  /** Rappel 24h envoyé */
  reminderSent: boolean;
  /** Motif d'annulation (renseigné par le salon) */
  motifAnnulation: string;
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  createdAt:   Date;
  updatedAt:   Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const ArticleRdvSchema = new Schema<IArticleRdv>(
  {
    produitId: { type: Schema.Types.ObjectId, ref: 'Produit', required: true },
    nom:       { type: String, required: true },
    prix:      { type: Number, required: true },
    quantite:  { type: Number, required: true, min: 1 },
    livre:     { type: Boolean, default: false },
  },
  { _id: false }
);

const ReservationSchema = new Schema<IReservation>(
  {
    numero:      { type: String, required: true, unique: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    employeId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    clientNom:   { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientTel:   { type: String, default: '' },
    pourQui:     { type: String, default: 'moi' },
    prestations:  [{ type: String }],
    dureeMinutes: { type: Number, default: 30 },
    date:         { type: Date, required: true },
    statut:      {
      type:    String,
<<<<<<< HEAD
      enum:    ['a-venir', 'termine', 'annule', 'absent'],
=======
      enum:    ['a-venir', 'termine', 'annule'],
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
      default: 'a-venir',
    },
    achats:      [ArticleRdvSchema],
    totalAchats: { type: Number, default: 0 },
    retardSignale:        { type: Boolean, default: false },
    prestationValidee:    { type: Boolean, default: false },
    fideliteReductionEur: { type: Number,  default: 0 },
<<<<<<< HEAD
    reminderSent:         { type: Boolean, default: false },
    motifAnnulation:      { type: String,  default: '' },
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
  },
  { timestamps: true }
);

// ─── Recalcul du total achats ─────────────────────────────────────────────────
ReservationSchema.pre('save', function (next) {
  this.totalAchats = this.achats.reduce(
    (sum, a) => sum + a.prix * a.quantite, 0
  );
  next();
});

ReservationSchema.index({ userId: 1, date: -1 });
ReservationSchema.index({ employeId: 1, date: -1 });
ReservationSchema.index({ statut: 1, date: 1 });

const Reservation: Model<IReservation> =
  mongoose.models.Reservation ??
  mongoose.model<IReservation>('Reservation', ReservationSchema);

export default Reservation;
