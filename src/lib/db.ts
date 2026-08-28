import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let localDbInstance: any = null;

function getLocalSqlite() {
  if (!localDbInstance) {
    const dbPath = join(process.cwd(), 'cepatkaya-local.sqlite');
    localDbInstance = new Database(dbPath);
    
    // Auto-init schema if not present
    const schemaFile = join(process.cwd(), 'db', 'schema.sql');
    if (existsSync(schemaFile)) {
      const schemaSql = readFileSync(schemaFile, 'utf8');
      localDbInstance.exec(schemaSql);
    }
  }

  return {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first<T = any>(): Promise<T | null> {
              const stmt = localDbInstance.prepare(sql);
              const row = stmt.get(...params);
              return (row as T) || null;
            },
            async all<T = any>(): Promise<{ results: T[] }> {
              const stmt = localDbInstance.prepare(sql);
              const rows = stmt.all(...params);
              return { results: rows as T[] };
            },
            async run(): Promise<{ meta: { last_row_id: number | bigint } }> {
              const stmt = localDbInstance.prepare(sql);
              const info = stmt.run(...params);
              return { meta: { last_row_id: info.lastInsertRowid } };
            }
          };
        }
      };
    }
  };
}

export function getDb(locals: any) {
  // If running in Cloudflare Workers / D1 binding
  if (locals?.runtime?.env?.DB) {
    return locals.runtime.env.DB;
  }
  // Fallback to local SQLite during local `npm run dev`
  return getLocalSqlite();
}
