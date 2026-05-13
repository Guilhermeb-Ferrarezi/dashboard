import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IVctFormacaoTime extends Document {
  modalidade: string;
  nome: string;
  tag: string;
  logoKey: string;
  logoUrl: string;
  membroCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const VctFormacaoTimeSchema = new Schema<IVctFormacaoTime>(
  {
    modalidade: {
      type: String,
      default: "valorant",
      enum: ["valorant", "counter-strike", "lol"],
      trim: true,
    },
    nome: { type: String, required: true, trim: true, maxlength: 60 },
    tag: { type: String, required: true, trim: true, maxlength: 12 },
    logoKey: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: "", trim: true },
    membroCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

VctFormacaoTimeSchema.index({ modalidade: 1, createdAt: -1 });

export const VctFormacaoTime = Mongoose.model<IVctFormacaoTime>(
  "VctFormacaoTime",
  VctFormacaoTimeSchema,
);
