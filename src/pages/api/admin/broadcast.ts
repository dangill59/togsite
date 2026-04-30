export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getSql } from '../../../lib/db';

function checkAuth(request: Request): boolean {
  const expected = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-password') || '';
  return provided === expected;
}

const SITE = 'https://thoseoneguys.band';
const FROM = 'Those One Guys <fans@thoseoneguys.band>';

function wrapHtml(bodyHtml: string, name: string, unsubscribeUrl: string) {
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
      <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#5c3317;">Unsubscribe</a> &middot; <a href="${SITE}" style="color:#5c3317;">thoseoneguys.band</a></p>
    </div>
  </div>
</body>
</html>`;
}

function firstName(name: string | null): string {
  return (name || '').split(' ')[0] || '';
}

export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const apiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Resend not configured' }), { status: 500 });
  }

  const { subject, body, dryRun, testTo } = await request.json();
  if (!subject || !body) {
    return new Response(JSON.stringify({ error: 'Missing subject or body' }), { status: 400 });
  }

  const resend = new Resend(apiKey);
  let sql;
  try { sql = getSql(); } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }

  // Test mode: send to a single email for preview
  if (testTo) {
    const html = wrapHtml(body.replace(/\{\{name\}\}/g, 'Test'), 'Test',
      `${SITE}/api/unsubscribe?e=${encodeURIComponent(testTo)}&t=test`);
    try {
      const result = await resend.emails.send({ from: FROM, to: [testTo], subject, html });
      return new Response(JSON.stringify({ ok: true, testTo, id: result.data?.id }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // Pull all subscribed fans
  const fans = await sql`
    SELECT email, name, signal_code FROM fans WHERE unsubscribed_at IS NULL
  ` as Array<{ email: string; name: string | null; signal_code: string | null }>;

  if (dryRun) {
    return new Response(JSON.stringify({
      ok: true, dryRun: true, recipients: fans.length,
    }), { status: 200 });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Send in batches of 100 (Resend's batch limit)
  const BATCH = 100;
  for (let i = 0; i < fans.length; i += BATCH) {
    const chunk = fans.slice(i, i + BATCH);
    const messages = chunk.map((fan) => {
      const name = firstName(fan.name);
      const personalBody = body.replace(/\{\{name\}\}/g, name || 'hero');
      const unsubscribeUrl = `${SITE}/api/unsubscribe?e=${encodeURIComponent(fan.email)}&t=${encodeURIComponent(fan.signal_code || '')}`;
      return {
        from: FROM,
        to: [fan.email],
        subject,
        html: wrapHtml(personalBody, name, unsubscribeUrl),
      };
    });

    try {
      const result = await resend.batch.send(messages);
      if (result.error) {
        failed += chunk.length;
        errors.push(result.error.message);
      } else {
        sent += chunk.length;
      }
    } catch (err: any) {
      failed += chunk.length;
      errors.push(err.message);
    }
  }

  return new Response(JSON.stringify({
    ok: failed === 0,
    total: fans.length,
    sent,
    failed,
    errors: errors.slice(0, 5),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
