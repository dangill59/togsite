export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const showId = url.searchParams.get('show_id');
  if (!showId) {
    return new Response(JSON.stringify({ error: 'Missing show_id' }), { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, fan_name, body, created_at
      FROM show_comments
      WHERE show_id = ${showId} AND hidden_at IS NULL
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return new Response(JSON.stringify({ comments: rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('comments/list error:', err.message);
    return new Response(JSON.stringify({ comments: [], error: err.message }), { status: 503 });
  }
};
