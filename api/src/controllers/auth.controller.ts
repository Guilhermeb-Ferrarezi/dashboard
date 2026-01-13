import type { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function register(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });

  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = new User({ username, password: hashed });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ message: "Username already exists" });
  }
}


export async function login(req: Request, res: Response) {
  const { password } = req.body;

  if (!password)
    return res.status(400).json({ message: "Senha obrigatória" });

  // usuário único (admin)
  const user = await User.findOne();
  if (!user)
    return res.status(500).json({ message: "Usuário não configurado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ message: "Senha inválida" });

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  res.json({ token });
}
