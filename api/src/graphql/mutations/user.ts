import { builder } from "../builder";
import { UserAccessTokenRef } from "../types/user";
import { UserAccessToken } from "../../models/UserAccessToken";

const CreateTokenInput = builder.inputType("CreateTokenInput", {
  fields: (t) => ({
    label: t.string({ required: true }),
    permissions: t.stringList({ required: true }),
    expiresInDays: t.int({ required: false }),
  }),
});

builder.mutationField("createUserToken", (t) =>
  t.field({
    type: UserAccessTokenRef,
    args: { input: t.arg({ type: CreateTokenInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;
      const token = new UserAccessToken({
        userId: ctx.user.id,
        label: input.label,
        permissions: input.permissions,
        expiresAt,
      });
      await token.save();
      return {
        id: String(token._id),
        label: token.label ?? "",
        permissions: token.permissions ?? [],
        createdAt: (token as any).createdAt ?? new Date(),
        expiresAt: (token as any).expiresAt ?? null,
      };
    },
  }),
);

builder.mutationField("revokeUserToken", (t) =>
  t.field({
    type: "Boolean",
    args: { tokenId: t.arg.string({ required: true }) },
    resolve: async (_root, { tokenId }, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      await UserAccessToken.findOneAndDelete({ _id: tokenId, userId: ctx.user.id });
      return true;
    },
  }),
);
