import type { Request, Response } from "express";
import bcrypt from "bcrypt";

import { User } from "../models/User";
import mongoose from "mongoose";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function serializeUser(user: {
  _id: unknown;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  createdAt?: Date;
}) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email ?? null,
    role: user.role,
    createdAt: user.createdAt?.toISOString(),
  };
}

export async function listUsers(_req: Request, res: Response) {
  const users = await User.find()
    .sort({ createdAt: -1 })
    .select("_id username email role createdAt")
    .lean();

  return res.json({ users: users.map(serializeUser) });
}

export async function createUser(req: Request, res: Response) {
  const { username, email, password, role } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!username || !password || !normalizedEmail) {
    return res
      .status(400)
      .json({ message: "Preencha usuario, email e senha." });
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email: normalizedEmail }],
  });

  if (existingUser) {
    return res.status(400).json({ message: "Usuario ou email ja existe." });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email: normalizedEmail,
    password: hashed,
    role: role === "admin" ? "admin" : "user",
  });

  return res.status(201).json({
    message: "Usuario criado com sucesso.",
    user: serializeUser(user),
  });
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const { username, email, password, role } = req.body as {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  const updates: Record<string, unknown> = {};

  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) return res.status(400).json({ message: "Nome de usuário não pode ser vazio." });
    updates.username = trimmed;
  }

  if (email !== undefined) {
    const normalized = normalizeEmail(email);
    updates.email = normalized ?? null;
  }

  if (role !== undefined) {
    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ message: "Perfil inválido." });
    }
    updates.role = role;
  }

  if (password !== undefined) {
    const trimmed = password.trim();
    if (trimmed.length < 6) return res.status(400).json({ message: "Senha deve ter ao menos 6 caracteres." });
    updates.password = await bcrypt.hash(trimmed, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Nenhum campo para atualizar." });
  }

  if (updates.username || updates.email !== undefined) {
    const orConditions: Record<string, unknown>[] = [];
    if (updates.username) orConditions.push({ username: updates.username });
    if (updates.email) orConditions.push({ email: updates.email });

    if (orConditions.length > 0) {
      const conflict = await User.findOne({ $or: orConditions, _id: { $ne: id } }).lean();
      if (conflict) return res.status(400).json({ message: "Nome de usuário ou email já em uso." });
    }
  }

  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .select("_id username email role createdAt")
    .lean();

  if (!user) return res.status(404).json({ message: "Usuário não encontrado." });

  return res.json({ message: "Usuário atualizado.", user: serializeUser(user) });
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) return res.status(404).json({ message: "Usuário não encontrado." });

  return res.json({ message: "Usuário removido." });
}
