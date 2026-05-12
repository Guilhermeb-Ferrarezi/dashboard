import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IVctTime extends Document {
  modalidade: string;
  numero: number;
  nome: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const VctTimeSchema = new Schema<IVctTime>(
  {
    modalidade: {
      type: String,
      default: "valorant",
      enum: ["valorant", "counter-strike", "lol"],
      trim: true,
    },
    numero: { type: Number, required: true, min: 1 },
    nome: { type: String, default: "", trim: true, maxlength: 60 },
  },
  { timestamps: true },
);

VctTimeSchema.index({ modalidade: 1, numero: 1 }, { unique: true });

export const VctTime = Mongoose.model<IVctTime>("VctTime", VctTimeSchema);
