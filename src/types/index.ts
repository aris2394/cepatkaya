export interface Income {
  id?: number;
  month_year: string; // Format: YYYY-MM
  total_amount: number;
}

export interface Category {
  id?: number;
  name: string;
  allocated_budget: number;
  month_year: string; // Format: YYYY-MM
}

export interface Expense {
  id?: number;
  category_id: number;
  amount: number;
  date: string; // Format: YYYY-MM-DD
  note?: string;
  category_name?: string;
}

export interface CategoryStatus extends Category {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface DashboardSummary {
  month_year: string;
  total_income: number;
  total_allocated: number;
  total_spent: number;
  remaining_unallocated: number;
  total_remaining_budget: number;
  categories: CategoryStatus[];
  recent_expenses: Expense[];
}
