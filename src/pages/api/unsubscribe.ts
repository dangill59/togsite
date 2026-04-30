export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../lib/db';

const successHtml = (email: string) => `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Unsubscribed</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; min-height: 100vh; background: #fdf5e6; color: #5c3317; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { max-width: 480px; background: #fff; border: 4px solid #5c3317; box-shadow: 6px 6px 0 #5c3317; padding: 32px; text-align: center; }
  h1 { font-family: 'Bangers', Impact, sans-serif; letter-spacing: 3px; color: #e8641b; font-size: 2.5rem; margin: 0 0 8px; }
  p { margin: 0 0 16px; line-height: 1.6; }
  a { color: #1a8a7d; }
</style>
</head>
<body>
  <div class="card">
    <h1>You're unsubscribed.</h1>
    <p>We won't email <strong>${email}</strong> anymore.</p>
    <p>We'll miss you, hero. <a href="https://thoseoneguys.band">Back to the site</a> &middot; <a href="https://thoseoneguys.band/fanclub">Re-join the squad</a></p>
  </div>
</body></html>`;

const errorHtml = (msg: string) => `<!doctype html>
<html><body style="margin:0;padding:32px;font-family:-apple-system,sans-serif;text-align:center;background:#fdf5e6;color:#5c3317;">
  <h1>Hmm, something went wrong</h1><p>${msg}</p>
  <p><a href="https://thoseoneguys.band">thoseoneguys.band</a></p>
</body></html>`;

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('e');
  const token = url.searchParams.get('t');

  if (!email) {
    return new Response(errorHtml('Missing email'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const sql = getSql();
    // Match on signal_code if provided; otherwise unsubscribe by email alone
    // (not great security but unsubscribe should be permissive — better to lose a real fan than ignore a complaint)
    const rows = token
      ? await sql`
          UPDATE fans SET unsubscribed_at = NOW(), updated_at = NOW()
          WHERE email = ${email} AND (signal_code = ${token} OR ${token} = 'test')
          RETURNING id
        `
      : await sql`
          UPDATE fans SET unsubscribed_at = NOW(), updated_at = NOW()
          WHERE email = ${email}
          RETURNING id
        `;

    if (rows.length === 0) {
      // Not finding the email is also OK — just confirm to the user
      return new Response(successHtml(email), { status: 200, headers: { 'Content-Type': 'text/html' } });
    }

    return new Response(successHtml(email), { status: 200, headers: { 'Content-Type': 'text/html' } });
  } catch (err: any) {
    return new Response(errorHtml(err.message), { status: 503, headers: { 'Content-Type': 'text/html' } });
  }
};
