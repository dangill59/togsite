// Facebook Graph API page-post wrapper.
//
// FB_PAGE_ID comes from env. The page access token comes from app_config
// in Neon (refreshed weekly by the refresh-fb-token cron), with the env
// var FB_PAGE_ACCESS_TOKEN as the bootstrap fallback. See src/lib/fbToken.ts.
//
// The Graph API "post id" returned from /photos is `{pageId}_{postId}` — store
// it as-is in fb_posts.fb_post_id; it's the canonical handle for edits/deletes.

import { getCurrentPageToken } from './fbToken';

const GRAPH_VERSION = 'v21.0';

function pageId(): string {
  const id = import.meta.env.FB_PAGE_ID || process.env.FB_PAGE_ID;
  if (!id) throw new Error('FB_PAGE_ID must be set');
  return id;
}

async function token(): Promise<string> {
  const t = await getCurrentPageToken();
  if (!t) throw new Error('No FB page access token available (env or app_config)');
  return t;
}

export function isFbConfigured(): boolean {
  const id = import.meta.env.FB_PAGE_ID || process.env.FB_PAGE_ID;
  const t = import.meta.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  // We only require env-level signals here so the cron can short-circuit
  // before hitting Neon. If env-token is set but app_config has a fresher one,
  // postPhoto/postText will pick that up at call time.
  return Boolean(id && t);
}

export async function postText(message: string): Promise<string> {
  const id = pageId();
  const t = await token();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${id}/feed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: t }),
  });
  const data: any = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`FB postText failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

// imageUrl must be publicly reachable (FB fetches it server-side). Our public/
// assets satisfy this at https://thoseoneguys.band/...
//
// `message` is what creates the timeline story. We learned the hard way that
// `caption` on /photos is the alt-text only — using it alone uploads the image
// to the album but creates no feed post. Always send the post copy as `message`.
export async function postPhoto(imageUrl: string, message: string): Promise<string> {
  const id = pageId();
  const t = await token();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${id}/photos`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, message, published: true, access_token: t }),
  });
  const data: any = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`FB postPhoto failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.post_id || data.id;
}

// === Caption builders ===
//
// One source of truth for the three kinds of show post. Tweak the copy here
// and every future show automatically picks up the new wording.

const SITE = 'https://thoseoneguys.band';

type ShowForCaption = {
  slug: string;
  date: string;   // "AUG 7"
  venue: string;
  city: string;
};

function showLink(slug: string): string {
  return `${SITE}/shows#${slug}`;
}

export function captionAnnouncement(show: ShowForCaption): string {
  return [
    `🎸 NEW SHOW! ${show.date} at ${show.venue} in ${show.city}.`,
    ``,
    `Loud guitars. Big grooves. Zero chill.`,
    ``,
    `Details + directions: ${showLink(show.slug)}`,
  ].join('\n');
}

export function captionReminder(show: ShowForCaption): string {
  return [
    `🎸 THIS WEEK — ${show.date} at ${show.venue} in ${show.city}.`,
    ``,
    `Come hang. Bring the squad.`,
    ``,
    `Details + directions: ${showLink(show.slug)}`,
  ].join('\n');
}

export function captionThanks(show: ShowForCaption): string {
  return [
    `🍻 Thanks for coming out to ${show.venue} last night, ${show.city}!`,
    ``,
    `That crowd was something else. See you at the next one.`,
    ``,
    `Upcoming shows: ${SITE}/shows`,
  ].join('\n');
}

// === Image picker per kind ===
//
// Returns a public URL to the image FB should attach. Defaults to the OG share
// card for all kinds today; we'll add per-show flyers and a thanks image later.

export type FbPostKind = 'announcement' | 'pre' | 'post';

export function imageForKind(_kind: FbPostKind, _slug: string): string {
  return `${SITE}/og-share.png`;
}
