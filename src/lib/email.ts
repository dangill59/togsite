import { Resend } from 'resend';

export const SITE = 'https://thoseoneguys.band';
export const FROM = 'Those One Guys <fans@thoseoneguys.band>';

export function getResend() {
  const key = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

export function unsubscribeUrl(email: string, signalCode: string | null) {
  return `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(signalCode || '')}`;
}

export function firstName(name: string | null | undefined): string {
  return (name || '').split(' ')[0] || '';
}

export function wrapHtml(bodyHtml: string, name: string, unsubUrl: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#fdf5e6;font-family:'Helvetica Neue',Arial,sans-serif;color:#5c3317;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:4px solid #5c3317;box-shadow:6px 6px 0 #5c3317;">
    <div style="background:linear-gradient(135deg,#5c3317,#6b2d5b,#e8641b);padding:24px;text-align:center;">
      <h1 style="margin:0;color:#fdf5e6;font-family:Bangers,Impact,sans-serif;font-size:36px;letter-spacing:3px;">THOSE ONE GUYS!</h1>
    </div>
    <div style="padding:32px 24px;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 16px;">Hey ${name || 'hero'},</p>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:2px dashed #5c3317;font-size:12px;color:#5c3317;opacity:0.7;text-align:center;">
      <p style="margin:0 0 8px;">You're getting this because you joined the TOG Hero Squad.</p>
      <p style="margin:0;"><a href="${unsubUrl}" style="color:#5c3317;">Unsubscribe</a> &middot; <a href="${SITE}" style="color:#5c3317;">thoseoneguys.band</a></p>
    </div>
  </div>
</body>
</html>`;
}
