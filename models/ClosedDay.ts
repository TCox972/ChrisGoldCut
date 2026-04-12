import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClosedDay extends Document {
  date:   Date;    // jour de fermeture (heure à 00:00:00)
  motif:  string;  // ex: "Jour férié", "Congés"
}

const ClosedDaySchema = new Schema<IClosedDay>({
  date:  { type: Date, required: true, unique: true },
  motif: { type: String, default: '' },
});

const ClosedDay: Model<IClosedDay> =
  mongoose.models.ClosedDay ??
  mongoose.model<IClosedDay>('ClosedDay', ClosedDaySchema);

export default ClosedDay;
