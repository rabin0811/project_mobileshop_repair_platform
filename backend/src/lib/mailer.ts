import { env } from '../config/env';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Minimal HTML shell for transactional emails. Real templates come from EmailTemplate (Phase 1.5). */
export function emailShell(bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#111;padding:24px;max-width:520px;margin:0 auto">
    <div style="font-weight:700;margin-bottom:16px">{{SHOP_NAME}}</div>
    <div>${bodyHtml}</div>
    <p style="color:#6b7280;font-size:12px;margin-top:24px">— Team {{SHOP_NAME}}</p>
  </body></html>`;
}

/**
 * Send via Resend. Without RESEND_API_KEY (dev), the email is logged to stdout so
 * flows can be tested locally without a real provider (docs/deployment.md).
 */
export async function sendEmail(input: MailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail:dev] to="${input.to}" subject="${input.subject}"`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM, to: input.to, subject: input.subject, html: input.html, text: input.text }),
    });
    if (!res.ok) console.error('[mail] Resend error', res.status, await res.text());
  } catch (e) {
    console.error('[mail] Resend failure', e);
  }
}
