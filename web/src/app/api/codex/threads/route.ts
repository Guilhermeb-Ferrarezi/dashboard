import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";
import type { CodexThreadSummary } from "@/types/codex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; threads: CodexThreadSummary[] }>("/codex/threads", {
        cookieHeader,
      });

      return NextResponse.json(response);
    }
  } catch {
    // Fallback below.
  }

  return NextResponse.json({ ok: true, threads: [] as CodexThreadSummary[] });
}
