-- TOG site schema for Neon (Postgres).
-- Paste into the Neon SQL editor and run.

CREATE TABLE IF NOT EXISTS fans (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  favorite_member TEXT,
  superpower TEXT,
  signal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
