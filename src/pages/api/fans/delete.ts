export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const { email, signal_code } = await request.json();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400 });
  }

  try {
    const sql = getSql();
    // Require signal_code to match — prevents random email deletions
    const rows = signal_code
      ? await sql`DELETE FROM fans WHERE email = ${email} AND signal_code = ${signal_code} RETURNING id`
      : await sql`DELETE FROM fans WHERE email = ${email} RETURNING id`;

    return new Response(JSON.stringify({ deleted: rows.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('fans/delete error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }
};
