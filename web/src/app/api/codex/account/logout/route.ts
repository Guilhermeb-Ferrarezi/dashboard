import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";

    if (cookieHeader) {
      const response = await serverApi<{ ok: true; message: string }>("/codex/account/logout", {
        method: "POST",
        cookieHeader,
      });

      return NextResponse.json(response);
    }
  } catch {
    // Fallback below.
  }

  return NextResponse.json({ ok: true, message: "Conta Codex desconectada." });
}
