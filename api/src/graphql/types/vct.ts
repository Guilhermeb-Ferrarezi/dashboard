import { builder } from "../builder";

export interface VctTimeShape {
  _id: unknown;
  nome: string;
  tag: string;
}

export interface VctInscricaoShape {
  _id: unknown;
  nomeJogador: string;
  tagRiot: string;
  timeId?: unknown;
  createdAt?: Date;
}

export const VctTimeRef = builder.objectRef<VctTimeShape>("VctTime");
export const VctInscricaoRef = builder.objectRef<VctInscricaoShape>("VctInscricao");

builder.objectType(VctTimeRef, {
  fields: (t) => ({
    id: t.string({ resolve: (v) => String(v._id) }),
    nome: t.exposeString("nome"),
    tag: t.exposeString("tag"),
  }),
});

builder.objectType(VctInscricaoRef, {
  fields: (t) => ({
    id: t.string({ resolve: (i) => String(i._id) }),
    nomeJogador: t.exposeString("nomeJogador"),
    tagRiot: t.exposeString("tagRiot"),
    timeId: t.string({ nullable: true, resolve: (i) => i.timeId ? String(i.timeId) : null }),
    criadoEm: t.field({ type: "Date", resolve: (i) => i.createdAt ?? new Date() }),
  }),
});
