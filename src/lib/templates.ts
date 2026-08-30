// Reusable category templates (previously hardcoded presets).
// Seeds the `category_templates` table from PRESET_CATEGORIES on first run so the
// existing default set becomes editable/manageable from the UI.

import { getDb } from './db';
import { PRESET_CATEGORIES } from './presets';

export async function ensureSeedTemplates(locals?: any): Promise<void> {
  const db = await getDb(locals);
  const row = await db
    .prepare('SELECT COUNT(*) as c FROM category_templates')
    .bind()
    .first<{ c: number }>();
  if (row && row.c > 0) return;

  for (let i = 0; i < PRESET_CATEGORIES.length; i++) {
    const p = PRESET_CATEGORIES[i];
    await db
      .prepare(
        'INSERT INTO category_templates (name, allocated_budget, sort_order) VALUES (?, ?, ?)'
      )
      .bind(p.name, p.allocated_budget, i)
      .run();
  }
}
