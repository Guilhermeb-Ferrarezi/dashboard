import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ toolId: string }> },
) {
  const cookieHeader = request.headers.get("cookie") ?? undefined;
  const { toolId } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const response = await serverApi(`/codex/tools/${encodeURIComponent(toolId)}/run`, {
      method: "POST",
      body: JSON.stringify(body),
      cookieHeader,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel executar a ferramenta.",
      },
      { status: 500 },
    );
  }
}
