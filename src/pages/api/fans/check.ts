export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const { email } = await request.json();
  if (!email) {
    return new Response(JSON.stringify({ fan: null }), { status: 200 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT email, name, favorite_member, superpower, signal_code, created_at
      FROM fans
      WHERE email = ${email}
      LIMIT 1
    `;
    return new Response(JSON.stringify({ fan: rows[0] || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('fans/check error:', err.message);
    return new Response(JSON.stringify({ fan: null, error: err.message }), { status: 503 });
  }
};
