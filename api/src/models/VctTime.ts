import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IVctTime extends Document {
  numero: number;
  nome: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const VctTimeSchema = new Schema<IVctTime>(
  {
    numero: { type: Number, required: true, unique: true, min: 1, max: 8 },
    nome: { type: String, default: "", trim: true, maxlength: 60 },
  },
  { timestamps: true },
);

export const VctTime = Mongoose.model<IVctTime>("VctTime", VctTimeSchema);
