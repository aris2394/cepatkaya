let localDbInstance: any = null;

async function getDbInstance() {
  if (!localDbInstance) {
    const Database = (await import('better-sqlite3')).default;
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    
    const dbPath = join(process.cwd(), 'cepatkaya-local.sqlite');
    localDbInstance = new Database(dbPath);
    
    // Auto-init schema if not present
    const schemaFile = join(process.cwd(), 'db', 'schema.sql');
    if (existsSync(schemaFile)) {
      const schemaSql = readFileSync(schemaFile, 'utf8');
      localDbInstance.exec(schemaSql);
    }
  }
  return localDbInstance;
}

function getLocalSqlite() {
  return {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first<T = any>(): Promise<T | null> {
              const db = await getDbInstance();
              const stmt = db.prepare(sql);
              const row = stmt.get(...params);
              return (row as T) || null;
            },
            async all<T = any>(): Promise<{ results: T[] }> {
              const db = await getDbInstance();
              const stmt = db.prepare(sql);
              const rows = stmt.all(...params);
              return { results: rows as T[] };
            },
            async run(): Promise<{ meta: { last_row_id: number | bigint } }> {
              const db = await getDbInstance();
              const stmt = db.prepare(sql);
              const info = stmt.run(...params);
              return { meta: { last_row_id: info.lastInsertRowid } };
            }
          };
        }
      };
    }
  };
}

let cachedCfEnv: any = null;
let cfEnvResolved = false;

// In Astro v6+/Cloudflare Workers, bindings (DB, KV, secrets) are exposed via the
// `cloudflare:workers` module's `env`, NOT `locals.runtime.env` (which now throws).
// Resolves to `null` outside the Workers runtime (e.g. local `astro dev`), allowing
// the local SQLite fallback to take over.
export async function getCfEnv(): Promise<any | null> {
  if (cfEnvResolved) return cachedCfEnv;
  cfEnvResolved = true;
  try {
    const { env } = await import(/* @vite-ignore */ 'cloudflare:workers');
    cachedCfEnv = env || null;
  } catch {
    cachedCfEnv = null;
  }
  return cachedCfEnv;
}

export async function getDb(_locals?: any) {
  const cf = await getCfEnv();
  const cloudflareDb = cf?.DB;
  if (cloudflareDb) {
    return cloudflareDb;
  }
  // Fallback to local SQLite during local `npm run dev`
  return getLocalSqlite();
}

