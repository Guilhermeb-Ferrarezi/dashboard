import type { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const hash:any = process.env.HASH
export async function register(req: Request, res: Response) {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Preencha todos os campos." });

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, password: hashed, role: role || "user" });
    await user.save();
    res.status(201).json({ message: "Usuário Criado!" });
  } catch {
    res.status(400).json({ message: "Usuário já existe." });
  }
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Preencha todos os campos." });

  const user = await User.findOne({ username: username });
  if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Senha inválida" });

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // Define o cookie compartilhado entre subdomínios
  res.cookie("auth_token", token, {
    httpOnly: true,        // Não acessível via JavaScript (segurança XSS)
    secure: process.env.NODE_ENV === "production",  // HTTPS apenas em produção
    sameSite: "lax",       // Proteção CSRF mantendo cookies em navegação
    domain: process.env.COOKIE_DOMAIN || undefined, // Ex: ".santos-tech.com"
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em milissegundos
    path: "/"
  });

  res.json({ token, message: "Login realizado com sucesso!" });
}

export async function logout(_req: Request, res: Response) {
  // Limpa o cookie de autenticação
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/"
  });

  res.json({ message: "Logout realizado com sucesso!" });
}
