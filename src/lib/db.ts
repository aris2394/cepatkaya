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

export async function getDb(locals: any) {
  let cloudflareDb = null;
  try {
    // In Astro v6+, accessing locals.runtime.env throws an error.
    cloudflareDb = locals?.runtime?.env?.DB || locals?.env?.DB;
  } catch (e) {
    // ignore Astro v6 throwing error
  }

  if (!cloudflareDb) {
    try {
      const mod = 'cloudflare:workers';
      const { env } = await import(/* @vite-ignore */ mod);
      if (env && env.DB) {
        cloudflareDb = env.DB;
      }
    } catch (e) {
      // ignore import error locally
    }
  }

  if (cloudflareDb) {
    return cloudflareDb;
  }
  // Fallback to local SQLite during local `npm run dev`
  return getLocalSqlite();
}

