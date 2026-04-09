import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import projectRoutes from "./routes/projects.routes";
import ssoRoutes from "./routes/sso.routes";
import { verifyJWT } from "./middlewares/jwe";
import { requireRole } from "./middlewares/role";

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const baseAllowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) || [];
const allowedOrigins = isProduction
  ? baseAllowedOrigins
  : Array.from(
      new Set([
        ...baseAllowedOrigins,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
      ]),
    );

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-sso-shared-secret"],
  }),
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sso", ssoRoutes);

app.get("/api/user/me", verifyJWT, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get("/api/user", verifyJWT, requireRole("user"), (_req, res) => {
  res.json({ message: "Area do usuario liberada." });
});

app.get("/api/admin", verifyJWT, requireRole("admin"), (_req, res) => {
  res.json({ message: "Area administrativa liberada." });
});

app.get("/api", (_req, res) => res.json({ message: "Backend rodando!" }));

if (!process.env.MONGO_URI) {
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(() => {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`Backend rodando: http://localhost:${port}`);
  });
});
