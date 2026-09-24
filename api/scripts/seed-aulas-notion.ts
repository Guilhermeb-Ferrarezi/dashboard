/**
 * Migração pontual da "Agenda de Aulas" do Notion (34 linhas brutas) para os
 * modelos AulaRecorrente/AulaAvulsa. Os dados abaixo já passaram pela
 * normalização revisada com o usuário antes da migração:
 *
 * - 1 linha-lixo ("Agenda", tudo vazio) descartada.
 * - Linhas duplicadas do mesmo aluno/turma em dias diferentes da semana
 *   foram mescladas em 1 turma recorrente com vários `diasSemana`
 *   (ex.: "Jackson" existia 3x no Notion — Qua/Qui/Sex — e virou 1 turma só).
 * - "Duração" (tag manual, às vezes contraditória com o "Horário") foi
 *   descartada em favor do intervalo horarioInicio/horarioFim.
 * - "Conteúdo" (1 categoria de texto livre) virou lista de tags.
 * - Aulas avulsas sem data no título (Martins, Isabella) e as já passadas
 *   (21/09, 12/09) ficaram de fora — ver resumo enviado ao usuário no chat.
 *
 * Idempotente: roda de novo sem duplicar (upsert por `titulo`).
 *
 * Uso: bun run scripts/seed-aulas-notion.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import { AulaRecorrente, type DiaSemana } from "../src/models/AulaRecorrente";
import { AulaAvulsa } from "../src/models/AulaAvulsa";

dotenv.config();

type RecorrenteSeed = {
  titulo: string;
  professor: string;
  turmaDescricao?: string;
  diasSemana: DiaSemana[];
  horarioInicio: string;
  horarioFim: string;
  conteudo?: string[];
};

// Início da recorrência: não existe data histórica real no Notion (o campo
// "Data" estava vazio em 100% das linhas), então a grade passa a valer a
// partir de hoje.
const DATA_INICIO_PADRAO = new Date().toISOString().slice(0, 10);

const RECORRENTES: RecorrenteSeed[] = [
  {
    titulo: "Jackson",
    professor: "Rodrigo",
    diasSemana: ["quarta", "quinta", "sexta"],
    horarioInicio: "19:00",
    horarioFim: "20:00",
    conteudo: ["Python"],
  },
  {
    titulo: "Igor",
    professor: "Henrique",
    turmaDescricao: "Igor (pai: Hamilton)",
    diasSemana: ["segunda", "quinta", "sexta"],
    horarioInicio: "19:00",
    horarioFim: "20:00",
    conteudo: ["Informática básica", "Construct 3", "Roblox Studio"],
  },
  {
    titulo: "Turma Informática (Mathias, Davi e Theo)",
    professor: "Rodrigo",
    turmaDescricao: "Mathias, Davi e Theo",
    diasSemana: ["terca", "quinta"],
    horarioInicio: "16:00",
    horarioFim: "17:00",
    conteudo: ["Informática básica", "Word", "PowerPoint", "Excel", "Power BI"],
  },
  {
    titulo: "Felipe Albanese",
    professor: "Rodrigo",
    diasSemana: ["terca", "quinta", "sexta"],
    horarioInicio: "08:00",
    horarioFim: "09:00",
    conteudo: ["Modelagem 3D", "Impressão 3D"],
  },
  {
    titulo: "Nicolas",
    professor: "Rodrigo",
    diasSemana: ["terca", "quinta"],
    horarioInicio: "14:00",
    horarioFim: "16:00",
    conteudo: ["Desenvolvimento de Games"],
  },
  {
    titulo: "Wilton Gerson",
    professor: "Henrique",
    diasSemana: ["segunda", "terca"],
    horarioInicio: "17:00",
    horarioFim: "18:00",
    conteudo: ["Redes Sociais"],
  },
  {
    // No Notion, título era "Claudemir" nas duas turmas (Walisson e William)
    // — placeholder sem informação real. Renomeado pelo aluno de cada uma.
    titulo: "Turma Walisson",
    professor: "Henrique",
    turmaDescricao: "Walisson - Informática",
    diasSemana: ["quarta"],
    horarioInicio: "18:00",
    horarioFim: "19:00",
    conteudo: ["Informática básica", "Word", "PowerPoint", "Excel", "Power BI"],
  },
  {
    titulo: "Turma William",
    professor: "Henrique",
    turmaDescricao: "William - Informática",
    diasSemana: ["sexta"],
    horarioInicio: "18:00",
    horarioFim: "19:00",
    conteudo: ["Informática básica", "Word", "PowerPoint", "Excel", "Power BI"],
  },
  {
    // Conteúdo estava vazio no Notion — não inventei categoria.
    titulo: "Magnaldo",
    professor: "Rodrigo",
    diasSemana: ["quinta"],
    horarioInicio: "18:00",
    horarioFim: "19:00",
    conteudo: [],
  },
  {
    titulo: "Yasmin",
    professor: "Rodrigo",
    diasSemana: ["sexta"],
    horarioInicio: "15:00",
    horarioFim: "17:00",
    conteudo: ["Informática básica", "Excel"],
  },
  {
    titulo: "Renata",
    professor: "Rodrigo",
    diasSemana: ["sexta"],
    horarioInicio: "10:00",
    horarioFim: "12:00",
    conteudo: ["Informática básica", "Excel"],
  },
  {
    titulo: "Leonardo (Leo)",
    professor: "Henrique",
    turmaDescricao: "Leo - Particular",
    diasSemana: ["sabado"],
    horarioInicio: "15:00",
    horarioFim: "16:00",
    conteudo: ["Informática básica", "Excel"],
  },
  {
    titulo: "Turma Programação (Ana, Nicolas e Ruan)",
    professor: "Rodrigo",
    turmaDescricao: "Ana, Nicolas e Ruan",
    diasSemana: ["sabado"],
    horarioInicio: "13:00",
    horarioFim: "15:00",
    conteudo: ["HTML", "CSS", "JavaScript"],
  },
  {
    titulo: "Lara",
    professor: "Rodrigo",
    diasSemana: ["sabado"],
    horarioInicio: "10:00",
    horarioFim: "12:00",
    conteudo: ["Modelagem 3D", "Impressão 3D"],
  },
  {
    titulo: "Camila",
    professor: "Rodrigo",
    diasSemana: ["sabado"],
    horarioInicio: "08:00",
    horarioFim: "10:00",
    conteudo: ["Excel"],
  },
  {
    titulo: "Vivian",
    professor: "Rodrigo",
    diasSemana: ["sabado"],
    horarioInicio: "16:00",
    horarioFim: "18:00",
    conteudo: ["Excel", "Python"],
  },
  {
    titulo: "Turma Informática (Paloma, Felipe, José e João)",
    professor: "Rodrigo",
    turmaDescricao: "Paloma, Felipe, José e João",
    diasSemana: ["terca"],
    horarioInicio: "19:30",
    horarioFim: "21:30",
    conteudo: ["Informática básica", "Word", "PowerPoint", "Excel", "Power BI"],
  },
];

type AvulsaSeed = {
  titulo: string;
  professor: string;
  data: string;
  horarioInicio: string;
  horarioFim?: string;
  conteudo?: string[];
};

// Avulsas passadas (21/09, 12/09) e sem data no título (Martins, Isabella)
// ficaram fora de propósito — ver análise enviada ao usuário.
const AVULSAS: AvulsaSeed[] = [
  {
    titulo: "Aula experimental — Rodrigo",
    professor: "Rodrigo",
    data: "2026-09-24",
    horarioInicio: "09:00",
    horarioFim: "10:00",
  },
  {
    titulo: "Aula Experimental (Lorena)",
    professor: "Rodrigo",
    data: "2026-09-28",
    horarioInicio: "15:15",
    conteudo: ["Modelagem 3D", "Impressão 3D"],
  },
];

async function main() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error("MONGO_URI não configurada.");

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGO_DB_NAME?.trim() || undefined,
  });
  console.log("Mongo conectado.");

  let criadas = 0;
  let atualizadas = 0;

  for (const seed of RECORRENTES) {
    const resultado = await AulaRecorrente.findOneAndUpdate(
      { titulo: seed.titulo },
      {
        titulo: seed.titulo,
        professor: seed.professor,
        turmaDescricao: seed.turmaDescricao ?? "",
        diasSemana: seed.diasSemana,
        horarioInicio: seed.horarioInicio,
        horarioFim: seed.horarioFim,
        conteudo: seed.conteudo ?? [],
        ativo: true,
        dataInicio: DATA_INICIO_PADRAO,
        dataFim: null,
      },
      { upsert: true, new: true, rawResult: true },
    );
    if (resultado.lastErrorObject?.updatedExisting) atualizadas++;
    else criadas++;
  }

  let avulsasCriadas = 0;
  let avulsasAtualizadas = 0;

  for (const seed of AVULSAS) {
    const resultado = await AulaAvulsa.findOneAndUpdate(
      { titulo: seed.titulo, data: seed.data },
      {
        titulo: seed.titulo,
        professor: seed.professor,
        turmaDescricao: "",
        conteudo: seed.conteudo ?? [],
        data: seed.data,
        horarioInicio: seed.horarioInicio,
        horarioFim: seed.horarioFim ?? null,
        status: "agendada",
      },
      { upsert: true, new: true, rawResult: true },
    );
    if (resultado.lastErrorObject?.updatedExisting) avulsasAtualizadas++;
    else avulsasCriadas++;
  }

  console.log(
    `Turmas recorrentes: ${criadas} criada(s), ${atualizadas} já existente(s) atualizada(s).`,
  );
  console.log(
    `Aulas avulsas: ${avulsasCriadas} criada(s), ${avulsasAtualizadas} já existente(s) atualizada(s).`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Falha na migração:", error);
  process.exit(1);
});
