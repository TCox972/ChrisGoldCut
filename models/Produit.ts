import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduit extends Document {
<<<<<<< HEAD
  categorie:         string;
  nom:               string;
  description:       string;  // infos courtes — ex: "60 ml", "Unité"
  descriptionLongue: string;  // description détaillée du produit
  prix:              number;
  image:             string;  // URL de l'image principale (rétro-compat)
  images:            string[];// URLs des images (Cloudinary)
  stock:             number;
  actif:             boolean;
  createdAt:         Date;
  updatedAt:         Date;
=======
  categorie:   'Barbe' | 'Cheveux' | 'Accessoires';
  nom:         string;
  description: string;  // ex: "60 ml", "Unité"
  prix:        number;
  image:       string;  // URL de l'image
  stock:       number;
  actif:       boolean;
  createdAt:   Date;
  updatedAt:   Date;
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
}

const ProduitSchema = new Schema<IProduit>(
  {
    categorie:   {
      type:     String,
      required: true,
<<<<<<< HEAD
      trim:     true,
    },
    nom:               { type: String, required: true, trim: true },
    description:       { type: String, default: '' },
    descriptionLongue: { type: String, default: '' },
    prix:              { type: Number, required: true, min: 0 },
    image:             { type: String, default: '' },
    images:            [{ type: String }],
    stock:             { type: Number, default: 0, min: 0 },
=======
      enum:     ['Barbe', 'Cheveux', 'Accessoires'],
    },
    nom:         { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    prix:        { type: Number, required: true, min: 0 },
    image:       { type: String, default: '' },
    stock:       { type: Number, default: 0, min: 0 },
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
    actif:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProduitSchema.index({ categorie: 1, actif: 1 });

<<<<<<< HEAD
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
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
const Produit: Model<IProduit> =
  mongoose.models.Produit ??
  mongoose.model<IProduit>('Produit', ProduitSchema);

export default Produit;
