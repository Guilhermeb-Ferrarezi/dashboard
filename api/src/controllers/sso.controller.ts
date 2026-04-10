import crypto from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

import { findProjectById } from "../config/projects";
import {
  canStorePendingSsoCode,
  consumePendingSsoCode,
  getSsoCodeTtlMs,
  storePendingSsoCode,
} from "../lib/sso-code-store";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function startSso(req: Request, res: Response) {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;
  const project = projectId ? findProjectById(projectId) : undefined;
  const user = req.user;

  if (!project || project.ssoMode !== "shared-ticket" || !project.sso) {
    return res.status(404).json({ message: "Projeto SSO nao encontrado." });
  }

  if (!user?.email) {
    return res
      .status(400)
      .json({ message: "O usuario precisa de email para usar o SSO." });
  }

  if (!project.sso.sharedSecret) {
    return res.status(500).json({ message: "SSO nao configurado no servidor." });
  }

  try {
    const canStore = await canStorePendingSsoCode();

    if (!canStore) {
      return res.status(503).json({
        message: "Muitas solicitacoes SSO pendentes. Tente novamente.",
      });
    }

    const code = crypto.randomBytes(32).toString("hex");

    await storePendingSsoCode(code, {
      projectId: project.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: Date.now(),
    });

    const redirectUrl = new URL(project.sso.redirectPath, project.url);
    redirectUrl.searchParams.set("code", code);

    return res.json({
      redirectUrl: redirectUrl.toString(),
      expiresInSeconds: Math.floor(getSsoCodeTtlMs() / 1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao criar codigo SSO: ${message}`);
    return res.status(503).json({
      message: "Nao foi possivel iniciar o SSO agora.",
    });
  }
}

export async function exchangeSsoCode(req: Request, res: Response) {
  const { projectId, code } = req.body;
  const project = findProjectById(projectId);
  const sharedSecret = req.header("x-sso-shared-secret");

  if (!project || project.ssoMode !== "shared-ticket" || !project.sso) {
    return res.status(404).json({ message: "Projeto SSO nao encontrado." });
  }

  if (!code || typeof code !== "string" || !sharedSecret) {
    return res
      .status(400)
      .json({ message: "Codigo e segredo compartilhado sao obrigatorios." });
  }

  if (
    !project.sso.sharedSecret ||
    !safeCompare(sharedSecret, project.sso.sharedSecret)
  ) {
    return res.status(403).json({ message: "Shared secret invalido." });
  }

  try {
    const entry = await consumePendingSsoCode(code);

    if (!entry) {
      return res
        .status(401)
        .json({ message: "Codigo SSO invalido ou expirado." });
    }

    if (entry.projectId !== project.id) {
      return res
        .status(403)
        .json({ message: "Codigo nao pertence a este projeto." });
    }

    if (Date.now() - entry.createdAt > getSsoCodeTtlMs()) {
      return res.status(401).json({ message: "Codigo SSO expirado." });
    }

    return res.json({
      user: {
        id: entry.userId,
        username: entry.username,
        email: entry.email,
        role: entry.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao trocar codigo SSO: ${message}`);
    return res.status(503).json({
      message: "Nao foi possivel validar o SSO agora.",
    });
  }
}
