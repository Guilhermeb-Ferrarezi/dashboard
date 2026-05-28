import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import bcrypt from "bcrypt";

import { normalizeEmail } from "../lib/normalize";
import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { AdminAccessToken } from "../models/AdminAccessToken";
import mongoose from "mongoose";

function serializeUser(user: {
  _id: unknown;
  authUserId?: number;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  createdAt?: Date;
}) {
  return {
    id: user.authUserId != null ? String(user.authUserId) : String(user._id),
    username: user.username,
    email: user.email ?? null,
    role: user.role,
    createdAt: user.createdAt?.toISOString(),
  };
}

export async function listUsers(_c: Context<AppEnv>): Promise<Response> {
  const users = await User.find()
    .sort({ createdAt: -1 })
    .select("_id authUserId username email role createdAt")
    .lean();

  return _c.json({ users: users.map(serializeUser) });
}

export async function createUser(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const { username, email, password, role } = body;
  const normalizedEmail = normalizeEmail(email);

  if (!username || !password || !normalizedEmail) {
    return c.json({ message: "Preencha usuario, email e senha." }, 400);
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email: normalizedEmail }],
  });

  if (existingUser) {
    return c.json({ message: "Usuario ou email ja existe." }, 400);
  }

  if (password.length < 8) {
    return c.json({ message: "A senha deve ter pelo menos 8 caracteres" }, 400);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    username,
    email: normalizedEmail,
    password: hashed,
    role: role === "admin" ? "admin" : "user",
  });

  return c.json({
    message: "Usuario criado com sucesso.",
    user: serializeUser(user),
  }, 201);
}

export async function updateUser(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param("id");
  if (!mongoose.isValidObjectId(id)) {
    return c.json({ message: "ID inválido." }, 400);
  }

  const body = await c.req.json();
  const { username, email, password, role } = body as {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  const updates: Record<string, unknown> = {};

  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) return c.json({ message: "Nome de usuário não pode ser vazio." }, 400);
    updates.username = trimmed;
  }

  if (email !== undefined) {
    const normalized = normalizeEmail(email);
    updates.email = normalized ?? null;
  }

  if (role !== undefined) {
    if (role !== "user" && role !== "admin") {
      return c.json({ message: "Perfil inválido." }, 400);
    }
    updates.role = role;
  }

  if (password !== undefined) {
    const trimmed = password.trim();
    if (trimmed.length < 8) return c.json({ message: "A senha deve ter pelo menos 8 caracteres" }, 400);
    updates.password = await bcrypt.hash(trimmed, 12);
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ message: "Nenhum campo para atualizar." }, 400);
  }

  if (updates.username || updates.email !== undefined) {
    const orConditions: Record<string, unknown>[] = [];
    if (updates.username) orConditions.push({ username: updates.username });
    if (updates.email) orConditions.push({ email: updates.email });

    if (orConditions.length > 0) {
      const conflict = await User.findOne({ $or: orConditions, _id: { $ne: id } }).lean();
      if (conflict) return c.json({ message: "Nome de usuário ou email já em uso." }, 400);
    }
  }

  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .select("_id authUserId username email role createdAt")
    .lean();

  if (!user) return c.json({ message: "Usuário não encontrado." }, 404);

  // Revoke all active tokens on password change
  if (updates.password) {
    await UserAccessToken.updateMany(
      { userId: id, revokedAt: null },
      { revokedAt: new Date() },
    );
    await AdminAccessToken.updateMany(
      { adminId: id, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  return c.json({ message: "Usuário atualizado.", user: serializeUser(user) });
}

export async function deleteUser(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param("id");
  if (!mongoose.isValidObjectId(id)) {
    return c.json({ message: "ID inválido." }, 400);
  }

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) return c.json({ message: "Usuário não encontrado." }, 404);

  await Promise.all([
    UserAccessToken.updateMany({ userId: id, revokedAt: null }, { revokedAt: new Date() }),
    AdminAccessToken.updateMany({ adminId: id, revokedAt: null }, { revokedAt: new Date() }),
  ]);

  return c.json({ message: "Usuário removido." });
}
