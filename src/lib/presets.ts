// Default budget category presets (used by the "Load presets" quick action).
// Amounts are suggested IDR starting points the user can adjust later.

export interface PresetCategory {
  name: string;
  allocated_budget: number;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  { name: '🍔 Food & Groceries', allocated_budget: 2_500_000 },
  { name: '🏠 Rent & Housing', allocated_budget: 3_000_000 },
  { name: '🚗 Transportation', allocated_budget: 800_000 },
  { name: '💳 Debt / Installments', allocated_budget: 1_000_000 },
  { name: '💡 Utilities & Bills', allocated_budget: 600_000 },
  { name: '🛡️ Savings & Investment', allocated_budget: 1_500_000 },
  { name: '🎉 Entertainment', allocated_budget: 500_000 },
  { name: '💊 Health & Medical', allocated_budget: 400_000 },
  { name: '📦 Miscellaneous', allocated_budget: 500_000 },
  { name: '👕 Clothing', allocated_budget: 300_000 },
  { name: '📚 Education', allocated_budget: 500_000 },
  { name: '✈️ Travel', allocated_budget: 500_000 },
];
