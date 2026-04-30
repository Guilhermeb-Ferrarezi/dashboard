import type { Request, Response } from "express";

import { User } from "../models/User";
import { normalizeThemePreferences, type ThemePreferences } from "../lib/theme-preferences";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function serializePreferences(preferences?: Partial<ThemePreferences> | null) {
  return normalizeThemePreferences(preferences);
}

function serializeUser(user: {
  _id: unknown;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  preferences?: Partial<ThemePreferences> | null;
}) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email ?? null,
    role: user.role,
    preferences: serializePreferences(user.preferences),
  };
}

export async function getCurrentUser(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const user = await User.findById(userId)
    .select("_id username email role preferences")
    .lean();

  if (!user) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  return res.json({ ok: true, user: serializeUser(user) });
}

export async function updateCurrentUserPreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  const payload = req.body?.preferences ?? req.body;

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  user.preferences = normalizeThemePreferences(payload);
  await user.save();

  return res.json({
    ok: true,
    message: "Preferencias atualizadas com sucesso.",
    preferences: serializePreferences(user.preferences),
    user: serializeUser(user),
  });
}

export async function updateCurrentUserProfile(req: Request, res: Response) {
  const userId = req.user?.id;
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const email = normalizeEmail(req.body?.email);

  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  if (!username || username.length < 3) {
    return res.status(400).json({ message: "Informe um nome com pelo menos 3 caracteres." });
  }

  if (email && !email.includes("@")) {
    return res.status(400).json({ message: "Informe um email valido." });
  }

  const existingUser = await User.findOne({
    _id: { $ne: userId },
    $or: [{ username }, ...(email ? [{ email }] : [])],
  });

  if (existingUser) {
    return res.status(409).json({ message: "Nome ou email ja esta em uso." });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "Usuario nao encontrado." });
  }

  user.username = username;
  user.email = email;
  await user.save();

  return res.json({
    ok: true,
    message: "Conta atualizada com sucesso.",
    user: serializeUser(user),
  });
}
