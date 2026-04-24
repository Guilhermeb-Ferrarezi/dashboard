import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HenrikAccountResponse = {
  data?: {
    puuid?: string;
    name?: string;
    tag?: string;
    region?: string;
    account_level?: number;
    card?: {
      small?: string;
      large?: string;
      wide?: string;
      id?: string;
    } | string;
  };
  errors?: Array<{ message?: string }>;
  message?: string;
};

type HenrikMmrResponse = {
  data?: {
    current?: {
      tier?: {
        name?: string;
      };
    };
    peak?: {
      tier?: {
        name?: string;
      };
    };
  };
  errors?: Array<{ message?: string }>;
  message?: string;
};

function parseRiotId(value: unknown) {
  if (typeof value !== "string") return null;

  const [name, ...tagParts] = value.split("#");
  const tag = tagParts.join("#");

  if (!name?.trim() || !tag?.trim()) return null;

  return {
    name: name.trim(),
    tag: tag.trim(),
  };
}

function readApiEnvValue(name: string) {
  try {
    const apiEnv = readFileSync(resolve(process.cwd(), "../api/.env"), "utf8");
    const line = apiEnv
      .split(/\r?\n/u)
      .find((item) => item.trim().startsWith(`${name}=`));

    return line?.split("=").slice(1).join("=").trim();
  } catch {
    return undefined;
  }
}

function getHenrikApiKey() {
  return (
    process.env.HENRIKDEV_API_KEY?.trim() ||
    process.env.HENRIKDEV_API_DEV?.trim() ||
    readApiEnvValue("HENRIKDEV_API_KEY") ||
    readApiEnvValue("HENRIKDEV_API_DEV")
  );
}

function getFriendlyHenrikMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("fetching needed match data") || normalized.includes("play a game")) {
    return "Encontramos sua conta, mas ainda nao conseguimos carregar rank e level. Jogue uma partida recente no Valorant e tente de novo depois.";
  }

  if (normalized.includes("account not found")) {
    return "Nao encontramos esse Riot ID. Confira se o nome e a tag estao corretos, no formato Nome#TAG.";
  }

  if (normalized.includes("unauthorized")) {
    return "Nao foi possivel validar o Riot ID agora. Tente novamente mais tarde.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Muitas consultas foram feitas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  return message;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    ...(process.env.VCT_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean) ?? []),
  ];

  if (!origin || !allowedOrigins.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

async function requestHenrik<T>(endpoint: string, headers: Record<string, string>) {
  const response = await fetch(endpoint, { headers, cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as T | null)
    : null;

  return { response, payload };
}

function getCardImages(card: HenrikAccountResponse["data"] extends infer D ? D extends { card?: infer C } ? C | undefined : never : never) {
  if (!card || typeof card === "string") {
    return { small: "", wide: "" };
  }

  return {
    small: card.small || card.large || "",
    wide: card.wide || card.large || card.small || "",
  };
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const body = (await request.json().catch(() => null)) as { riotId?: unknown } | null;
  const riotId = parseRiotId(body?.riotId);

  if (!riotId) {
    return NextResponse.json(
      { ok: false, message: "Informe o Riot ID no formato Nome#TAG." },
      { status: 400, headers: corsHeaders },
    );
  }

  const apiKey = getHenrikApiKey();
  const endpoint = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(riotId.name)}/${encodeURIComponent(riotId.tag)}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = apiKey;

  try {
    const { response, payload } = await requestHenrik<HenrikAccountResponse>(endpoint, headers);

    if (!response.ok || !payload?.data) {
      const message =
        payload?.errors?.[0]?.message ||
        payload?.message ||
        (response.status >= 500
          ? "HenrikDev indisponivel no momento."
          : "Nao foi possivel encontrar essa conta na HenrikDev.");

      return NextResponse.json(
        { ok: false, message: getFriendlyHenrikMessage(message) },
        { status: response.ok ? 404 : response.status, headers: corsHeaders },
      );
    }

    const region = payload.data.region || "br";
    const mmrEndpoint = `https://api.henrikdev.xyz/valorant/v3/mmr/${encodeURIComponent(region)}/pc/${encodeURIComponent(payload.data.name || riotId.name)}/${encodeURIComponent(payload.data.tag || riotId.tag)}`;
    const mmr = await requestHenrik<HenrikMmrResponse>(mmrEndpoint, headers).catch(() => null);
    const cardImages = getCardImages(payload.data.card);

    return NextResponse.json(
      {
        ok: true,
        account: {
          riotName: payload.data.name || riotId.name,
          riotTag: payload.data.tag || riotId.tag,
          riotPuuid: payload.data.puuid || "",
          region,
          accountLevel: payload.data.account_level ?? null,
          card: payload.data.card ?? null,
          cardSmall: cardImages.small,
          cardWide: cardImages.wide,
          currentRank: mmr?.payload?.data?.current?.tier?.name || "",
          peakRank: mmr?.payload?.data?.peak?.tier?.name || "",
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    return NextResponse.json(
      { ok: false, message: getFriendlyHenrikMessage(`Nao foi possivel conectar na HenrikDev agora. ${message}`) },
      { status: 502, headers: corsHeaders },
    );
  }
}
