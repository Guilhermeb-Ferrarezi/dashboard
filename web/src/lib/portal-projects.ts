import { serverApi } from "@/lib/api-server";
import type { PortalProject } from "@/types/portal";

export async function loadPortalProjects() {
  const response = await serverApi<{ projects: PortalProject[] }>("/projects");

  return response.projects;
}
