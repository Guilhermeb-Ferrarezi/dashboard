import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";
import type { UserAccessTokenSummary } from "@/types/user-access-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; tokens: UserAccessTokenSummary[] }>(
        `/user/tokens${type ? `?type=${encodeURIComponent(type)}` : ""}`,
        {
          cookieHeader,
        },
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Nao foi possivel carregar os tokens.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const body = await request.text();

    if (cookieHeader) {
      const response = await serverApi<{
        ok: true;
        tokenId: string;
        token: string;
        label: string;
        type: "account" | "codex";
      }>("/user/tokens", {
        method: "POST",
        body,
        cookieHeader,
      });

      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Nao foi possivel criar o token.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
}
