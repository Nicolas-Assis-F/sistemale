// E-mails transacionais via Resend (server-only).
// Sem RESEND_API_KEY: em desenvolvimento o conteúdo vai para o console (dá para
// testar o fluxo de login sem enviar nada); em produção o envio falha com erro claro.
import { Resend } from 'resend';

const BRAND = { ink: '#0b0a3b', blue: '#3158ef', yellow: '#f7cd47', muted: '#5d6080' };

let client: Resend | null = null;
function resend() {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const r = resend();
  if (!r || !process.env.EMAIL_FROM) {
    // EMAIL_CONSOLE_FALLBACK=true permite testar com `next start` sem Resend
    if (process.env.NODE_ENV === 'production' && process.env.EMAIL_CONSOLE_FALLBACK !== 'true') {
      throw new Error('E-mail não configurado (RESEND_API_KEY / EMAIL_FROM).');
    }
    console.info(`\n[email:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return;
  }
  const { error } = await r.emails.send({ from: process.env.EMAIL_FROM, to, subject, html, text });
  if (error) throw new Error(`Resend: ${error.message}`);
}

/** Envio que nunca derruba o fluxo principal (ex.: webhook de pagamento). */
export async function sendEmailSafe(args: Parameters<typeof sendEmail>[0]) {
  try {
    await sendEmail(args);
  } catch (error) {
    console.error('[email] falha ao enviar:', error instanceof Error ? error.message : error);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Layout único dos e-mails: tabela + estilos inline (compatível com Gmail/Outlook). */
export function emailLayout({ title, intro, cta, footnote }: { title: string; intro: string; cta?: { label: string; url: string }; footnote?: string }) {
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5fa;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fa;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3e5ef">
<tr><td style="background:${BRAND.ink};padding:20px 28px;color:#ffffff;font-weight:bold;font-size:15px;letter-spacing:.5px">L&amp;E TORNEADORA<div style="font-weight:normal;font-size:10px;letter-spacing:2px;color:#a9abcf;margin-top:4px">ENGENHARIA PARA PERFURAÇÃO</div></td></tr>
<tr><td style="height:3px;background:${BRAND.blue}"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">${esc(title)}</h1>
<p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:${BRAND.muted}">${esc(intro)}</p>
${cta ? `<a href="${esc(cta.url)}" style="display:inline-block;background:${BRAND.blue};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:13px 22px;border-radius:10px">${esc(cta.label)}</a>
<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted}">Se o botão não funcionar, copie e cole no navegador:<br><span style="word-break:break-all;color:${BRAND.blue}">${esc(cta.url)}</span></p>` : ''}
${footnote ? `<p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted}">${esc(footnote)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #eceef5;font-size:11px;color:${BRAND.muted}">L E TORNEADORA LTDA - ME · CNPJ 44.492.124/0001-07</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, '', intro, cta ? `\n${cta.label}: ${cta.url}` : '', footnote ? `\n${footnote}` : ''].join('\n');
  return { html, text };
}
