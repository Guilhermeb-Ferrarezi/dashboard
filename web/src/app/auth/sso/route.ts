import { NextResponse } from "next/server";

import { ApiError, serverApi } from "@/lib/api";

interface ExchangeResponse {
  user: {
    id: string;
    username: string;
    email: string | null;
    role: "user" | "admin";
  };
}

function buildRedirectUrl(requestUrl: string, path: string, error?: string) {
  const url = new URL(path, requestUrl);

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const projectId =
    process.env.SSO_PROJECT_ID?.trim() || "admin-portal";
  const sharedSecret =
    process.env.SSO_SHARED_SECRET?.trim() ||
    process.env.ADMIN_PORTAL_SSO_SECRET?.trim();
  const successPathForAdmin =
    process.env.SSO_SUCCESS_PATH_ADMIN?.trim() || "/admin/users";
  const successPathForUser =
    process.env.SSO_SUCCESS_PATH_USER?.trim() || "/home";

  if (!code) {
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/login", "missing-sso-code"),
    );
  }

  if (!sharedSecret) {
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/login", "missing-sso-secret"),
    );
  }

  try {
    const response = await serverApi<ExchangeResponse>("/sso/exchange", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        code,
      }),
      headers: {
        "x-sso-shared-secret": sharedSecret,
      },
    });

    const targetPath =
      response.user.role === "admin" ? successPathForAdmin : successPathForUser;

    return NextResponse.redirect(new URL(targetPath, request.url));
  } catch (error) {
    const reason =
      error instanceof ApiError
        ? `sso-${error.status}`
        : "sso-exchange-failed";

    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/login", reason),
    );
  }
}
