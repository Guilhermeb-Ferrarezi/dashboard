export type TokenResource = "profile" | "sessions" | "checkout" | "projects" | "logs" | "codex" | "admin" | "*";
export type TokenAction = "read" | "write" | "admin";
export type TokenScope = `${TokenResource}:${TokenAction}`;

export const ALL_SCOPES: TokenScope[] = [
  "profile:read",
  "profile:write",
  "sessions:read",
  "sessions:admin",
  "checkout:read",
  "checkout:write",
  "checkout:admin",
  "projects:read",
  "projects:write",
  "logs:read",
  "codex:read",
  "codex:write",
  "admin:read",
  "admin:write",
  "admin:admin",
];

export const SCOPE_GROUPS: Record<string, TokenScope[]> = {
  profile:  ["profile:read", "profile:write"],
  sessions: ["sessions:read", "sessions:admin"],
  checkout: ["checkout:read", "checkout:write", "checkout:admin"],
  projects: ["projects:read", "projects:write"],
  logs:     ["logs:read"],
  codex:    ["codex:read", "codex:write"],
  admin:    ["admin:read", "admin:write", "admin:admin"],
};

export const SCOPE_PRESETS: Record<string, string[]> = {
  "read-only":   ["*:read"],
  "read-write":  ["*:read", "*:write"],
  "full-access": ["*:admin"],
};

const ACTION_LEVEL: Record<TokenAction, number> = {
  read:  1,
  write: 2,
  admin: 3,
};

function parseScope(scope: string): { resource: string; action: TokenAction } | null {
  const parts = scope.split(":");
  if (parts.length !== 2) return null;
  const [resource, action] = parts;
  if (!["read", "write", "admin"].includes(action)) return null;
  return { resource, action: action as TokenAction };
}

/**
 * Verifica se o array de permissões cobre o escopo requerido.
 * Array vazio = acesso total (backwards-compat com tokens legados).
 */
export function hasTokenPermission(permissions: string[], required: TokenScope): boolean {
  if (permissions.length === 0) return true;

  const req = parseScope(required);
  if (!req) return false;

  for (const perm of permissions) {
    const p = parseScope(perm);
    if (!p) continue;

    const resourceMatch = p.resource === "*" || p.resource === req.resource;
    const actionLevel = ACTION_LEVEL[p.action] >= ACTION_LEVEL[req.action];

    if (resourceMatch && actionLevel) return true;
  }

  return false;
}

export function validatePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter(
    (p): p is string =>
      typeof p === "string" &&
      ALL_SCOPES.includes(p as TokenScope),
  );
}
