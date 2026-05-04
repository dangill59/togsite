export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';
import { getResend, wrapHtml, firstName, unsubscribeUrl, FROM, SITE } from '../../../lib/email';

function welcomeBody(name: string, signalCode: string): string {
  return `
    <p style="margin:0 0 16px;">Welcome to the <strong>TOG Hero Squad</strong>. You're officially one of us now.</p>

    <div style="margin:24px 0;padding:18px;border:3px dashed #e8641b;background:#fff8ec;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#5c3317;opacity:0.7;">Your signal code</p>
      <p style="margin:0;font-family:'Courier New',monospace;font-size:24px;font-weight:bold;color:#e8641b;letter-spacing:4px;">${signalCode}</p>
    </div>

    <p style="margin:0 0 12px;"><strong>What this gets you:</strong></p>
    <ul style="margin:0 0 16px;padding-left:20px;">
      <li>Heads-up emails on upcoming shows and special events.</li>
      <li>First-look at merch drops before they go public.</li>
      <li><strong>Free swag at gigs</strong> — show us your hero card at the merch table and we'll hook you up. Keep it handy.</li>
      <li>Custom hero merch (your superhero on a tee, mug, pin, or cap) once the store opens.</li>
    </ul>

    <p style="margin:0 0 16px;">Your card lives at <a href="${SITE}/fanclub" style="color:#e8641b;">${SITE}/fanclub</a> — you can re-load it from any device using your email.</p>

    <p style="margin:0 0 16px;">See you at a show.</p>
    <p style="margin:0;">— Dano, Darby & Mr P</p>
  `;
}

async function sendWelcome(email: string, name: string | null, signalCode: string | null) {
  if (!signalCode) return; // can't generate unsub link without a code
  try {
    const resend = getResend();
    const fname = firstName(name);
    const html = wrapHtml(welcomeBody(fname, signalCode), fname, unsubscribeUrl(email, signalCode));
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Welcome to the TOG Hero Squad!',
      html,
    });
  } catch (err: any) {
    // Don't fail signup if welcome email fails — just log
    console.error('Welcome email send failed:', err.message);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const { email, name, favorite_member, superpower, signal_code } = await request.json();

  if (!email || !name) {
    return new Response(JSON.stringify({ error: 'Missing email or name' }), { status: 400 });
  }

  try {
    const sql = getSql();
    // xmax = 0 on a freshly inserted row; non-zero on an UPDATE via ON CONFLICT
    const rows = await sql`
      INSERT INTO fans (email, name, favorite_member, superpower, signal_code)
      VALUES (${email}, ${name}, ${favorite_member || null}, ${superpower || null}, ${signal_code || null})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        favorite_member = EXCLUDED.favorite_member,
        superpower = EXCLUDED.superpower,
        signal_code = EXCLUDED.signal_code,
        updated_at = NOW()
      RETURNING email, name, favorite_member, superpower, signal_code, created_at,
        (xmax = 0) AS is_new
    `;

    const fan = rows[0];
    const isNew = fan?.is_new === true;

    if (isNew) {
      await sendWelcome(fan.email as string, fan.name as string | null, fan.signal_code as string | null);
    }

    return new Response(JSON.stringify({ fan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('fans/upsert error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }
};
