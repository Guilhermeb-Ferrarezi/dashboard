import type { Request, Response } from "express";
import { sendEmail } from "../lib/resend";
import { escapeHtml } from "../lib/normalize";

export async function sendCustomEmail(req: Request, res: Response) {
  try {
    const { to, subject, body } = req.body as {
      to?: string | string[];
      subject?: string;
      body?: string;
    };

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return res.status(400).json({ message: "Destinatário obrigatório." });
    }

    if (!subject?.trim()) {
      return res.status(400).json({ message: "Assunto obrigatório." });
    }

    if (!body?.trim()) {
      return res.status(400).json({ message: "Corpo do email obrigatório." });
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
      <div style="color:#ccc;font-size:14px;line-height:1.7">${escapeHtml(body.trim()).replace(/\n/g, "<br>")}</div>
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
      return res.status(502).json({ message: `Erro ao enviar: ${result.error}` });
    }

    return res.json({ message: "Email enviado.", recipients: recipients.length });
  } catch (error) {
    console.error("[email] sendCustomEmail error:", error);
    return res.status(500).json({ message: "Erro ao enviar email." });
  }
}
