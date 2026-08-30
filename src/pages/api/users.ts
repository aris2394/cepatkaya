import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { requireUser, unauthorized, hashPassword } from '../../lib/auth';

export const GET: APIRoute = async ({ locals, cookies }) => {
  const currentUser = await requireUser({ cookies, locals });
  if (!currentUser) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const { results } = await db
      .prepare('SELECT id, username, display_name, is_active, created_at FROM users ORDER BY id ASC')
      .bind()
      .all();
    return new Response(JSON.stringify({ users: results, currentUser }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const currentUser = await requireUser({ cookies, locals });
  if (!currentUser) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const body = await request.json();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const display_name = String(body.display_name || '').trim();

    if (!username || !password || !display_name) {
      return new Response(
        JSON.stringify({ error: 'Username, password, and display name are required' }),
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username minimal 3 karakter' }),
        { status: 400 }
      );
    }

    const existing = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Username sudah digunakan' }),
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    await db
      .prepare('INSERT INTO users (username, password_hash, display_name, is_active) VALUES (?, ?, ?, 1)')
      .bind(username, password_hash, display_name)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  const currentUser = await requireUser({ cookies, locals });
  if (!currentUser) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const body = await request.json();
    const targetId = Number(body.id);
    if (!targetId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }

    const userRow = await db
      .prepare('SELECT id, username, display_name, is_active FROM users WHERE id = ?')
      .bind(targetId)
      .first<{ id: number; username: string; display_name: string; is_active: number }>();

    if (!userRow) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const display_name = body.display_name !== undefined ? String(body.display_name).trim() : userRow.display_name;
    let is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : userRow.is_active;

    // Prevent deactivating own account
    if (currentUser.id === targetId && is_active === 0) {
      return new Response(JSON.stringify({ error: 'Tidak dapat me-nonaktifkan akun Anda sendiri' }), { status: 400 });
    }

    // Prevent deactivating last active admin
    if (is_active === 0) {
      const activeCount = await db
        .prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1')
        .bind()
        .first<{ c: number }>();
      if (activeCount && activeCount.c <= 1) {
        return new Response(JSON.stringify({ error: 'Minimal harus ada 1 akun aktif' }), { status: 400 });
      }
    }

    if (body.password) {
      const password_hash = await hashPassword(String(body.password));
      await db
        .prepare('UPDATE users SET display_name = ?, password_hash = ?, is_active = ? WHERE id = ?')
        .bind(display_name || userRow.username, password_hash, is_active, targetId)
        .run();
    } else {
      await db
        .prepare('UPDATE users SET display_name = ?, is_active = ? WHERE id = ?')
        .bind(display_name || userRow.username, is_active, targetId)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  const currentUser = await requireUser({ cookies, locals });
  if (!currentUser) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const targetId = Number(url.searchParams.get('id'));

  if (!targetId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
  }

  if (currentUser.id === targetId) {
    return new Response(JSON.stringify({ error: 'Tidak dapat menghapus akun Anda sendiri' }), { status: 400 });
  }

  const activeCount = await db
    .prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1')
    .bind()
    .first<{ c: number }>();

  if (activeCount && activeCount.c <= 1) {
    return new Response(JSON.stringify({ error: 'Minimal harus ada 1 akun aktif' }), { status: 400 });
  }

  try {
    // Soft delete / deactivate user
    await db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(targetId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
