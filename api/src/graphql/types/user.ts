import { builder } from "../builder";

export interface UserShape {
  id: string;
  username: string;
  email?: string | null;
  role: string;
}

export interface UserAccessTokenShape {
  id: string;
  label: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date | null;
}

export const UserRef = builder.objectRef<UserShape>("User");
export const UserAccessTokenRef = builder.objectRef<UserAccessTokenShape>("UserAccessToken");

builder.objectType(UserRef, {
  fields: (t) => ({
    id: t.exposeString("id"),
    username: t.exposeString("username"),
    email: t.string({ nullable: true, resolve: (u) => u.email ?? null }),
    role: t.exposeString("role"),
  }),
});

builder.objectType(UserAccessTokenRef, {
  fields: (t) => ({
    id: t.exposeString("id"),
    label: t.exposeString("label"),
    permissions: t.exposeStringList("permissions"),
    createdAt: t.field({ type: "Date", resolve: (tk) => tk.createdAt }),
    expiresAt: t.field({ type: "Date", nullable: true, resolve: (tk) => tk.expiresAt ?? null }),
  }),
});
