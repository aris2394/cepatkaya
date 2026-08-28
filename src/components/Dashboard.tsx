import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import type { DashboardSummary } from '../types';
import { ProgressRing } from './ui/ProgressRing';
import { BudgetGauge, formatIDR } from './ui/BudgetGauge';
import { IncomeModal } from './IncomeModal';
import { CategoryModal } from './CategoryModal';
import { ExpenseLogger } from './ExpenseLogger';

export const Dashboard = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = createSignal(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const [data, setData] = createSignal<DashboardSummary | null>(null);
  const [loading, setLoading] = createSignal(true);

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = createSignal(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = createSignal(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = createSignal(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month_year=${selectedMonth()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchData();
  });

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure? This will delete all expenses under this category.')) return;
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const overallSpentPercentage = () => {
    const d = data();
    if (!d || d.total_allocated === 0) return 0;
    return (d.total_spent / d.total_allocated) * 100;
  };

  return (
    <div class="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 text-slate-800">
      {/* Darwinbox Header */}
      <header class="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-5 pt-7 pb-14 rounded-b-[2rem] shadow-lg shadow-blue-500/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl tracking-wider">
              CK
            </div>
            <div>
              <h1 class="text-lg font-extrabold tracking-tight">CepatKaya</h1>
              <p class="text-xs text-blue-100 font-medium">Family Financial Monitor</p>
            </div>
          </div>
          <div class="relative">
            <input
              type="month"
              value={selectedMonth()}
              onChange={(e) => setSelectedMonth(e.currentTarget.value)}
              class="bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Total Income Banner */}
        <div class="mt-6 flex items-center justify-between bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
          <div>
            <div class="text-[11px] font-medium text-blue-100 uppercase tracking-wider">Total Monthly Income</div>
            <div class="text-xl font-black mt-0.5">{formatIDR(data()?.total_income || 0)}</div>
          </div>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            class="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
          >
            Set Income
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main class="px-4 -mt-8 space-y-4">
        {/* Visual Gauge Overview Card */}
        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-sm font-bold text-slate-800">Budget vs. Actual Spending</h2>
            <span class="text-xs text-slate-400 font-medium">{selectedMonth()}</span>
          </div>

          <div class="flex items-center justify-around py-3">
            <ProgressRing percentage={overallSpentPercentage()} label="Spent" />
            <div class="space-y-3">
              <div>
                <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Allocated Budget</span>
                <span class="text-base font-bold text-slate-800">{formatIDR(data()?.total_allocated || 0)}</span>
              </div>
              <div>
                <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Actual Spent</span>
                <span class="text-base font-bold text-blue-600">{formatIDR(data()?.total_spent || 0)}</span>
              </div>
              <div>
                <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Remaining Budget</span>
                <span class={`text-base font-bold ${(data()?.total_remaining_budget || 0) < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {formatIDR(data()?.total_remaining_budget || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Warning / Info */}
          <Show when={data() && data()!.remaining_unallocated > 0}>
            <div class="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>⚠️ Unallocated: <b>{formatIDR(data()!.remaining_unallocated)}</b></span>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                class="text-amber-900 font-bold underline text-[11px]"
              >
                Allocate now
              </button>
            </div>
          </Show>
        </div>

        {/* Categories Section */}
        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Category Budgets</h2>
              <p class="text-[11px] text-slate-400">Target allocations and real-time limits</p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              class="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-100 transition active:scale-95"
            >
              + Category
            </button>
          </div>

          <Show
            when={data() && data()!.categories.length > 0}
            fallback={
              <div class="text-center py-6 text-slate-400 text-xs">
                No budget categories created for this month yet.
              </div>
            }
          >
            <div class="space-y-4">
              <For each={data()?.categories}>
                {(cat) => (
                  <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-800 text-sm">{cat.name}</span>
                      <div class="flex items-center gap-2">
                        <span class={`text-xs font-bold ${cat.remaining < 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                          {cat.remaining < 0 ? `Exceeded ${formatIDR(Math.abs(cat.remaining))}` : `${formatIDR(cat.remaining)} left`}
                        </span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id!)}
                          class="text-slate-300 hover:text-rose-500 transition text-xs p-1"
                          title="Delete Category"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <BudgetGauge percentage={cat.percentage} spent={cat.spent} total={cat.allocated_budget} />
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Recent Daily Expenses List */}
        <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-100">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-slate-800">Recent Expenses</h2>
            <span class="text-xs text-slate-400 font-medium">Latest records</span>
          </div>

          <Show
            when={data() && data()!.recent_expenses.length > 0}
            fallback={
              <div class="text-center py-6 text-slate-400 text-xs">
                No expenses logged yet this month.
              </div>
            }
          >
            <div class="divide-y divide-slate-100">
              <For each={data()?.recent_expenses}>
                {(exp) => (
                  <div class="py-3 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-slate-800 text-xs">{exp.category_name}</div>
                      <div class="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{exp.date}</span>
                        {exp.note && <span>• {exp.note}</span>}
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs text-rose-500">-{formatIDR(exp.amount)}</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id!)}
                        class="text-slate-300 hover:text-rose-500 transition text-xs p-1"
                        title="Delete Expense"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </main>

      {/* Floating Bottom Quick-Action Bar */}
      <div class="fixed bottom-0 inset-x-0 max-w-md mx-auto p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-sm transition"
        >
          <span class="text-lg leading-none">+</span> Log Expense
        </button>
      </div>

      {/* Modals */}
      <IncomeModal
        isOpen={isIncomeModalOpen()}
        onClose={() => setIsIncomeModalOpen(false)}
        onSuccess={fetchData}
        currentMonth={selectedMonth()}
        initialAmount={data()?.total_income}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen()}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchData}
        currentMonth={selectedMonth()}
      />

      <ExpenseLogger
        isOpen={isExpenseModalOpen()}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchData}
        categories={data()?.categories || []}
      />
    </div>
  );
};
