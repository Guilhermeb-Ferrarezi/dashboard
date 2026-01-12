import type { Request, Response, NextFunction } from "express";
import express  from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------
// Middleware Basic Auth
// ----------------------
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    return res.status(401).json({ message: "Missing Basic Auth" });
  }

  const b64 = auth.split(" ")[1];
  if (!b64) return res.status(401).json({ message: "Invalid Basic Auth format" });

  const decoded = Buffer.from(b64, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (
    user === process.env.BASIC_AUTH_USER &&
    pass === process.env.BASIC_AUTH_PASS
  ) {
    return next();
  }

  return res.status(403).json({ message: "Invalid Basic Auth" });
}

// ----------------------
// Middleware JWT
// ----------------------
import jwt from "jsonwebtoken";

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

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

// ----------------------
// Rotas
// ----------------------

// Opcional: protege todas rotas com Basic Auth
// app.use(basicAuth);

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando!" });
});

// ----------------------
// Conexão MongoDB remoto
// ----------------------

// Certifique-se que a URI está no formato correto:
// mongodb://user:password@host:port/database?tls=false
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI não definido no .env!");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB conectado com sucesso!");
    const PORT = Number(process.env.PORT) || 4000;
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar MongoDB:", err);
    process.exit(1);
  });
