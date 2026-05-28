import { cookies, headers } from "next/headers";

import { serverApi } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function DebugSessionPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieHeader = cookieStore.toString();
  const allCookies = cookieStore.getAll().map((c) => ({
    name: c.name,
    valueLength: c.value.length,
  }));

  const envInfo = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? null,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL ?? null,
    API_URL: process.env.API_URL ?? null,
    NEXT_PUBLIC_AUTH_API_URL: process.env.NEXT_PUBLIC_AUTH_API_URL ?? null,
  };

  let userMeResult: { ok: boolean; status?: number; body?: unknown; error?: string } = {
    ok: false,
  };

  try {
    const data = (await serverApi<{ user?: { id?: string; role?: string } }>(
      "/user/me",
      { cookieHeader },
    )) as { user?: { id?: string; role?: string } };
    userMeResult = {
      ok: true,
      body: { user: { id: data.user?.id, role: data.user?.role } },
    };
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    userMeResult = {
      ok: false,
      status: e.status,
      error: e.message ?? String(err),
    };
  }

  return (
    <pre style={{ padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
{JSON.stringify({
  env: envInfo,
  host: headerStore.get("host"),
  xForwardedHost: headerStore.get("x-forwarded-host"),
  xForwardedProto: headerStore.get("x-forwarded-proto"),
  cookieHeaderLength: cookieHeader.length,
  cookies: allCookies,
  userMe: userMeResult,
}, null, 2)}
    </pre>
  );
}
