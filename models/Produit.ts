import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduit extends Document {
  categorie:   'Barbe' | 'Cheveux' | 'Accessoires';
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
      enum:     ['Barbe', 'Cheveux', 'Accessoires'],
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

const Produit: Model<IProduit> =
  mongoose.models.Produit ??
  mongoose.model<IProduit>('Produit', ProduitSchema);

export default Produit;
