import type { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const hash:any = process.env.HASH
export async function register(req: Request, res: Response) {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Preencha todos os campos." });

  const hashed = await bcrypt.hash(password, hash);
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

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Senha inválida" });

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  res.json({ token });
}
