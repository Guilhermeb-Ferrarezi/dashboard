import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";
import type { CodexAccountStatus } from "@/types/codex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCONNECTED_CODEX_ACCOUNT: CodexAccountStatus = {
  connected: false,
  authMode: null,
  requiresOpenaiAuth: true,
  planType: null,
  email: null,
  sharedAccountLabel: null,
};

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; account: CodexAccountStatus }>("/codex/account", {
        cookieHeader,
      });

      return NextResponse.json(response);
    }
  } catch {
    // Fallback below.
  }

  return NextResponse.json({ ok: true, account: DISCONNECTED_CODEX_ACCOUNT });
}
