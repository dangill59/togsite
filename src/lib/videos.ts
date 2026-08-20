// Live show videos surfaced in the "Live" section on /music.
//
// We deliberately do NOT self-host the source .MOV files: the clips run
// 50-250MB each straight off a phone, iPhone HEVC-in-MOV doesn't decode in
// Chrome or Firefox, and Vercel's bandwidth budget would not survive it.
// Instead we point at the copy already hosted on Facebook (or YouTube), and
// let them serve the transcoded, adaptive stream.
//
// To add a clip: post it to the FB page, copy the post permalink, and add a
// row here. Order is top-to-bottom on the page.

export type VideoSource =
  | { kind: 'facebook'; url: string }   // full post permalink, e.g. https://www.facebook.com/RocksSLC/videos/123456789/
  | { kind: 'youtube'; id: string };    // the 11-char video id, e.g. dQw4w9WgXcQ

export interface LiveVideo {
  title: string;
  venue: string;
  source: VideoSource;
}

export const liveVideos: LiveVideo[] = [
  { title: 'A Great Night in Sundance', venue: 'The Owl Bar — Sundance, UT', source: { kind: 'youtube', id: 'n4rWkEqF-ks' } },
  { title: 'One More', venue: 'The Owl Bar — Sundance, UT', source: { kind: 'youtube', id: 'UKZHEldTt6s' } },
];

// Both builders take `autoplay`, which is only ever true for the click-to-load
// path: the frame is injected in response to a click, so starting playback is
// what the visitor just asked for.
//
// Note we cannot rely on these embeds NOT autoplaying when idle. Facebook's
// reel player starts muted playback on load, and muted autoplay is exempt from
// the iframe allow="autoplay" policy, so there is no attribute that stops it.
// That is why the page renders a facade and only builds the iframe on click.
export function facebookEmbedSrc(url: string, autoplay = false): string {
  const params = new URLSearchParams({
    href: url,
    show_text: 'false',
    width: '560',
    autoplay: autoplay ? 'true' : 'false',
  });
  return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
}

export function youtubeEmbedSrc(id: string, autoplay = false): string {
  const params = new URLSearchParams({ rel: '0' });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

// The href a visitor lands on if JS is off, or if the embed fails to load.
export function watchUrl(source: VideoSource): string {
  return source.kind === 'facebook' ? source.url : `https://www.youtube.com/watch?v=${source.id}`;
}
