import { Document, Schema, Types } from "mongoose";
import Mongoose from "mongoose";

export interface IAulaExcecao extends Document {
  recorrenteId: Types.ObjectId;
  data: string;
  tipo: "cancelada" | "reagendada";
  novaData: string | null;
  novoHorarioInicio: string | null;
  novoHorarioFim: string | null;
  motivo: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AulaExcecaoSchema = new Schema<IAulaExcecao>(
  {
    recorrenteId: {
      type: Schema.Types.ObjectId,
      ref: "AulaRecorrente",
      required: true,
    },
    // "YYYY-MM-DD" — a ocorrência natural que está sendo afetada.
    data: { type: String, required: true },
    tipo: { type: String, enum: ["cancelada", "reagendada"], required: true },
    // Só usados quando tipo === "reagendada".
    novaData: { type: String, default: null },
    novoHorarioInicio: { type: String, default: null },
    novoHorarioFim: { type: String, default: null },
    motivo: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

AulaExcecaoSchema.index({ recorrenteId: 1, data: 1 }, { unique: true });

export const AulaExcecao = Mongoose.model<IAulaExcecao>("AulaExcecao", AulaExcecaoSchema);
