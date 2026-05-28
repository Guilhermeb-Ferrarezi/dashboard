import { builder } from "../builder";
import { CorujaoSessaoRef, SessaoStatusEnum } from "../types/corujao";
import { getCheckoutDb, schema } from "../../db/index";

const CorujaoSessaoInput = builder.inputType("CorujaoSessaoInput", {
  fields: (t) => ({
    data: t.string({ required: true }),
    totalVagas: t.int({ required: true }),
    status: t.field({ type: SessaoStatusEnum, required: true }),
  }),
});

builder.mutationField("createCorujaoSessao", (t) =>
  t.field({
    type: CorujaoSessaoRef,
    args: { input: t.arg({ type: CorujaoSessaoInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      const db = getCheckoutDb();
      const [sessao] = await db
        .insert(schema.corujaoSessoes)
        .values({ data: input.data, totalVagas: input.totalVagas, status: input.status as any })
        .returning();
      return sessao! as any;
    },
  }),
);
