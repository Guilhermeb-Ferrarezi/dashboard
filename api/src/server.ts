import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.routes";
import { requireRole } from "./middlewares/role";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- JWT Middleware ---
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// --- Rotas ---
app.use("/auth", authRoutes);

app.get("/user/me", verifyJWT, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get("/admin", verifyJWT, requireRole("admin"), (req, res) => {
  res.json({ message: "Área ADMIN" });
});

app.get("/user", verifyJWT, requireRole("user"), (req, res) => {
  res.json({ message: "Área USER" });
});

app.get("/", (req, res) => {
  res.json({ message: "Backend rodando!" });
});

// --- Mongo ---
mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    const PORT = Number(process.env.PORT) || 4000;
    app.listen(PORT, () => console.log(`Backend na porta ${PORT}`));
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
