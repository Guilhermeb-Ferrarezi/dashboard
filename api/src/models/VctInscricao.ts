import { Document, Schema } from "mongoose";
import Mongoose from "mongoose";

export interface IVctInscricao extends Document {
  nome: string;
  nick: string;
  riotName: string;
  riotTag: string;
  riotPuuid: string;
  valorantRegion: string;
  valorantAccountLevel: number | null;
  valorantCardSmall: string;
  valorantCardWide: string;
  valorantCurrentRank: string;
  valorantPeakRank: string;
  email: string;
  whatsapp: string;
  instagram: string;
  cidade: string;
  elo: string;
  pico: string;
  funcaoPrimaria: string;
  funcaoSecundaria: string;
  diasTreino: string;
  diasSemana: string;
  horariosTreino: string;
  melhorJanela: string;
  compromisso: string;
  rotinaFixa: string;
  horariosDefinidos: string;
  capitao: string;
  presencial: string;
  deslocamento: string;
  autorizacaoContato: string;
  tags: string[];
  observacoes: string;
  highlightColor: string;
  time: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const VctInscricaoSchema = new Schema<IVctInscricao>(
  {
    nome: { type: String, required: true, trim: true },
    nick: { type: String, required: true, trim: true, unique: true },
    riotName: { type: String, default: "", trim: true },
    riotTag: { type: String, default: "", trim: true },
    riotPuuid: { type: String, default: "", trim: true },
    valorantRegion: { type: String, default: "", trim: true },
    valorantAccountLevel: { type: Number, default: null },
    valorantCardSmall: { type: String, default: "", trim: true },
    valorantCardWide: { type: String, default: "", trim: true },
    valorantCurrentRank: { type: String, default: "", trim: true },
    valorantPeakRank: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    whatsapp: { type: String, required: true, trim: true, unique: true },
    instagram: { type: String, default: "", trim: true },
    cidade: { type: String, required: true, trim: true },
    elo: { type: String, required: true },
    pico: { type: String, required: true },
    funcaoPrimaria: { type: String, required: true },
    funcaoSecundaria: { type: String, required: true },
    diasTreino: { type: String, required: true },
    diasSemana: { type: String, required: true },
    horariosTreino: { type: String, required: true },
    melhorJanela: { type: String, required: true },
    compromisso: { type: String, required: true },
    rotinaFixa: { type: String, required: true },
    horariosDefinidos: { type: String, required: true },
    capitao: { type: String, required: true },
    presencial: { type: String, required: true },
    deslocamento: { type: String, required: true },
    autorizacaoContato: { type: String, required: true },
    tags: { type: [String], default: [] },
    observacoes: { type: String, default: "", trim: true },
    highlightColor: { type: String, default: "", trim: true },
    time: { type: Number, default: null, min: 1, max: 8 },
  },
  { timestamps: true },
);

export const VctInscricao = Mongoose.model<IVctInscricao>("VctInscricao", VctInscricaoSchema);
