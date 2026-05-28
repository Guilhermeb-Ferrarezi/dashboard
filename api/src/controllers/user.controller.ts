import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

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

export async function getCurrentUser(c: Context<AppEnv>): Promise<Response> {
  const reqUser = c.get("user");
  const authUserId = Number(reqUser?.id);

  if (!reqUser?.id || Number.isNaN(authUserId)) {
    console.warn("[user/me] Missing or invalid req.user.id:", reqUser);
    return c.json({ message: "Missing token" }, 401);
  }

  try {
    let user = await User.findOne({ authUserId }).lean();

    if (!user) {
      const legacy = await User.findOne({
        $or: [
          { email: reqUser!.email },
          { username: reqUser!.username },
        ],
        authUserId: { $exists: false },
      });

      if (legacy) {
        legacy.authUserId = authUserId;
        legacy.role = reqUser!.role;
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
        username: reqUser!.username,
        email: reqUser!.email,
        role: reqUser!.role,
      });
      await newUser.save();
      user = newUser.toObject();
    }
    }

    return c.json({ ok: true, user: serializeUser(user) });
  } catch (err) {
    console.error("[user/me] Failed:", err);
    return c.json({ message: "Erro ao carregar usuario." }, 500);
  }
}

export async function updateCurrentUserPreferences(c: Context<AppEnv>): Promise<Response> {
  const reqUser = c.get("user");
  const authUserId = Number(reqUser?.id);
  const body = await c.req.json();
  const payload = body?.preferences ?? body;

  if (!reqUser?.id || Number.isNaN(authUserId)) {
    return c.json({ message: "Missing token" }, 401);
  }

  let user = await User.findOne({ authUserId });

  if (!user) {
    user = new User({
      authUserId,
      username: reqUser!.username,
      email: reqUser!.email,
      role: reqUser!.role,
    });
  }

  user.preferences = normalizeThemePreferences(payload);
  await user.save();

  return c.json({
    ok: true,
    message: "Preferencias atualizadas com sucesso.",
    preferences: serializePreferences(user.preferences),
    user: serializeUser(user),
  });
}

export async function updateCurrentUserProfile(c: Context<AppEnv>): Promise<Response> {
  const reqUser = c.get("user");
  const authUserId = Number(reqUser?.id);
  const body = await c.req.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const email = normalizeEmail(body?.email);

  if (!reqUser?.id || Number.isNaN(authUserId)) {
    return c.json({ message: "Missing token" }, 401);
  }

  if (!username || username.length < 3) {
    return c.json({ message: "Informe um nome com pelo menos 3 caracteres." }, 400);
  }

  if (email && !email.includes("@")) {
    return c.json({ message: "Informe um email valido." }, 400);
  }

  const existingUser = await User.findOne({
    authUserId: { $ne: authUserId },
    $or: [{ username }, ...(email ? [{ email }] : [])],
  });

  if (existingUser) {
    return c.json({ message: "Nome ou email ja esta em uso." }, 409);
  }

  let user = await User.findOne({ authUserId });

  if (!user) {
    user = new User({
      authUserId,
      username: reqUser!.username,
      email: reqUser!.email,
      role: reqUser!.role,
    });
  }

  user.username = username;
  user.email = email;
  await user.save();

  return c.json({
    ok: true,
    message: "Conta atualizada com sucesso.",
    user: serializeUser(user),
  });
}
