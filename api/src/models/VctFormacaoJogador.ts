import { Document, Schema, Types } from "mongoose";
import Mongoose from "mongoose";

export interface IVctFormacaoJogador extends Document {
  modalidade: string;
  formacaoTimeId: Types.ObjectId;
  ordem: number;
  papel: "capitao" | "jogador";
  nome: string;
  email: string;
  instagram: string;
  whatsapp: string;
  nick: string;
  eloAtual: string;
  peakRanking: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const VctFormacaoJogadorSchema = new Schema<IVctFormacaoJogador>(
  {
    modalidade: {
      type: String,
      default: "valorant",
      enum: ["valorant", "counter-strike", "lol"],
      trim: true,
    },
    formacaoTimeId: {
      type: Schema.Types.ObjectId,
      ref: "VctFormacaoTime",
      required: true,
    },
    ordem: { type: Number, required: true, min: 0 },
    papel: {
      type: String,
      required: true,
      enum: ["capitao", "jogador"],
      trim: true,
    },
    nome: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    instagram: { type: String, required: true, trim: true, maxlength: 40 },
    whatsapp: { type: String, required: true, trim: true, maxlength: 16 },
    nick: { type: String, required: true, trim: true, maxlength: 32 },
    eloAtual: { type: String, required: true, trim: true, maxlength: 32 },
    peakRanking: { type: String, required: true, trim: true, maxlength: 32 },
  },
  { timestamps: true },
);

VctFormacaoJogadorSchema.index({ modalidade: 1, formacaoTimeId: 1, ordem: 1 });
VctFormacaoJogadorSchema.index({ modalidade: 1, formacaoTimeId: 1, nick: 1 });

export const VctFormacaoJogador = Mongoose.model<IVctFormacaoJogador>(
  "VctFormacaoJogador",
  VctFormacaoJogadorSchema,
);
