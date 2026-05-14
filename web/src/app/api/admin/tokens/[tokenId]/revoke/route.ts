import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params;

  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; revoked: true; tokenId: string }>(
        `/admin/tokens/${encodeURIComponent(tokenId)}/revoke`,
        {
          method: "POST",
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
          error instanceof Error ? error.message : "Nao foi possivel revogar o token.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
}
