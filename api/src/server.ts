import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import { verifyJWT } from "./middlewares/jwe";
import { requireRole } from "./middlewares/role";

dotenv.config();
const app = express();

// Configuração CORS para permitir cookies entre domínios
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: Postman) ou de origens permitidas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Permite envio de cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json());

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rotas protegidas
app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

app.get("/api/user", verifyJWT, requireRole("user"), (_req, res) => {
  res.json({ message: "Dashboard Jovem Tech RP " });
});

app.get("/api/admin", verifyJWT, requireRole("admin"), (_req, res) => {
  res.json({ message: "Jovem Tech RP" });
});

// Teste
app.get("/api", (_req, res) => res.json({ message: "Backend rodando!" }));

// Mongo
if (!process.env.MONGO_URI) process.exit(1);

mongoose.connect(process.env.MONGO_URI).then(() => {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => console.log(`Backend rodando: http://localhost:${PORT}`));
});
