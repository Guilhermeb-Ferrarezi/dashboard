import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export const AULA_AVULSA_STATUS = ["agendada", "realizada", "cancelada"] as const;
export type AulaAvulsaStatus = (typeof AULA_AVULSA_STATUS)[number];

export interface IAulaAvulsa extends Document {
  titulo: string;
  professor: string;
  turmaDescricao: string;
  conteudo: string[];
  data: string;
  horarioInicio: string;
  horarioFim: string | null;
  status: AulaAvulsaStatus;
  observacoes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AulaAvulsaSchema = new Schema<IAulaAvulsa>(
  {
    titulo: { type: String, required: true, trim: true },
    professor: { type: String, required: true, trim: true },
    turmaDescricao: { type: String, default: "", trim: true },
    conteudo: { type: [String], default: [] },
    // "YYYY-MM-DD"
    data: { type: String, required: true },
    horarioInicio: { type: String, required: true },
    // Nem toda aula avulsa migrada do Notion tinha hora de término.
    horarioFim: { type: String, default: null },
    status: { type: String, enum: AULA_AVULSA_STATUS, default: "agendada" },
    observacoes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

AulaAvulsaSchema.index({ data: 1 });

export const AulaAvulsa = Mongoose.model<IAulaAvulsa>("AulaAvulsa", AulaAvulsaSchema);
