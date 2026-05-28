import type { YogaInitialContext } from "graphql-yoga";
import type { GraphQLContext } from "./builder";
import type { AuthUserPayload } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";
import { authenticateUserAccessToken } from "../lib/user-access-token";
import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function createGraphQLContext(yogaCtx: YogaInitialContext): Promise<GraphQLContext> {
  const request = yogaCtx.request;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k?.trim() ?? "", v.join("=")];
    }),
  );

  const cookieToken = cookies[AUTH_COOKIE_NAME]?.trim();
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const authToken = cookieToken || bearerToken;

  if (authToken) {
    const session = await verifySessionToken(authToken, process.env.JWT_SECRET!);
    if (session) {
      const user: AuthUserPayload = {
        id: String(session.userId),
        username: session.login,
        email: session.email,
        role: session.role === ADMIN_ROLE ? "admin" : "user",
        authType: "session",
      };
      return { user };
    }

    const apiToken = await authenticateUserAccessToken(authToken);
    if (apiToken) {
      return {
        user: {
          ...apiToken.user,
          authType: "token",
          tokenPermissions: apiToken.token.permissions ?? [],
        },
      };
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: authHeader,
    "x-codex-access-token": request.headers.get("x-codex-access-token"),
  });
  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    return {
      user: { id: "codex-service", username: "codex-agent", role: "admin", authType: "service" },
    };
  }

  return { user: null };
}
