import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';
import { requireUser, unauthorized } from '../../../lib/auth';
import { isValidMonth } from '../../../lib/validate';
import { ensureSeedTemplates } from '../../../lib/templates';
import { PRESET_CATEGORIES } from '../../../lib/presets';

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

  const month_year = body.month_year;
  if (!isValidMonth(month_year)) {
    return new Response(JSON.stringify({ error: 'Invalid month_year format (expected YYYY-MM)' }), { status: 400 });
  }

  // Source the categories from the user-managed templates table (seeded from the
  // default presets on first run). Fall back to the hardcoded array only if the
  // table is somehow empty.
  await ensureSeedTemplates(locals);
  const { results } = await db
    .prepare('SELECT name, allocated_budget FROM category_templates ORDER BY sort_order ASC, id ASC')
    .bind()
    .all();
  const templates =
    results && results.length
      ? results
      : PRESET_CATEGORIES.map((p) => ({ name: p.name, allocated_budget: p.allocated_budget }));

  for (const p of templates) {
    await db
      .prepare(
        `INSERT INTO categories (name, allocated_budget, month_year)
         VALUES (?, ?, ?)
         ON CONFLICT(name, month_year) DO UPDATE SET allocated_budget = excluded.allocated_budget`
      )
      .bind(p.name, p.allocated_budget, month_year)
      .run();
  }

  return new Response(
    JSON.stringify({ success: true, count: templates.length }),
    { status: 200 }
  );
};
