import { builder } from "../builder";
import { CorujaoSessaoRef, SessaoStatusEnum } from "../types/corujao";
import { getCheckoutDb, schema } from "../../db/index";
import { inArray } from "drizzle-orm";

builder.queryField("corujaoSessoes", (t) =>
  t.field({
    type: [CorujaoSessaoRef],
    args: {
      status: t.arg({ type: [SessaoStatusEnum], required: false }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const db = getCheckoutDb();
      if (args.status?.length) {
        return db.select().from(schema.corujaoSessoes).where(inArray(schema.corujaoSessoes.status, args.status as any[])) as any;
      }
      return db.select().from(schema.corujaoSessoes) as any;
    },
  }),
);
