import type { Request, Response } from "express";

import { normalizeEmail } from "../lib/normalize";
import { User } from "../models/User";
import { UserAccessToken } from "../models/UserAccessToken";
import { AdminAccessToken } from "../models/AdminAccessToken";
import { normalizeThemePreferences, type ThemePreferences } from "../lib/theme-preferences";

function serializePreferences(preferences?: Partial<ThemePreferences> | null) {
  return normalizeThemePreferences(preferences);
}

function serializeUser(user: {
  _id: unknown;
  authUserId?: number;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  preferences?: Partial<ThemePreferences> | null;
}) {
  return {
    id: user.authUserId != null ? String(user.authUserId) : String(user._id),
    username: user.username,
    email: user.email ?? null,
    role: user.role,
    preferences: serializePreferences(user.preferences),
  };
}

export async function getCurrentUser(req: Request, res: Response) {
  const authUserId = Number(req.user?.id);

  if (!req.user?.id || Number.isNaN(authUserId)) {
    console.warn("[user/me] Missing or invalid req.user.id:", req.user);
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    let user = await User.findOne({ authUserId }).lean();

    if (!user) {
      const legacy = await User.findOne({
        $or: [
          { email: req.user!.email },
          { username: req.user!.username },
        ],
        authUserId: { $exists: false },
      });

      if (legacy) {
        legacy.authUserId = authUserId;
        legacy.role = req.user!.role;
        await legacy.save();
      const oldId = String(legacy._id);
      const newId = String(authUserId);
      await Promise.all([
        UserAccessToken.updateMany({ userId: oldId }, { userId: newId }),
        AdminAccessToken.updateMany({ adminId: oldId }, { adminId: newId }),
      ]);
      try {
        const { default: mongoose } = await import("mongoose");
        const db = mongoose.connection.db;
        if (db) {
          await Promise.all([
            db.collection("codexthreadsessions").updateMany({ userId: oldId }, { $set: { userId: newId } }),
            db.collection("portalrecents").updateMany({ userId: oldId }, { $set: { userId: newId } }),
          ]);
        }
      } catch {}
      user = legacy.toObject();
    } else {
      const newUser = new User({
        authUserId,
        username: req.user!.username,
        email: req.user!.email,
        role: req.user!.role,
      });
      await newUser.save();
      user = newUser.toObject();
    }
    }

    return res.json({ ok: true, user: serializeUser(user) });
  } catch (err) {
    console.error("[user/me] Failed:", err);
    return res.status(500).json({ message: "Erro ao carregar usuario." });
  }
}

export async function updateCurrentUserPreferences(req: Request, res: Response) {
  const authUserId = Number(req.user?.id);
  const payload = req.body?.preferences ?? req.body;

  if (!req.user?.id || Number.isNaN(authUserId)) {
    return res.status(401).json({ message: "Missing token" });
  }

  let user = await User.findOne({ authUserId });

  if (!user) {
    user = new User({
      authUserId,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role,
    });
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
  const authUserId = Number(req.user?.id);
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const email = normalizeEmail(req.body?.email);

  if (!req.user?.id || Number.isNaN(authUserId)) {
    return res.status(401).json({ message: "Missing token" });
  }

  if (!username || username.length < 3) {
    return res.status(400).json({ message: "Informe um nome com pelo menos 3 caracteres." });
  }

  if (email && !email.includes("@")) {
    return res.status(400).json({ message: "Informe um email valido." });
  }

  const existingUser = await User.findOne({
    authUserId: { $ne: authUserId },
    $or: [{ username }, ...(email ? [{ email }] : [])],
  });

  if (existingUser) {
    return res.status(409).json({ message: "Nome ou email ja esta em uso." });
  }

  let user = await User.findOne({ authUserId });

  if (!user) {
    user = new User({
      authUserId,
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role,
    });
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
