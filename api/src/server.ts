import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import { verifyJWT } from "./middlewares/jwe";
import { requireRole } from "./middlewares/role";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- Rotas ---
app.use("/api/auth", authRoutes);

// Rota protegida: qualquer usuário logado
app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

// Rota protegida: apenas admin
app.get("/api/admin", verifyJWT, requireRole("admin"), (req, res) => {
  res.json({ message: "Área ADMIN" });
});

// Rota protegida: apenas user
app.get("/api/user", verifyJWT, requireRole("user"), (req, res) => {
  res.json({ message: "Área USER" });
});

app.get("/api", (req, res) => res.json({ message: "Backend rodando!" }));

// --- Conexão MongoDB ---
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI não definido!");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado!");
    const PORT = Number(process.env.PORT) || 4000;
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Erro ao conectar MongoDB:", err);
    process.exit(1);
  });
