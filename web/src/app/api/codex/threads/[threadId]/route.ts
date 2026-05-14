import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";
import type { CodexThreadDetail } from "@/types/codex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await context.params;

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true } & CodexThreadDetail>(
        `/codex/threads/${encodeURIComponent(threadId)}`,
        { cookieHeader },
      );

      return NextResponse.json(response);
    }
  } catch {
    // Fallback below.
  }

  return NextResponse.json(
    { ok: false, message: "Nao foi possivel carregar a conversa agora." },
    { status: 503 },
  );
}
