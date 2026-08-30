import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { requireUser, unauthorized } from '../../lib/auth';
import { isValidMonth, parseAmount } from '../../lib/validate';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const month_year = url.searchParams.get('month_year');

  try {
    let query = 'SELECT * FROM categories';
    const params: string[] = [];

    if (month_year) {
      query += ' WHERE month_year = ? ORDER BY name ASC';
      params.push(month_year);
    } else {
      query += ' ORDER BY month_year DESC, name ASC';
    }

    const { results } = await db.prepare(query).bind(...params).all();
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
    const { name, allocated_budget, month_year } = body;

    if (!name || allocated_budget === undefined || !month_year) {
      return new Response(JSON.stringify({ error: 'Missing required category fields' }), { status: 400 });
    }
    if (!isValidMonth(month_year)) {
      return new Response(JSON.stringify({ error: 'Invalid month_year format (expected YYYY-MM)' }), { status: 400 });
    }
    const budget = parseAmount(allocated_budget);
    if (budget === null) {
      return new Response(JSON.stringify({ error: 'Allocated budget must be a valid number' }), { status: 400 });
    }

    await db
      .prepare(
        `INSERT INTO categories (name, allocated_budget, month_year)
         VALUES (?, ?, ?)
         ON CONFLICT(name, month_year) DO UPDATE SET allocated_budget = excluded.allocated_budget`
      )
      .bind(name.trim(), budget, month_year)
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
      .prepare('UPDATE categories SET name = ?, allocated_budget = ? WHERE id = ?')
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
    return new Response(JSON.stringify({ error: 'Category ID is required' }), { status: 400 });
  }

  try {
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(Number(id)).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
