import { Router } from "express";

const router = Router();

function parseRiotId(value: unknown) {
  if (typeof value !== "string") return null;

  const [name, ...tagParts] = value.split("#");
  const tag = tagParts.join("#");

  if (!name?.trim() || !tag?.trim()) return null;

  return `${name.trim()}#${tag.trim()}`;
}

function getFriendlyValorantMessage(message: string) {
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

router.post("/lookup", async (req, res) => {
  const riotId = parseRiotId(req.body?.riotId);

  if (!riotId) {
    res.status(400).json({ ok: false, message: "Informe o Riot ID no formato Nome#TAG." });
    return;
  }

  const lookupUrl =
    process.env.VALORANT_LOOKUP_PROXY_URL?.trim() ||
    "http://localhost:3000/api/valorant-account/lookup";

  try {
    const response = await fetch(lookupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ riotId }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; [key: string]: unknown }
      | null;

    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? getFriendlyValorantMessage(payload.message)
          : "Nao foi possivel validar esse Riot ID.";
      res.status(response.status).json(
        payload ? { ...payload, message } : { ok: false, message },
      );
      return;
    }

    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    res.status(502).json({
      ok: false,
      message: getFriendlyValorantMessage(`Nao foi possivel consultar o perfil Valorant agora. ${message}`),
    });
  }
});

export default router;
