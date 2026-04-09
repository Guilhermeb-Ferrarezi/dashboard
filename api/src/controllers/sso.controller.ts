import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { findProjectById } from "../config/projects";

const issuer = "santos-tech-home";

function resolveSsoSecret() {
  return process.env.SSO_JWT_SECRET || process.env.JWT_SECRET;
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

  const secret = resolveSsoSecret();

  if (!secret) {
    return res.status(500).json({ message: "SSO nao configurado no servidor." });
  }

  const ticket = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      projectId: project.id,
    },
    secret,
    {
      audience: project.id,
      issuer,
      expiresIn: "2m",
    },
  );

  const redirectUrl = new URL(project.sso.redirectPath, project.url);
  redirectUrl.searchParams.set("ticket", ticket);

  return res.json({
    redirectUrl: redirectUrl.toString(),
    expiresInSeconds: 120,
  });
}

export async function exchangeSsoTicket(req: Request, res: Response) {
  const { projectId, ticket } = req.body;
  const project = findProjectById(projectId);
  const sharedSecret = req.header("x-sso-shared-secret");
  const secret = resolveSsoSecret();

  if (!project || project.ssoMode !== "shared-ticket" || !project.sso) {
    return res.status(404).json({ message: "Projeto SSO nao encontrado." });
  }

  if (!ticket || !sharedSecret) {
    return res
      .status(400)
      .json({ message: "Ticket e segredo compartilhado sao obrigatorios." });
  }

  if (!project.sso.sharedSecret || sharedSecret !== project.sso.sharedSecret) {
    return res.status(403).json({ message: "Shared secret invalido." });
  }

  if (!secret) {
    return res.status(500).json({ message: "SSO nao configurado no servidor." });
  }

  try {
    const decoded = jwt.verify(ticket, secret, {
      audience: project.id,
      issuer,
    }) as {
      sub: string;
      username: string;
      email: string;
      role: "user" | "admin";
    };

    return res.json({
      user: {
        id: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch {
    return res.status(401).json({ message: "Ticket SSO invalido ou expirado." });
  }
}
