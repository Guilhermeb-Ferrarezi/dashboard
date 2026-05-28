import { builder } from "../builder";
import { UserRef, UserAccessTokenRef } from "../types/user";
import { User } from "../../models/User";
import { UserAccessToken } from "../../models/UserAccessToken";

builder.queryField("me", (t) =>
  t.field({
    type: UserRef,
    nullable: true,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) return null;
      const authUserId = Number(ctx.user.id);
      if (Number.isNaN(authUserId)) return null;
      const user = await User.findOne({ authUserId }).lean();
      if (!user) return null;
      return {
        id: String(user.authUserId ?? (user as any)._id),
        username: user.username,
        email: user.email ?? null,
        role: user.role,
      };
    },
  }),
);

builder.queryField("userTokens", (t) =>
  t.field({
    type: [UserAccessTokenRef],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const tokens = await UserAccessToken.find({ userId: ctx.user.id }).lean();
      return tokens.map((tk: any) => ({
        id: String(tk._id),
        label: tk.label ?? "",
        permissions: tk.permissions ?? [],
        createdAt: tk.createdAt ?? new Date(),
        expiresAt: tk.expiresAt ?? null,
      }));
    },
  }),
);
