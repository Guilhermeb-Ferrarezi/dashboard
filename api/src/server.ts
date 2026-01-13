import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.routes";
import { allowRoles } from "./middlewares/role.middleware";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Basic Auth ---
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    return res.status(401).json({ message: "Missing Basic Auth" });
  }
  const b64 = auth.split(" ")[1];
  if (!b64) return res.status(401).json({ message: "Invalid Basic Auth format" });
  const [user, pass] = Buffer.from(b64, "base64").toString().split(":");
  if (user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS) return next();
  return res.status(403).json({ message: "Invalid Basic Auth" });
}

// --- JWT Middleware ---
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "Missing token" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}


// --- Rotas ---
app.use("/api/auth", authRoutes);

app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

// apenas ADMIN
app.get(
  "/api/admin",
  verifyJWT,
  allowRoles("admin"),
  (req, res) => {
    res.json({ message: "Área admin" });
  }
);

// ADMIN e USUÁRIO
app.get(
  "/api/user",
  verifyJWT,
  allowRoles("usuario", "admin"),
  (req, res) => {
    res.json({ message: "Área usuário" });
  }
);



app.get("/api", (req, res) => {
  res.json({ message: "Backend rodando!" });
});


// --- Conexão MongoDB ---
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI não definido!");
  process.exit(1);
}
const BASE_URL = process.env.BASE_URL
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado!");
    const PORT = Number(process.env.PORT) || 4000;
    app.listen(PORT, () => console.log(`http://${BASE_URL}/${PORT}`));
  })
  .catch((err) => {
    console.error("Erro ao conectar MongoDB:", err);
    process.exit(1);
  });
