export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';
import { getResend, wrapHtml, firstName, unsubscribeUrl, FROM, SITE } from '../../../lib/email';

function checkAuth(request: Request): boolean {
  const expected = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-password') || '';
  return provided === expected;
}

export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { subject, body, dryRun, testTo } = await request.json();
  if (!subject || !body) {
    return new Response(JSON.stringify({ error: 'Missing subject or body' }), { status: 400 });
  }

  let resend, sql;
  try { resend = getResend(); } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
  try { sql = getSql(); } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }

  // Test mode: send to a single email for preview
  if (testTo) {
    const html = wrapHtml(body.replace(/\{\{name\}\}/g, 'Test'), 'Test', unsubscribeUrl(testTo, 'test'));
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
      return {
        from: FROM,
        to: [fan.email],
        subject,
        html: wrapHtml(personalBody, name, unsubscribeUrl(fan.email, fan.signal_code)),
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
