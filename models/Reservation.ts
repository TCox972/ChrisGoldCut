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
  prestations:  string[];             // noms des prestations choisies
  dureeMinutes: number;              // durée totale en minutes
  date:         Date;                // date + heure du RDV
  statut:      'a-venir' | 'termine' | 'annule' | 'absent';
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
  /** Rappel 24h envoyé */
  reminderSent: boolean;
  /** Motif d'annulation (renseigné par le salon) */
  motifAnnulation: string;
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
    // Optionnel : un client passager créé par le staff peut n'avoir qu'un téléphone.
    clientEmail: { type: String, default: '' },
    clientTel:   { type: String, default: '' },
    prestations:  [{ type: String }],
    dureeMinutes: { type: Number, default: 30 },
    date:         { type: Date, required: true },
    statut:      {
      type:    String,
      enum:    ['a-venir', 'termine', 'annule', 'absent'],
      default: 'a-venir',
    },
    achats:      [ArticleRdvSchema],
    totalAchats: { type: Number, default: 0 },
    retardSignale:        { type: Boolean, default: false },
    prestationValidee:    { type: Boolean, default: false },
    fideliteReductionEur: { type: Number,  default: 0 },
    reminderSent:         { type: Boolean, default: false },
    motifAnnulation:      { type: String,  default: '' },
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
ReservationSchema.index({ date: 1 });

// Index unique partiel : empêche deux RDV "à-venir" sur le même employé au même
// instant de départ. Protège contre les double-bookings issus de race conditions
// (deux POST simultanés qui passent tous deux le check de disponibilité).
// employeId null (mode "sans préférence") n'est PAS contraint car l'assignation
// se fait après — le check de disponibilité serveur reste la première barrière.
ReservationSchema.index(
  { employeId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: {
      employeId: { $exists: true, $type: 'objectId' },
      statut: 'a-venir',
    },
    name: 'unique_employe_slot_a_venir',
  },
);

const Reservation: Model<IReservation> =
  mongoose.models.Reservation ??
  mongoose.model<IReservation>('Reservation', ReservationSchema);

export default Reservation;
