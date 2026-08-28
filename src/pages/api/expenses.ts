import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const month_year = url.searchParams.get('month_year');
  const category_id = url.searchParams.get('category_id');

  try {
    let query = `
      SELECT e.*, c.name as category_name 
      FROM expenses e 
      JOIN categories c ON e.category_id = c.id
    `;
    const params: any[] = [];

    if (month_year) {
      query += ` WHERE c.month_year = ?`;
      params.push(month_year);
      if (category_id) {
        query += ` AND e.category_id = ?`;
        params.push(Number(category_id));
      }
    } else if (category_id) {
      query += ` WHERE e.category_id = ?`;
      params.push(Number(category_id));
    }

    query += ` ORDER BY e.date DESC, e.id DESC`;

    const { results } = await db.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  try {
    const body = await request.json();
    const { category_id, amount, date, note } = body;

    if (!category_id || amount === undefined || !date) {
      return new Response(JSON.stringify({ error: 'Missing required expense fields' }), { status: 400 });
    }

    const res = await db
      .prepare('INSERT INTO expenses (category_id, amount, date, note) VALUES (?, ?, ?, ?)')
      .bind(Number(category_id), Number(amount), date, note || '')
      .run();

    return new Response(JSON.stringify({ success: true, id: res.meta.last_row_id }), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Expense ID is required' }), { status: 400 });
  }

  try {
    await db.prepare('DELETE FROM expenses WHERE id = ?').bind(Number(id)).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
