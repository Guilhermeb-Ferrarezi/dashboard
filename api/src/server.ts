import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import https from "https";

import authRoutes from "./routes/auth.routes";
import { basicAuth } from "./middlewares/auth.middleware";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Se quiser proteção básica global
// app.use(basicAuth);

app.use("/auth", authRoutes);

const PORT = Number(process.env.PORT);

// Conectar ao MongoDB remoto
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Gerar certificados auto-assinados (apenas para testes; produção use Let's Encrypt)
const certDir = path.join(process.cwd(), "certs");
const keyPath = path.join(certDir, "key.pem");
const certPath = path.join(certDir, "cert.pem");

// Se não existir, gera
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log("Gerando certificados auto-assinados...");
  const { execSync } = require("child_process");
  execSync(`openssl req -x509 -newkey rsa:4096 -nodes -keyout ${keyPath} -out ${certPath} -days 365 -subj "/CN=localhost"`);
}

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);

https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});
