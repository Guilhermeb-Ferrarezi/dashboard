import { builder } from "../builder";
import { VctInscricaoRef } from "../types/vct";
import { VctInscricao } from "../../models/VctInscricao";

const VctInscricaoInput = builder.inputType("VctInscricaoInput", {
  fields: (t) => ({
    nomeJogador: t.string({ required: true }),
    tagRiot: t.string({ required: true }),
    timeId: t.string({ required: false }),
  }),
});

builder.mutationField("createVctInscricao", (t) =>
  t.field({
    type: VctInscricaoRef,
    args: { input: t.arg({ type: VctInscricaoInput, required: true }) },
    resolve: async (_root, { input }) => {
      const inscricao = new VctInscricao({
        nomeJogador: input.nomeJogador,
        tagRiot: input.tagRiot,
        timeId: input.timeId ?? undefined,
      });
      await inscricao.save();
      return inscricao.toObject() as any;
    },
  }),
);
