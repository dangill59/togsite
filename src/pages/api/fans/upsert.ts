export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const { email, name, favorite_member, superpower, signal_code } = await request.json();

  if (!email || !name) {
    return new Response(JSON.stringify({ error: 'Missing email or name' }), { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO fans (email, name, favorite_member, superpower, signal_code)
      VALUES (${email}, ${name}, ${favorite_member || null}, ${superpower || null}, ${signal_code || null})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        favorite_member = EXCLUDED.favorite_member,
        superpower = EXCLUDED.superpower,
        signal_code = EXCLUDED.signal_code,
        updated_at = NOW()
      RETURNING email, name, favorite_member, superpower, signal_code, created_at
    `;
    return new Response(JSON.stringify({ fan: rows[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('fans/upsert error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }
};
