import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { requireUser, unauthorized } from '../../../lib/auth';
import { isValidMonth } from '../../../lib/validate';

function previousMonth(month_year: string): string {
  const [y, m] = month_year.split('-').map(Number);
  const prev = new Date(y, m - 1, 0); // day 0 of current month => last day of previous month
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const user = await requireUser({ cookies, locals });
  if (!user) return unauthorized();

  const db = await getDb(locals);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const to_month = body.month_year;
  if (!isValidMonth(to_month)) {
    return new Response(JSON.stringify({ error: 'Invalid month_year format (expected YYYY-MM)' }), { status: 400 });
  }
  const from_month = isValidMonth(body.from_month) ? body.from_month : previousMonth(to_month);

  const { results } = await db
    .prepare('SELECT name, allocated_budget FROM categories WHERE month_year = ?')
    .bind(from_month)
    .all<{ name: string; allocated_budget: number }>();

  let copied = 0;
  for (const c of results || []) {
    await db
      .prepare(
        `INSERT INTO categories (name, allocated_budget, month_year)
         VALUES (?, ?, ?)
         ON CONFLICT(name, month_year) DO UPDATE SET allocated_budget = excluded.allocated_budget`
      )
      .bind(c.name, c.allocated_budget, to_month)
      .run();
    copied++;
  }

  return new Response(
    JSON.stringify({
      success: true,
      copied,
      from_month,
      to_month,
      message:
        copied > 0
          ? `Copied ${copied} categories from ${from_month}`
          : `No categories found in ${from_month} to copy`,
    }),
    { status: 200 }
  );
};
