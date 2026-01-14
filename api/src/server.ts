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

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rotas protegidas
app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

app.get("/api/user", verifyJWT, requireRole("user"), (req, res) => {
  res.json({ message: "Dashboard Jovem Tech RP " });
});

app.get("/api/admin", verifyJWT, requireRole("admin"), (req, res) => {
  res.json({ message: "Jovem Tech RP" });
});

// Teste
app.get("/api", (req, res) => res.json({ message: "Backend rodando!" }));

// Mongo
if (!process.env.MONGO_URI) process.exit(1);

mongoose.connect(process.env.MONGO_URI).then(() => {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => console.log(`Backend rodando: http://localhost:${PORT}`));
});
