import type { APIRoute } from 'astro';
import type { CategoryStatus, DashboardSummary, Expense, Income } from '../../types';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  if (cookies.get('auth_token')?.value !== 'secure-admin-token-123qazaqw') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const db = await getDb(locals);
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding not found' }), { status: 500 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month_year = url.searchParams.get('month_year') || currentMonthYear;

  try {
    // 1. Fetch Income
    const incomeRow = await db
      .prepare('SELECT total_amount FROM incomes WHERE month_year = ?')
      .bind(month_year)
      .first<{ total_amount: number }>();
    const total_income = incomeRow ? incomeRow.total_amount : 0;

    // 2. Fetch Categories with total spent
    const { results: categoryRows } = await db
      .prepare(`
        SELECT 
          c.id,
          c.name,
          c.allocated_budget,
          c.month_year,
          COALESCE(SUM(e.amount), 0) as spent
        FROM categories c
        LEFT JOIN expenses e ON c.id = e.category_id
        WHERE c.month_year = ?
        GROUP BY c.id
        ORDER BY c.name ASC
      `)
      .bind(month_year)
      .all<{ id: number; name: string; allocated_budget: number; month_year: string; spent: number }>();

    const categories: CategoryStatus[] = (categoryRows || []).map((cat) => {
      const remaining = cat.allocated_budget - cat.spent;
      const percentage = cat.allocated_budget > 0 ? (cat.spent / cat.allocated_budget) * 100 : 0;
      return {
        ...cat,
        remaining,
        percentage: Math.round(percentage * 10) / 10,
      };
    });

    const total_allocated = categories.reduce((sum, c) => sum + c.allocated_budget, 0);
    const total_spent = categories.reduce((sum, c) => sum + c.spent, 0);
    const remaining_unallocated = total_income - total_allocated;
    const total_remaining_budget = total_allocated - total_spent;

    // 3. Recent 5 expenses for the month
    const { results: recentExpenses } = await db
      .prepare(`
        SELECT e.*, c.name as category_name 
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE c.month_year = ?
        ORDER BY e.date DESC, e.id DESC
        LIMIT 5
      `)
      .bind(month_year)
      .all<Expense>();

    const summary: DashboardSummary = {
      month_year,
      total_income,
      total_allocated,
      total_spent,
      remaining_unallocated,
      total_remaining_budget,
      categories,
      recent_expenses: recentExpenses || [],
    };

    return new Response(JSON.stringify(summary), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
