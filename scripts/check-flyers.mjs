// Fails the build if any show in shows.ts has no announcement flyer.
//
// Why this exists: the FB announcement post uses /flyers/<slug>.png. When a
// show is added without regenerating flyers, the URL 404s and Graph API
// rejects the photo with error 324 "Missing or invalid image file" — the post
// silently never happens. That is exactly what befell the Aug 23 / Sep 12 /
// Sep 26 shows. A missing file is now a loud build failure instead.
//
// This only checks. It cannot generate: gen_flyers.py needs Pillow and
// Impact (a Windows font), neither of which exists in the Vercel build image.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const showsTs = join(root, 'src/lib/shows.ts');

// Same field order the gen_flyers.py regex relies on.
const SHOW_RE = /\{\s*date:\s*"([^"]+)",\s*isoDate:\s*"([^"]+)",\s*venue:\s*"([^"]+)"/g;

const slugify = (date, venue) =>
  `${date}-${venue}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const src = readFileSync(showsTs, 'utf8');
const shows = [...src.matchAll(SHOW_RE)].map(([, date, isoDate, venue]) => ({
  date, isoDate, venue, slug: slugify(date, venue),
}));

if (shows.length === 0) {
  console.error('check-flyers: parsed 0 shows from src/lib/shows.ts — the regex no longer matches the file.');
  process.exit(1);
}

const missing = shows.filter((s) => !existsSync(join(root, `public/flyers/${s.slug}.png`)));

if (missing.length > 0) {
  console.error(`\ncheck-flyers: ${missing.length} show(s) have no flyer:\n`);
  for (const s of missing) {
    console.error(`  ${s.isoDate}  ${s.date} @ ${s.venue}  ->  public/flyers/${s.slug}.png`);
  }
  console.error(`
Their Facebook announcements will fail with error 324 until these exist.
Generate them on a machine with Impact installed, then commit the PNGs:

  npm run flyers
`);
  process.exit(1);
}

console.log(`check-flyers: ${shows.length} show(s), all flyers present.`);
