import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPrestation extends Document {
  categorie: string;
  nom:       string;
  duree:     string;  // ex: "30 min", "1 h"
  prix:      number;
  actif:     boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PrestationSchema = new Schema<IPrestation>(
  {
    categorie: {
      type:     String,
      required: true,
      trim:     true,
    },
    nom:   { type: String, required: true, trim: true },
    duree: { type: String, required: true },
    prix:  { type: Number, required: true, min: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PrestationSchema.index({ categorie: 1, actif: 1 });

// En HMR, le modèle peut être déjà compilé avec un ancien schéma.
// On met à jour le schéma du modèle existant si besoin.
if (mongoose.models.Prestation) {
  // Supprimer la contrainte enum si elle existe encore dans le cache
  const path = mongoose.models.Prestation.schema.path('categorie');
  if (path && (path as any).enumValues?.length) {
    (path as any).enumValues = [];
    (path as any).validators = (path as any).validators?.filter(
      (v: any) => v.type !== 'enum'
    ) ?? [];
  }
}
const Prestation: Model<IPrestation> =
  mongoose.models.Prestation ??
  mongoose.model<IPrestation>('Prestation', PrestationSchema);

export default Prestation;
