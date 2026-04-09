import type { Request, Response } from "express";

import { portalProjects } from "../config/projects";

export function listProjects(_req: Request, res: Response) {
  return res.json({
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
