import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlockedSlot extends Document {
  date:       Date;                   // jour (heure à 00:00:00)
  heures:     string[];               // ex: ["09:00", "09:30", "14:00"]
  /** null = blocage global (tous les employés), sinon ID de l'employé concerné */
  employeId:  Types.ObjectId | null;
<<<<<<< HEAD
  /** Heures bloquées par un admin — un employé ne peut pas les débloquer */
  adminHeures: string[];
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
}

const BlockedSlotSchema = new Schema<IBlockedSlot>({
  date:      { type: Date, required: true },
  heures:    [{ type: String }],
  employeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
<<<<<<< HEAD
  adminHeures: [{ type: String }],
=======
>>>>>>> 1e8aa5ab498344a2523374d60552200b88306272
});

// Un document par combinaison date + employé (null = global)
BlockedSlotSchema.index({ date: 1, employeId: 1 }, { unique: true });

const BlockedSlot: Model<IBlockedSlot> =
  mongoose.models.BlockedSlot ??
  mongoose.model<IBlockedSlot>('BlockedSlot', BlockedSlotSchema);

export default BlockedSlot;
