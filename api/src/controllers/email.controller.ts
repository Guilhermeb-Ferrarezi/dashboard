import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { sendEmail } from "../lib/resend";
import { escapeHtml } from "../lib/normalize";

export async function sendCustomEmail(c: Context<AppEnv>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { to, subject, body: emailBody } = body as {
      to?: string | string[];
      subject?: string;
      body?: string;
    };

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return c.json({ message: "Destinatário obrigatório." }, 400);
    }

    if (!subject?.trim()) {
      return c.json({ message: "Assunto obrigatório." }, 400);
    }

    if (!emailBody?.trim()) {
      return c.json({ message: "Corpo do email obrigatório." }, 400);
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:32px">
      <h1 style="color:#e5303a;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0">
        Santos Games
      </h1>
    </div>
    <div style="background:#111;border:1px solid #222;padding:32px 24px">
      <h2 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 16px">${escapeHtml(subject.trim())}</h2>
      <div style="color:#ccc;font-size:14px;line-height:1.7">${escapeHtml(emailBody.trim()).replace(/\n/g, "<br>")}</div>
    </div>
    <p style="color:#666;font-size:12px;text-align:center;margin-top:24px">
      Santos Games Arena · Este email foi enviado pelo painel administrativo.
    </p>
  </div>
</body>
</html>`;

    const recipients = Array.isArray(to) ? to : [to];
    const result = await sendEmail(recipients, subject.trim(), html);

    if (!result.ok) {
      return c.json({ message: `Erro ao enviar: ${result.error}` }, 502);
    }

    return c.json({ message: "Email enviado.", recipients: recipients.length });
  } catch (error) {
    console.error("[email] sendCustomEmail error:", error);
    return c.json({ message: "Erro ao enviar email." }, 500);
  }
}
