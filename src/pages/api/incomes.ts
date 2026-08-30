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
    if (month_year) {
      const result = await db
        .prepare('SELECT * FROM incomes WHERE month_year = ?')
        .bind(month_year)
        .first();
      return new Response(JSON.stringify(result || null), { status: 200 });
    }

    const { results } = await db.prepare('SELECT * FROM incomes ORDER BY month_year DESC').all();
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
    const { month_year, total_amount } = body;

    if (!month_year || total_amount === undefined) {
      return new Response(JSON.stringify({ error: 'Missing month_year or total_amount' }), { status: 400 });
    }
    if (!isValidMonth(month_year)) {
      return new Response(JSON.stringify({ error: 'Invalid month_year format (expected YYYY-MM)' }), { status: 400 });
    }
    const amount = parseAmount(total_amount);
    if (amount === null || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Total amount must be a valid positive number' }), { status: 400 });
    }

    await db
      .prepare(
        `INSERT INTO incomes (month_year, total_amount) 
         VALUES (?, ?) 
         ON CONFLICT(month_year) DO UPDATE SET total_amount = excluded.total_amount`
      )
      .bind(month_year, amount)
      .run();

    return new Response(JSON.stringify({ success: true, month_year, total_amount }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
