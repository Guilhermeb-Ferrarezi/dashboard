import crypto from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

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

export async function startSso(c: Context<AppEnv>): Promise<Response> {
  const projectId = c.req.param("projectId");
  const project = projectId ? findProjectById(projectId) : undefined;
  const user = c.get("user");

  if (!project || project.ssoMode !== "shared-ticket" || !project.sso) {
    return c.json({ message: "Projeto SSO nao encontrado." }, 404);
  }

  if (!user?.email) {
    return c.json({ message: "O usuario precisa de email para usar o SSO." }, 400);
  }

  if (!project.sso.sharedSecret) {
    return c.json({ message: "SSO nao configurado no servidor." }, 500);
  }

  try {
    const canStore = await canStorePendingSsoCode();

    if (!canStore) {
      return c.json({
        message: "Muitas solicitacoes SSO pendentes. Tente novamente.",
      }, 503);
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

    return c.json({
      redirectUrl: redirectUrl.toString(),
      expiresInSeconds: Math.floor(getSsoCodeTtlMs() / 1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao criar codigo SSO: ${message}`);
    return c.json({
      message: "Nao foi possivel iniciar o SSO agora.",
    }, 503);
  }
}

export async function exchangeSsoCode(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const { projectId, code } = body;
  const project = findProjectById(projectId);
  const sharedSecret = c.req.header("x-sso-shared-secret");

  if (!project || project.ssoMode !== "shared-ticket" || !project.sso) {
    return c.json({ message: "Projeto SSO nao encontrado." }, 404);
  }

  if (!code || typeof code !== "string" || !sharedSecret) {
    return c.json({ message: "Codigo e segredo compartilhado sao obrigatorios." }, 400);
  }

  if (
    !project.sso.sharedSecret ||
    !safeCompare(sharedSecret, project.sso.sharedSecret)
  ) {
    return c.json({ message: "Shared secret invalido." }, 403);
  }

  try {
    const entry = await consumePendingSsoCode(code);

    if (!entry) {
      return c.json({ message: "Codigo SSO invalido ou expirado." }, 401);
    }

    if (entry.projectId !== project.id) {
      return c.json({ message: "Codigo nao pertence a este projeto." }, 403);
    }

    if (Date.now() - entry.createdAt > getSsoCodeTtlMs()) {
      return c.json({ message: "Codigo SSO expirado." }, 401);
    }

    return c.json({
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
    return c.json({
      message: "Nao foi possivel validar o SSO agora.",
    }, 503);
  }
}
