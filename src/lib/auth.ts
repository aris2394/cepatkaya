// Secure authentication helpers for CepatKaya.
// Uses Web Crypto (available in both Cloudflare Workers and Node 20+):
//  - Passwords hashed with PBKDF2-SHA256 (100k iterations) + random salt.
//  - Sessions stored server-side in Cloudflare KV (binding `SESSION`) when
//    available, with a signed-stateless-cookie fallback for local `astro dev`
//    (where no KV binding exists).

import { getDb, getCfEnv } from './db';

// ---------------------------------------------------------------------------
// Base64url + Web Crypto primitives
// ---------------------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const enc = new TextEncoder();

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `${toBase64Url(salt)}:${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltStr, hashStr] = stored.split(':');
  if (!saltStr || !hashStr) return false;
  const salt = fromBase64Url(saltStr);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computed = toBase64Url(new Uint8Array(bits));
  return constantTimeEqual(computed, hashStr);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Session store (KV when available, signed cookie fallback otherwise)
// ---------------------------------------------------------------------------

type SessionStore =
  | { type: 'kv'; kv: any }
  | { type: 'cookie'; secret: string };

async function getSessionStore(): Promise<SessionStore> {
  const cf = await getCfEnv();
  const kv = cf?.SESSION;
  if (kv) return { type: 'kv', kv };
  const secret = process.env.SESSION_SECRET || 'ck-dev-secret-change-me';
  return { type: 'cookie', secret };
}

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days (seconds)

function buildCookie(name: string, value: string, opts: { maxAge?: number; clear?: boolean }): string {
  const parts = [`${name}=${opts.clear ? '' : value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (opts.clear) parts.push('Max-Age=0');
  else if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  // `Secure` is only safe on HTTPS; local dev runs on http, so gate on PROD.
  if (import.meta.env.PROD) parts.push('Secure');
  return parts.join('; ');
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  is_active: number;
}

// ---------------------------------------------------------------------------
// Public session API
// ---------------------------------------------------------------------------

export async function createSession(locals: any, user: { id: number; username: string; display_name: string }): Promise<{ cookie: string }> {
  const store = await getSessionStore();
  const name = 'ck_session';
  if (store.type === 'kv') {
    const id = crypto.randomUUID();
    await store.kv.put(id, JSON.stringify({ userId: user.id, username: user.username, displayName: user.display_name, createdAt: Date.now() }), {
      expirationTtl: SESSION_TTL,
    });
    return { cookie: buildCookie(name, id, { maxAge: SESSION_TTL }) };
  }
  const payload = toBase64Url(enc.encode(JSON.stringify({ id: user.id, u: user.username, d: user.display_name, iat: Date.now() })));
  const sig = await hmac(payload, store.secret);
  const token = `${payload}.${sig}`;
  return { cookie: buildCookie(name, token, { maxAge: SESSION_TTL }) };
}

export async function destroySession(locals: any, token: string | undefined): Promise<{ cookie: string }> {
  const store = await getSessionStore();
  if (store.type === 'kv' && token) {
    await store.kv.delete(token).catch(() => {});
  }
  return { cookie: buildCookie('ck_session', '', { clear: true }) };
}

export async function getCurrentUser(locals: any, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const store = await getSessionStore();
  let userId: number | null = null;
  let username: string | null = null;

  if (store.type === 'kv') {
    const raw = await store.kv.get(token).catch(() => null);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      userId = data.userId || null;
      username = data.username || null;
    } catch {
      return null;
    }
  } else {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = await hmac(payload, store.secret);
    if (!constantTimeEqual(expected, sig)) return null;
    try {
      const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
      if (!data.iat || Date.now() - data.iat > SESSION_TTL * 1000) return null;
      userId = data.id || null;
      username = data.u || null;
    } catch {
      return null;
    }
  }

  if (!userId && !username) return null;

  const db = await getDb(locals);
  if (!db) {
    if (userId && username) {
      return { id: userId, username, display_name: username, is_active: 1 };
    }
    return null;
  }

  let row: any = null;
  if (userId) {
    row = await db.prepare('SELECT id, username, display_name, is_active FROM users WHERE id = ? AND is_active = 1').bind(userId).first();
  } else if (username) {
    row = await db.prepare('SELECT id, username, display_name, is_active FROM users WHERE username = ? AND is_active = 1').bind(username).first();
  }

  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    display_name: row.display_name || row.username,
    is_active: Number(row.is_active),
  };
}

export async function requireUser(ctx: { cookies: any; locals: any }): Promise<User | null> {
  const token = ctx.cookies.get('ck_session')?.value;
  return getCurrentUser(ctx.locals, token);
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (good enough for a single login endpoint; per-isolate)
// ---------------------------------------------------------------------------

const attempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  rec.count++;
  return rec.count <= limit;
}

// ---------------------------------------------------------------------------
// First-run admin seeding (only if initial admin accounts are missing)
// ---------------------------------------------------------------------------

export async function ensureSeedUser(locals: any): Promise<void> {
  const db = await getDb(locals);
  if (!db) return;

  const cf = await getCfEnv();
  const adminPw = cf?.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '123qazaqw';
  const wifePw = cf?.WIFE_PASSWORD || process.env.WIFE_PASSWORD || '123qazaqw';

  // Migration helper: If legacy 'admin' exists without display_name, convert to 'aris'
  const legacyAdmin = await db.prepare('SELECT id FROM users WHERE username = ?').bind('admin').first();
  if (legacyAdmin) {
    await db.prepare('UPDATE users SET username = ?, display_name = ? WHERE username = ?').bind('aris', 'Aris', 'admin').run();
  }

  // Seed user 'aris' if not existing
  const userAris = await db.prepare('SELECT id FROM users WHERE username = ?').bind('aris').first();
  if (!userAris) {
    const hashAris = await hashPassword(adminPw);
    await db
      .prepare('INSERT INTO users (username, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)')
      .bind('aris', hashAris, 'Aris')
      .run();
  }

  // Seed user 'istri' if not existing
  const userIstri = await db.prepare('SELECT id FROM users WHERE username = ?').bind('istri').first();
  if (!userIstri) {
    const hashIstri = await hashPassword(wifePw);
    await db
      .prepare('INSERT INTO users (username, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)')
      .bind('istri', hashIstri, 'Istri')
      .run();
  }
}
