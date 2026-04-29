import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (_sql) return _sql;
  const url = import.meta.env.NEON_URL || process.env.NEON_URL;
  if (!url) throw new Error('NEON_URL is not set');
  _sql = neon(url);
  return _sql;
}
