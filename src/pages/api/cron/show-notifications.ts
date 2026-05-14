export const prerender = false;

import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';
import { shows, showSlug } from '../../../lib/shows';
import { sendShowReminderEmail, sendShowThankYouEmail } from '../../../lib/email';

// Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
// is set. We also accept x-cron-secret to make manual testing easier (curl).
function checkAuth(request: Request): boolean {
  const expected = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  if (auth === `Bearer ${expected}`) return true;
  if (request.headers.get('x-cron-secret') === expected) return true;
  return false;
}

// Returns YYYY-MM-DD for `daysFromToday` relative to UTC today. We compare against
// show isoDate strings (also YYYY-MM-DD). Using UTC keeps the comparison free of
// DST math; the +/- 1-day window of human perception is fine because we send once
// at a fixed daily cron and shows are inherently full-day events.
function isoDateOffset(daysFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

type Fan = { email: string; name: string | null; signal_code: string | null };

export const GET: APIRoute = async ({ request, url }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // ?dryRun=1 — reports counts but sends no email and records no rows. Safe to hit
  // any time. ?testTo=email@x.com — sends a single sample email of each matched
  // kind to that address without touching the squad or the notifications log.
  const dryRun = url.searchParams.get('dryRun') === '1';
  const testTo = url.searchParams.get('testTo');

  let sql;
  try { sql = getSql(); } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 503 });
  }

  const preDate = isoDateOffset(2);    // shows happening in 2 days → pre-show reminder
  const postDate = isoDateOffset(-1);  // shows that happened 1 day ago → thank-you

  const preShows = shows.filter((s) => s.isoDate === preDate);
  const postShows = shows.filter((s) => s.isoDate === postDate);

  if (preShows.length === 0 && postShows.length === 0) {
    return new Response(JSON.stringify({
      ok: true, dryRun, preDate, postDate, message: 'No shows matched today',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // testTo: send a single sample of each kind to a tester, then return
  if (testTo) {
    const samples: any[] = [];
    for (const show of preShows) {
      const slug = showSlug(show);
      try {
        await sendShowReminderEmail({
          name: 'Tester', email: testTo, signalCode: 'test',
          show: { slug, date: show.date, venue: show.venue, city: show.city, address: show.address },
        });
        samples.push({ kind: 'pre', show: slug, sent: true });
      } catch (err: any) {
        samples.push({ kind: 'pre', show: slug, error: err.message });
      }
    }
    for (const show of postShows) {
      const slug = showSlug(show);
      try {
        await sendShowThankYouEmail({
          name: 'Tester', email: testTo, signalCode: 'test',
          show: { slug, date: show.date, venue: show.venue, city: show.city, address: show.address },
        });
        samples.push({ kind: 'post', show: slug, sent: true });
      } catch (err: any) {
        samples.push({ kind: 'post', show: slug, error: err.message });
      }
    }
    return new Response(JSON.stringify({ ok: true, testTo, preDate, postDate, samples }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const fans = await sql`
    SELECT email, name, signal_code FROM fans WHERE unsubscribed_at IS NULL
  ` as Fan[];

  const results: any[] = [];

  for (const show of preShows) {
    const slug = showSlug(show);
    const r = await sendForShow(sql, fans, show, slug, 'pre', dryRun);
    results.push({ kind: 'pre', show: slug, ...r });
  }

  for (const show of postShows) {
    const slug = showSlug(show);
    const r = await sendForShow(sql, fans, show, slug, 'post', dryRun);
    results.push({ kind: 'post', show: slug, ...r });
  }

  return new Response(JSON.stringify({
    ok: true, dryRun, preDate, postDate, subscribedFans: fans.length, results,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

async function sendForShow(
  sql: ReturnType<typeof getSql>,
  fans: Fan[],
  show: typeof shows[number],
  slug: string,
  kind: 'pre' | 'post',
  dryRun: boolean,
): Promise<{ sent: number; skipped: number; failed: number; wouldSend: number; errors: string[] }> {
  // Pull all (fan_email) already notified for this (slug, kind) so we skip in one pass
  const already = await sql`
    SELECT fan_email FROM show_notifications
    WHERE show_slug = ${slug} AND kind = ${kind}
  ` as Array<{ fan_email: string }>;
  const seen = new Set(already.map((r) => r.fan_email));

  let sent = 0, skipped = 0, failed = 0, wouldSend = 0;
  const errors: string[] = [];

  if (dryRun) {
    for (const fan of fans) {
      if (seen.has(fan.email)) skipped++; else wouldSend++;
    }
    return { sent, skipped, failed, wouldSend, errors };
  }

  const showPayload = {
    slug,
    date: show.date,
    venue: show.venue,
    city: show.city,
    address: show.address,
  };

  for (const fan of fans) {
    if (seen.has(fan.email)) { skipped++; continue; }
    try {
      const payload = {
        name: fan.name,
        email: fan.email,
        signalCode: fan.signal_code,
        show: showPayload,
      };
      if (kind === 'pre') {
        await sendShowReminderEmail(payload);
      } else {
        await sendShowThankYouEmail(payload);
      }
      await sql`
        INSERT INTO show_notifications (fan_email, show_slug, kind)
        VALUES (${fan.email}, ${slug}, ${kind})
        ON CONFLICT (fan_email, show_slug, kind) DO NOTHING
      `;
      sent++;
    } catch (err: any) {
      failed++;
      if (errors.length < 5) errors.push(`${fan.email}: ${err.message}`);
    }
  }

  return { sent, skipped, failed, wouldSend, errors };
}
