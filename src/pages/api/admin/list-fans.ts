export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

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

  try {
    const sql = getSql();
    const subscribed = await sql`
      SELECT email, name, favorite_member, created_at
      FROM fans
      WHERE unsubscribed_at IS NULL
      ORDER BY created_at DESC
    `;
    const unsubscribed = await sql`
      SELECT COUNT(*)::int AS count FROM fans WHERE unsubscribed_at IS NOT NULL
    `;

    return new Response(JSON.stringify({
      subscribed,
      subscribedCount: subscribed.length,
      unsubscribedCount: unsubscribed[0]?.count || 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }
};
