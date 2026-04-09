import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User } from "../models/User";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export async function register(req: Request, res: Response) {
  const { username, email, password, role } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!username || !password || !normalizedEmail) {
    return res
      .status(400)
      .json({ message: "Preencha usuario, email e senha." });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Usuario ou email ja existe." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email: normalizedEmail,
      password: hashed,
      role: role || "user",
    });

    await user.save();
    return res.status(201).json({ message: "Usuario criado!" });
  } catch {
    return res
      .status(400)
      .json({ message: "Nao foi possivel criar o usuario." });
  }
}

export async function login(req: Request, res: Response) {
  const identifier = req.body.identifier || req.body.username || req.body.email;
  const { password } = req.body;
  const normalizedIdentifier = normalizeEmail(identifier);

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ message: "Preencha usuario/email e senha." });
  }

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: normalizedIdentifier }],
  });

  if (!user) {
    return res.status(401).json({ message: "Usuario nao encontrado." });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ message: "Senha invalida." });
  }

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email ?? null,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  res.cookie("auth_token", token, buildCookieOptions());

  return res.json({
    token,
    message: "Login realizado com sucesso!",
    user: {
      id: user._id,
      username: user.username,
      email: user.email ?? null,
      role: user.role,
    },
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("auth_token", buildCookieOptions());

  return res.json({ message: "Logout realizado com sucesso!" });
}
