import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface IAulaRecorrente extends Document {
  titulo: string;
  professor: string;
  turmaDescricao: string;
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
  conteudo: string[];
  ativo: boolean;
  dataInicio: string;
  dataFim: string | null;
  observacoes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AulaRecorrenteSchema = new Schema<IAulaRecorrente>(
  {
    titulo: { type: String, required: true, trim: true },
    professor: { type: String, required: true, trim: true },
    turmaDescricao: { type: String, default: "", trim: true },
    diasSemana: {
      type: [String],
      enum: DIAS_SEMANA,
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Selecione ao menos um dia da semana.",
      },
    },
    // "HH:mm" — validado em fronteira (controller), não aqui.
    horarioInicio: { type: String, required: true },
    horarioFim: { type: String, required: true },
    conteudo: { type: [String], default: [] },
    ativo: { type: Boolean, default: true },
    // "YYYY-MM-DD", mesma convenção do corujaoSessoes (evita bug de fuso).
    dataInicio: { type: String, required: true },
    dataFim: { type: String, default: null },
    observacoes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

AulaRecorrenteSchema.index({ ativo: 1 });

export const AulaRecorrente = Mongoose.model<IAulaRecorrente>(
  "AulaRecorrente",
  AulaRecorrenteSchema,
);
