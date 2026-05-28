import { builder } from "../builder";
import { VctTimeRef, VctInscricaoRef } from "../types/vct";
import { VctTime } from "../../models/VctTime";
import { VctInscricao } from "../../models/VctInscricao";

builder.queryField("vctTimes", (t) =>
  t.field({
    type: [VctTimeRef],
    resolve: async () => VctTime.find().lean() as any,
  }),
);

builder.queryField("vctInscricoes", (t) =>
  t.field({
    type: [VctInscricaoRef],
    args: { timeId: t.arg.string({ required: false }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      const filter = args.timeId ? { timeId: args.timeId } : {};
      return VctInscricao.find(filter).lean() as any;
    },
  }),
);
