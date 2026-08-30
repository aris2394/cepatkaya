import type { APIRoute } from 'astro';
import { ensureSeedUser, verifyPassword, createSession, rateLimit } from '../../../lib/auth';
import { getDb } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';

  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return new Response(
      JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Username and password are required' }), {
      status: 400,
    });
  }

  const db = await getDb(locals);
  await ensureSeedUser(locals);

  const row = await db
    .prepare('SELECT id, username, display_name, password_hash, is_active FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; username: string; display_name: string; password_hash: string; is_active: number }>();

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return new Response(JSON.stringify({ error: 'Username atau kata sandi salah!' }), {
      status: 401,
    });
  }

  if (row.is_active !== 1) {
    return new Response(JSON.stringify({ error: 'Akun Anda tidak aktif' }), {
      status: 403,
    });
  }

  const user = {
    id: Number(row.id),
    username: row.username,
    display_name: row.display_name || row.username,
  };

  const { cookie } = await createSession(locals, user);
  return new Response(JSON.stringify({ success: true, user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  });
};
