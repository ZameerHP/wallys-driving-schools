import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Global connection pool caching to persist across reloads
declare global {
  var _postgresPool: Pool | undefined;
}

export const isSqlConfigured = Boolean(
  process.env.SQL_HOST &&
  process.env.SQL_USER &&
  process.env.SQL_PASSWORD &&
  process.env.SQL_DB_NAME
);

export const createPool = (): Pool | null => {
  if (!isSqlConfigured) {
    return null;
  }
  if (!global._postgresPool) {
    try {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 5000,
      });

      global._postgresPool.on('error', (err) => {
        console.warn('[AI Studio] Idle PostgreSQL pool warning:', err.message);
      });
    } catch (err: any) {
      console.warn('[AI Studio] Failed to create PostgreSQL pool:', err?.message);
      return null;
    }
  }
  return global._postgresPool;
};

const pool = createPool();

let dbInstance: any;
try {
  if (pool) {
    dbInstance = drizzle(pool, { schema });
  } else {
    throw new Error('PostgreSQL credentials not configured');
  }
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = { 
    findMany: async () => [], 
    findFirst: async () => null,
    findUnique: async () => null, 
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, 
    delete: async () => ({}) 
  };
  dbInstance = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : async () => [],
  });
}

export const db = dbInstance;

