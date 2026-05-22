import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "20";

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; logs: unknown[] }>(
        `/user/tokens/${encodeURIComponent(tokenId)}/usage?limit=${encodeURIComponent(limit)}`,
        { cookieHeader },
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel carregar o historico.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
}
