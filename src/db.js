import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT, name TEXT, avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS location_history (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export { pool, initDb };
