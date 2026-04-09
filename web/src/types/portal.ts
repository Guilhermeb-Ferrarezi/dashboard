export type ProjectStatus = "live" | "pilot" | "beta";
export type ProjectSsoMode = "none" | "shared-ticket";

export interface PortalProject {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  audience: string;
  tags: string[];
  icon: string;
  status: ProjectStatus;
  ssoMode: ProjectSsoMode;
  featured: boolean;
}

export interface PortalUserSummary {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt?: string;
}
