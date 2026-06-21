import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Galerie photo de la page d'accueil.
 * L'admin upload, supprime et réordonne les photos depuis `/admin/galerie`.
 * Les URLs pointent vers Cloudinary (`publicId` conservé pour la suppression
 * effective côté Cloudinary lors d'un DELETE).
 */
export interface IGalleryItem extends Document {
  url:       string;
  publicId:  string;   // identifiant Cloudinary pour la suppression
  ordre:     number;   // ordre d'affichage (asc)
  createdAt: Date;
  updatedAt: Date;
}

const GallerySchema = new Schema<IGalleryItem>(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    ordre:    { type: Number, default: 0 },
  },
  { timestamps: true },
);

GallerySchema.index({ ordre: 1 });

const Gallery: Model<IGalleryItem> =
  mongoose.models.Gallery ??
  mongoose.model<IGalleryItem>('Gallery', GallerySchema);

export default Gallery;
