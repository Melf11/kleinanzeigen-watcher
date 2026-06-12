import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { hashPassword } from './password'

let pool: Pool | undefined
let initPromise: Promise<void> | undefined

/**
 * Lazily create (and memoise) the pg connection pool. Reads the connection
 * string from runtimeConfig so it works both in dev and inside the container.
 */
export function getPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    const connectionString =
      config.databaseUrl || process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('No database connection string configured (NUXT_DATABASE_URL).')
    }

    pool = new Pool({ connectionString, max: 10 })
    pool.on('error', (err) => {
      console.error('[db] unexpected pool error', err)
    })
  }
  return pool
}

/** Small typed query helper. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as never[])
  return res.rows
}

/** Returns the first row or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

/** Run a set of statements inside a transaction. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  klaz_api_key  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS searches (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  query            TEXT NOT NULL,
  include_keywords TEXT NOT NULL DEFAULT '',
  include_mode     TEXT NOT NULL DEFAULT 'all',
  exclude_keywords TEXT NOT NULL DEFAULT '',
  location_id      TEXT,
  distance         TEXT,
  min_price        INTEGER,
  max_price        INTEGER,
  category_id      TEXT,
  poster_type      TEXT,
  ad_type          TEXT,
  picture_required BOOLEAN NOT NULL DEFAULT false,
  shippable        BOOLEAN NOT NULL DEFAULT false,
  max_pages        INTEGER NOT NULL DEFAULT 1,
  interval_minutes INTEGER NOT NULL DEFAULT 1440,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at      TIMESTAMPTZ,
  next_run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_status  TEXT,
  last_error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_due ON searches(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS ads (
  id            BIGSERIAL PRIMARY KEY,
  search_id     BIGINT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  ad_id         TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  ad_url        TEXT,
  image_url     TEXT,
  location_city TEXT,
  location_zip  TEXT,
  seller_type   TEXT,
  posted_at     TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_price INTEGER,
  status        TEXT NOT NULL DEFAULT 'active',
  removed_at    TIMESTAMPTZ,
  excluded      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (search_id, ad_id)
);
CREATE INDEX IF NOT EXISTS idx_ads_search ON ads(search_id);
-- Migration for DBs created before the "excluded" feature.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS price_history (
  id          BIGSERIAL PRIMARY KEY,
  ad_row_id   BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  price       INTEGER,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_ad ON price_history(ad_row_id, observed_at);

CREATE TABLE IF NOT EXISTS search_runs (
  id            BIGSERIAL PRIMARY KEY,
  search_id     BIGINT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  run_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ads_total     INTEGER NOT NULL DEFAULT 0,
  price_min     INTEGER,
  price_max     INTEGER,
  price_avg     NUMERIC(12,2),
  price_median  INTEGER,
  new_count     INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'ok',
  error         TEXT
);
CREATE INDEX IF NOT EXISTS idx_search_runs_search ON search_runs(search_id, run_at);

-- Generic key/value cache (e.g. the category tree — pulled once, then served from here).
CREATE TABLE IF NOT EXISTS app_cache (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications + time-of-day scheduling (added later; idempotent migrations).
ALTER TABLE searches ADD COLUMN IF NOT EXISTS notify   TEXT NOT NULL DEFAULT 'off';
ALTER TABLE searches ADD COLUMN IF NOT EXISTS run_time TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tg_bot_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tg_chat_id   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_phone     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_apikey    TEXT;

-- Email verification + secure account management.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email  TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,             -- 'verify_email' | 'reset_password' | 'change_email'
  token_hash TEXT NOT NULL,
  email      TEXT,                      -- target email for change_email / verify
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens (user_id, kind);
`

/**
 * Create the schema (idempotent) and seed the default admin user. Called once
 * from the Nitro startup plugin before the scheduler kicks in.
 */
export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit()
  }
  return initPromise
}

async function doInit(): Promise<void> {
  await getPool().query(SCHEMA_SQL)
  await seedAdmin()
  console.log('[db] schema ready')
}

async function seedAdmin(): Promise<void> {
  const config = useRuntimeConfig()
  const username = config.authUsername || 'admin'
  const password = config.authPassword || 'admin'

  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE username = $1', [
    username,
  ])
  if (existing) return

  const passwordHash = await hashPassword(password)
  const seedToken = config.klazApiKey || null
  // Seeded admin is pre-verified (no email needed to log in).
  await query(
    'INSERT INTO users (username, password_hash, klaz_api_key, email_verified) VALUES ($1, $2, $3, true)',
    [username, passwordHash, seedToken],
  )
  console.log(`[db] seeded default user "${username}"`)
}
