import { builder } from "../builder";

export const SessaoStatusEnum = builder.enumType("SessaoStatus", {
  values: ["planejado", "aberto", "lotado", "cancelado", "realizado"] as const,
});

export type SessaoStatus = "planejado" | "aberto" | "lotado" | "cancelado" | "realizado";

export interface CorujaoSessaoShape {
  id: number;
  data: string;
  totalVagas: number;
  status: SessaoStatus;
}

export interface VagasPayloadShape {
  sessaoId: number;
  data: string;
  totalVagas: number;
  vagasVendidas: number;
  vagasRestantes: number;
}

export const CorujaoSessaoRef = builder.objectRef<CorujaoSessaoShape>("CorujaoSessao");
export const VagasPayloadRef = builder.objectRef<VagasPayloadShape>("VagasPayload");

builder.objectType(CorujaoSessaoRef, {
  fields: (t) => ({
    id: t.exposeInt("id"),
    data: t.exposeString("data"),
    totalVagas: t.exposeInt("totalVagas"),
    status: t.field({ type: SessaoStatusEnum, resolve: (s) => s.status }),
  }),
});

builder.objectType(VagasPayloadRef, {
  fields: (t) => ({
    sessaoId: t.exposeInt("sessaoId"),
    data: t.exposeString("data"),
    totalVagas: t.exposeInt("totalVagas"),
    vagasVendidas: t.exposeInt("vagasVendidas"),
    vagasRestantes: t.exposeInt("vagasRestantes"),
  }),
});
