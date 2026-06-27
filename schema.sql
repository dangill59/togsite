-- TOG site schema for Neon (Postgres).
-- Paste into the Neon SQL editor and run.

CREATE TABLE IF NOT EXISTS fans (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  favorite_member TEXT,
  superpower TEXT,
  signal_code TEXT,
  hero_image_url TEXT,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run once on existing DBs:
-- ALTER TABLE fans ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
-- ALTER TABLE fans ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_fans_email ON fans(email);
CREATE INDEX IF NOT EXISTS idx_fans_signal ON fans(signal_code);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_email TEXT NOT NULL,
  items JSONB NOT NULL,
  total_cents INTEGER NOT NULL,
  fulfillment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  printful_order_id TEXT,
  shipping_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(fan_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS mockups (
  id BIGSERIAL PRIMARY KEY,
  fan_email TEXT NOT NULL,
  product TEXT NOT NULL,
  variation INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fan_email, product, variation)
);

CREATE INDEX IF NOT EXISTS idx_mockups_fan ON mockups(fan_email);

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(ip_address, endpoint, created_at);

CREATE TABLE IF NOT EXISTS show_comments (
  id BIGSERIAL PRIMARY KEY,
  show_id TEXT NOT NULL,
  show_label TEXT,
  fan_email TEXT NOT NULL,
  fan_name TEXT,
  body TEXT NOT NULL,
  hidden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_comments_lookup
  ON show_comments(show_id, created_at DESC);

-- Records each pre-show ("pre") and post-show ("post") notification email
-- sent to a fan, keyed by (fan_email, show_slug, kind) so the daily cron
-- can be idempotent: it queries this table to skip fans already notified.
CREATE TABLE IF NOT EXISTS show_notifications (
  id BIGSERIAL PRIMARY KEY,
  fan_email TEXT NOT NULL,
  show_slug TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pre', 'post')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fan_email, show_slug, kind)
);

CREATE INDEX IF NOT EXISTS idx_show_notifications_lookup
  ON show_notifications(show_slug, kind);

-- Records each Facebook post fanned out by the cron. One row per (show, kind)
-- so the UNIQUE constraint makes the cron idempotent: a redrive can't double-post.
-- Successful posts store fb_post_id; failures store error so we can retry next tick
-- (the cron deletes failed rows before re-attempting).
CREATE TABLE IF NOT EXISTS fb_posts (
  id BIGSERIAL PRIMARY KEY,
  show_slug TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('announcement', 'pre', 'post')),
  fb_post_id TEXT,
  error TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_slug, kind)
);

CREATE INDEX IF NOT EXISTS idx_fb_posts_lookup
  ON fb_posts(show_slug, kind);
