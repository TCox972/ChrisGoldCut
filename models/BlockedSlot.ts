import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlockedSlot extends Document {
  date:       Date;                   // jour (heure à 00:00:00)
  heures:     string[];               // ex: ["09:00", "09:30", "14:00"]
  /** null = blocage global (tous les employés), sinon ID de l'employé concerné */
  employeId:  Types.ObjectId | null;
  /** Heures bloquées par un admin — un employé ne peut pas les débloquer */
  adminHeures: string[];
}

const BlockedSlotSchema = new Schema<IBlockedSlot>({
  date:      { type: Date, required: true },
  heures:    [{ type: String }],
  employeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  adminHeures: [{ type: String }],
});

// Un document par combinaison date + employé (null = global)
BlockedSlotSchema.index({ date: 1, employeId: 1 }, { unique: true });

const BlockedSlot: Model<IBlockedSlot> =
  mongoose.models.BlockedSlot ??
  mongoose.model<IBlockedSlot>('BlockedSlot', BlockedSlotSchema);

export default BlockedSlot;
