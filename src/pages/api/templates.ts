import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { requireUser, unauthorized } from '../../lib/auth';
import { ensureSeedTemplates } from '../../lib/templates';
import { parseAmount } from '../../lib/validate';

export const GET: APIRoute = async ({ locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    await ensureSeedTemplates(locals);
    const { results } = await db
      .prepare('SELECT * FROM category_templates ORDER BY sort_order ASC, id ASC')
      .bind()
      .all();
    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const body = await request.json();

    // Option A: Bulk-save from an existing month's categories
    if (body.month_year) {
      const { results } = await db
        .prepare('SELECT name, allocated_budget FROM categories WHERE month_year = ? ORDER BY id ASC')
        .bind(body.month_year)
        .all();

      if (!results || results.length === 0) {
        return new Response(JSON.stringify({ error: 'Tidak ada kategori pada bulan ini untuk disimpan sebagai template' }), { status: 400 });
      }

      // Overwrite template list with current month's categories
      await db.prepare('DELETE FROM category_templates').run();
      for (let i = 0; i < results.length; i++) {
        const item = results[i] as any;
        await db
          .prepare('INSERT INTO category_templates (name, allocated_budget, sort_order) VALUES (?, ?, ?)')
          .bind(item.name, item.allocated_budget, i)
          .run();
      }

      return new Response(JSON.stringify({ success: true, count: results.length }), { status: 200 });
    }

    // Option B: Add single template
    const { name, allocated_budget } = body;
    if (!name || allocated_budget === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    const budget = parseAmount(allocated_budget);
    if (budget === null) {
      return new Response(JSON.stringify({ error: 'Allocated budget must be a valid number' }), { status: 400 });
    }

    await db
      .prepare('INSERT INTO category_templates (name, allocated_budget) VALUES (?, ?)')
      .bind(name.trim(), budget)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, name, allocated_budget } = body;

    if (!id || !name || allocated_budget === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    const budget = parseAmount(allocated_budget);
    if (budget === null) {
      return new Response(JSON.stringify({ error: 'Allocated budget must be a valid number' }), { status: 400 });
    }

    await db
      .prepare('UPDATE category_templates SET name = ?, allocated_budget = ? WHERE id = ?')
      .bind(name.trim(), budget, Number(id))
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Template ID is required' }), { status: 400 });
  }

  try {
    await db.prepare('DELETE FROM category_templates WHERE id = ?').bind(Number(id)).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
