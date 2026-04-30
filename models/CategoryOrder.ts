import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategoryOrder extends Document {
  type: 'prestations' | 'produits';
  order: string[]; // noms des catégories dans l'ordre souhaité
  updatedAt: Date;
}

const CategoryOrderSchema = new Schema<ICategoryOrder>(
  {
    type:  { type: String, enum: ['prestations', 'produits'], required: true, unique: true },
    order: [{ type: String }],
  },
  { timestamps: true }
);

const CategoryOrder: Model<ICategoryOrder> =
  mongoose.models.CategoryOrder ??
  mongoose.model<ICategoryOrder>('CategoryOrder', CategoryOrderSchema);

export default CategoryOrder;
