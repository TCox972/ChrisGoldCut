import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPrestation extends Document {
  categorie: 'Coupes' | 'Dégradés' | 'Barbe' | 'Soins';
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
      enum:     ['Coupes', 'Dégradés', 'Barbe', 'Soins'],
    },
    nom:   { type: String, required: true, trim: true },
    duree: { type: String, required: true },
    prix:  { type: Number, required: true, min: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PrestationSchema.index({ categorie: 1, actif: 1 });

const Prestation: Model<IPrestation> =
  mongoose.models.Prestation ??
  mongoose.model<IPrestation>('Prestation', PrestationSchema);

export default Prestation;
