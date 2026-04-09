import type { Request, Response } from "express";
import bcrypt from "bcrypt";

import { User } from "../models/User";

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
