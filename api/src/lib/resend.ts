import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "Santos Games <noreply@santos-games.com>";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const r = getResend();
  if (!r) return { ok: false, error: "RESEND_API_KEY not configured" };

  try {
    await r.emails.send({
      from: RESEND_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend] send error:", message);
    return { ok: false, error: message };
  }
}
