import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduit extends Document {
  categorie:   string;
  nom:         string;
  description: string;  // ex: "60 ml", "Unité"
  prix:        number;
  image:       string;  // URL de l'image
  stock:       number;
  actif:       boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const ProduitSchema = new Schema<IProduit>(
  {
    categorie:   {
      type:     String,
      required: true,
      trim:     true,
    },
    nom:         { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    prix:        { type: Number, required: true, min: 0 },
    image:       { type: String, default: '' },
    stock:       { type: Number, default: 0, min: 0 },
    actif:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProduitSchema.index({ categorie: 1, actif: 1 });

// En HMR, le modèle peut être déjà compilé avec un ancien schéma.
// On met à jour le schéma du modèle existant si besoin.
if (mongoose.models.Produit) {
  const path = mongoose.models.Produit.schema.path('categorie');
  if (path && (path as any).enumValues?.length) {
    (path as any).enumValues = [];
    (path as any).validators = (path as any).validators?.filter(
      (v: any) => v.type !== 'enum'
    ) ?? [];
  }
}
const Produit: Model<IProduit> =
  mongoose.models.Produit ??
  mongoose.model<IProduit>('Produit', ProduitSchema);

export default Produit;
