import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { portalProjects } from "../config/projects";

export function listProjects(c: Context<AppEnv>): Response {
  return c.json({
    projects: portalProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      url: project.url,
      category: project.category,
      audience: project.audience,
      tags: project.tags,
      icon: project.icon,
      status: project.status,
      ssoMode: project.ssoMode,
      featured: project.featured,
    })),
  });
}
