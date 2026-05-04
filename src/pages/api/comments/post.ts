export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

const MAX_BODY = 1000;
const RATE_LIMIT_PER_HOUR = 5;

export const POST: APIRoute = async ({ request }) => {
  const { email, signal_code, show_id, show_label, body, website } = await request.json();

  // Honeypot — bots fill hidden field
  if (website) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (!email || !signal_code || !show_id || !body) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const trimmed = String(body).trim();
  if (trimmed.length === 0) {
    return new Response(JSON.stringify({ error: 'Comment is empty' }), { status: 400 });
  }
  if (trimmed.length > MAX_BODY) {
    return new Response(JSON.stringify({ error: `Comment too long (max ${MAX_BODY} chars)` }), { status: 400 });
  }

  try {
    const sql = getSql();

    // Verify the fan exists and the signal_code matches
    const fans = await sql`
      SELECT email, name FROM fans
      WHERE email = ${email} AND signal_code = ${signal_code}
      LIMIT 1
    ` as Array<{ email: string; name: string | null }>;

    if (fans.length === 0) {
      return new Response(JSON.stringify({ error: 'Squad verification failed' }), { status: 403 });
    }

    const fan = fans[0];

    // Per-IP rate limit: 5 comments/hour
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await sql`
      SELECT id FROM rate_limits
      WHERE ip_address = ${ip} AND endpoint = 'comments-post' AND created_at >= ${oneHourAgo}
    `;
    if (recent.length >= RATE_LIMIT_PER_HOUR) {
      return new Response(JSON.stringify({ error: 'Slow down — try again later.' }), { status: 429 });
    }
    await sql`INSERT INTO rate_limits (ip_address, endpoint) VALUES (${ip}, 'comments-post')`;

    const inserted = await sql`
      INSERT INTO show_comments (show_id, show_label, fan_email, fan_name, body)
      VALUES (${show_id}, ${show_label || null}, ${fan.email}, ${fan.name}, ${trimmed})
      RETURNING id, fan_name, body, created_at
    `;

    return new Response(JSON.stringify({ comment: inserted[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('comments/post error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }
};
