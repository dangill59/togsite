export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';
import { getResend, wrapHtml, firstName, unsubscribeUrl, FROM, SITE } from '../../../lib/email';

function welcomeBody(name: string, signalCode: string): string {
  const display = `Impact, 'Arial Black', sans-serif`;
  return `
    <p style="margin:0 0 16px;font-size:17px;">You're officially in the <strong>TOG Hero Squad</strong>. We're glad you're here.</p>

    <!-- Signal code as a comic panel box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 24px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border:4px solid #5c3317;box-shadow:5px 5px 0 #5c3317;">
          <tr><td style="padding:14px 28px;text-align:center;">
            <div style="font-family:${display};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#5c3317;opacity:0.7;margin-bottom:6px;">Your Signal Code</div>
            <div style="font-family:${display};font-size:30px;font-weight:900;color:#e8641b;letter-spacing:6px;text-shadow:2px 2px 0 rgba(0,0,0,0.15);">${signalCode}</div>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 14px;font-family:${display};font-size:22px;letter-spacing:2px;text-transform:uppercase;color:#5c3317;">What the squad gets you</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${display};font-size:22px;color:#e8251b;line-height:1;">★</td><td valign="top" style="padding:4px 0;">Heads-up emails on <strong>upcoming shows and special events</strong>.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${display};font-size:22px;color:#1a8a7d;line-height:1;">★</td><td valign="top" style="padding:4px 0;">First-look at <strong>merch drops</strong> before they go public.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${display};font-size:22px;color:#e8641b;line-height:1;">★</td><td valign="top" style="padding:4px 0;"><strong>Free swag at gigs</strong> — show your hero card at the merch table and we'll hook you up. Keep it handy on your phone.</td></tr>
      <tr><td valign="top" style="width:36px;padding:6px 10px 6px 0;font-family:${display};font-size:22px;color:#6b2d5b;line-height:1;">★</td><td valign="top" style="padding:4px 0;"><strong>Custom hero merch</strong> — your superhero on a tee, mug, pin, or cap once the store opens.</td></tr>
    </table>

    <!-- CTA button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${SITE}/fanclub" style="display:inline-block;background:#e8641b;color:#fdf5e6;font-family:${display};font-size:18px;letter-spacing:3px;text-transform:uppercase;padding:14px 36px;border:3px solid #5c3317;box-shadow:4px 4px 0 #5c3317;text-decoration:none;">View My Hero Card</a>
      </td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#5c3317;opacity:0.8;text-align:center;">Re-load it from any device using your email at <a href="${SITE}/fanclub" style="color:#e8641b;">${SITE}/fanclub</a>.</p>

    <p style="margin:24px 0 0;font-size:17px;">See you at a show.</p>
    <p style="margin:6px 0 0;font-family:${display};font-size:18px;letter-spacing:2px;color:#5c3317;">— Dano, Darby &amp; Mr P</p>
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
