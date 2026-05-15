import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";
import type { CodexRuntimeTool } from "@/types/codex";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? undefined;

  try {
    const response = await serverApi<{ ok: true; tools: CodexRuntimeTool[] }>("/codex/tools", {
      cookieHeader,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel carregar as ferramentas.",
      },
      { status: 500 },
    );
  }
}
