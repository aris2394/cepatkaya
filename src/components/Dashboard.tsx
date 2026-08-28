import { createSignal, For, Show } from 'solid-js';
import type { DashboardSummary } from '../types';
import { ProgressRing } from './ui/ProgressRing';
import { BudgetGauge, formatIDR } from './ui/BudgetGauge';
import { IncomeModal } from './IncomeModal';
import { CategoryModal } from './CategoryModal';
import { ExpenseLogger } from './ExpenseLogger';

const SkeletonCard = () => (
  <div class="glass-card rounded-3xl p-5 space-y-3">
    <div class="shimmer h-4 w-32 rounded-full" />
    <div class="shimmer h-8 w-48 rounded-full" />
    <div class="shimmer h-3 w-24 rounded-full" />
  </div>
);

export const Dashboard = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = createSignal(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [data, setData] = createSignal<DashboardSummary | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = createSignal(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = createSignal(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = createSignal(false);
  const [deletingId, setDeletingId] = createSignal<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month_year=${selectedMonth()}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on month change
  let prevMonth = selectedMonth();
  const handleMonthChange = (val: string) => {
    prevMonth = selectedMonth();
    setSelectedMonth(val);
    fetchData();
  };

  fetchData();

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      fetchData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category and all its expenses?')) return;
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

  const savingsRate = () => {
    const d = data();
    if (!d || d.total_income === 0) return 0;
    return Math.max(0, ((d.total_income - d.total_spent) / d.total_income) * 100);
  };

  return (
    <div class="max-w-md mx-auto min-h-screen bg-[#0f1117] pb-28 relative overflow-x-hidden">
      {/* Background ambient glow */}
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
        <div class="absolute top-60 -right-20 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl" />
        <div class="absolute bottom-40 left-10 w-48 h-48 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      {/* ── Header ── */}
      <header class="relative px-5 pt-12 pb-16">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-base tracking-wider shadow-lg shadow-indigo-500/30">
              CK
            </div>
            <div>
              <h1 class="text-base font-black tracking-tight text-white leading-none">CepatKaya</h1>
              <p class="text-[11px] text-white/40 font-medium mt-0.5">Family Financial Monitor</p>
            </div>
          </div>
          <input
            type="month"
            value={selectedMonth()}
            onChange={(e) => handleMonthChange(e.currentTarget.value)}
            class="glass px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer transition hover:bg-white/10"
          />
        </div>

        {/* Income Banner */}
        <div
          class="glass rounded-2xl p-4 flex items-center justify-between card-lift animate-fade-up"
          style="animation-delay: 0.05s; opacity: 0;"
        >
          <div>
            <div class="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Monthly Income</div>
            <div class="text-2xl font-black text-white animate-number" style="animation-delay:0.1s">
              {loading() ? (
                <div class="shimmer h-7 w-40 rounded-lg" />
              ) : (
                formatIDR(data()?.total_income || 0)
              )}
            </div>
          </div>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            class="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all hover:shadow-indigo-500/50 hover:scale-105"
          >
            Set Income
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main class="px-4 -mt-6 space-y-4">

        {/* Overview Card */}
        <div class="glass-card rounded-3xl p-5 animate-fade-up card-lift" style="animation-delay:0.1s; opacity:0">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-white">Budget Overview</h2>
              <p class="text-[11px] text-white/40">{selectedMonth()}</p>
            </div>
            <Show when={!loading() && data()}>
              <div class="text-right">
                <div class="text-[10px] text-white/40 uppercase tracking-wider">Savings Rate</div>
                <div class={`text-sm font-black ${savingsRate() > 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {savingsRate().toFixed(0)}%
                </div>
              </div>
            </Show>
          </div>

          <Show when={loading()}>
            <div class="flex items-center justify-center py-8">
              <div class="shimmer w-[148px] h-[148px] rounded-full" />
            </div>
          </Show>

          <Show when={!loading()}>
            <div class="flex items-center justify-around py-2">
              <ProgressRing percentage={overallSpentPercentage()} label="Spent" />
              <div class="space-y-4">
                {[
                  { label: 'Allocated', value: data()?.total_allocated || 0, color: 'text-white' },
                  { label: 'Spent', value: data()?.total_spent || 0, color: 'text-rose-400' },
                  { label: 'Remaining', value: data()?.total_remaining_budget || 0, color: (data()?.total_remaining_budget || 0) < 0 ? 'text-rose-400' : 'text-emerald-400' },
                ].map((item, i) => (
                  <div class={`animate-fade-up delay-${(i + 2) * 50}`} style={`animation-delay:${(i + 2) * 0.08}s; opacity:0`}>
                    <span class="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-0.5">{item.label}</span>
                    <span class={`text-sm font-black ${item.color}`}>{formatIDR(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Show>

          {/* Unallocated warning */}
          <Show when={!loading() && data() && data()!.remaining_unallocated > 0}>
            <div class="mt-4 p-3 rounded-2xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-between animate-fade-up">
              <div class="flex items-center gap-2 text-xs text-amber-400">
                <span class="text-base">⚠️</span>
                <span>Unallocated: <b>{formatIDR(data()!.remaining_unallocated)}</b></span>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                class="text-amber-400 font-bold text-[11px] underline underline-offset-2 hover:text-amber-300 transition"
              >
                Allocate →
              </button>
            </div>
          </Show>
        </div>

        {/* Categories Card */}
        <div class="glass-card rounded-3xl p-5 animate-fade-up card-lift" style="animation-delay:0.18s; opacity:0">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-white">Category Budgets</h2>
              <p class="text-[11px] text-white/35">Real-time spending limits</p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              class="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold border border-indigo-500/20 transition-all active:scale-95"
            >
              <span class="text-sm leading-none">+</span> Add
            </button>
          </div>

          <Show when={loading()}>
            <div class="space-y-4">
              {[1, 2, 3].map(() => (
                <div class="space-y-2">
                  <div class="shimmer h-4 w-28 rounded-full" />
                  <div class="shimmer h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Show>

          <Show
            when={!loading() && data() && data()!.categories.length > 0}
            fallback={
              <Show when={!loading()}>
                <div class="text-center py-8">
                  <div class="text-3xl mb-2">📂</div>
                  <p class="text-white/30 text-xs">No budget categories yet</p>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    class="mt-3 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-xs font-bold border border-indigo-500/20 hover:bg-indigo-500/20 transition"
                  >
                    Create your first category
                  </button>
                </div>
              </Show>
            }
          >
            <div class="space-y-4">
              <For each={data()?.categories}>
                {(cat, i) => (
                  <div
                    class="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-2.5 hover:bg-white/5 transition-all animate-fade-up"
                    style={`animation-delay:${0.2 + i() * 0.06}s; opacity:0`}
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-white text-sm">{cat.name}</span>
                      <div class="flex items-center gap-2">
                        <span class={`text-xs font-bold ${cat.remaining < 0 ? 'text-rose-400' : 'text-white/50'}`}>
                          {cat.remaining < 0
                            ? `Exceeded ${formatIDR(Math.abs(cat.remaining))}`
                            : `${formatIDR(cat.remaining)} left`}
                        </span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id!)}
                          class="w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs"
                          title="Delete"
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

        {/* Recent Expenses Card */}
        <div class="glass-card rounded-3xl p-5 animate-fade-up card-lift" style="animation-delay:0.26s; opacity:0">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold text-white">Recent Expenses</h2>
              <p class="text-[11px] text-white/35">Latest transactions</p>
            </div>
            <span class="px-2.5 py-1 bg-white/5 text-white/40 rounded-lg text-[10px] font-semibold border border-white/5">
              {data()?.recent_expenses?.length || 0} records
            </span>
          </div>

          <Show when={loading()}>
            <div class="space-y-3">
              {[1, 2, 3, 4].map(() => (
                <div class="flex items-center justify-between py-2">
                  <div class="space-y-1.5">
                    <div class="shimmer h-3.5 w-24 rounded-full" />
                    <div class="shimmer h-2.5 w-16 rounded-full" />
                  </div>
                  <div class="shimmer h-4 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </Show>

          <Show
            when={!loading() && data() && data()!.recent_expenses.length > 0}
            fallback={
              <Show when={!loading()}>
                <div class="text-center py-8">
                  <div class="text-3xl mb-2">💸</div>
                  <p class="text-white/30 text-xs">No expenses logged yet</p>
                </div>
              </Show>
            }
          >
            <div class="divide-y divide-white/4">
              <For each={data()?.recent_expenses}>
                {(exp, i) => (
                  <div
                    class={`py-3.5 flex items-center justify-between group animate-fade-up transition-opacity ${deletingId() === exp.id ? 'opacity-30' : ''}`}
                    style={`animation-delay:${0.28 + i() * 0.04}s; opacity:0`}
                  >
                    <div class="flex items-center gap-3">
                      {/* Category icon */}
                      <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-base flex-shrink-0">
                        💳
                      </div>
                      <div>
                        <div class="font-semibold text-white text-sm leading-none">{exp.category_name}</div>
                        <div class="text-[11px] text-white/35 mt-1 flex items-center gap-1.5">
                          <span>{exp.date}</span>
                          {exp.note && <><span class="text-white/20">•</span><span class="truncate max-w-[100px]">{exp.note}</span></>}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-black text-sm text-rose-400">-{formatIDR(exp.amount)}</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id!)}
                        class="w-7 h-7 flex items-center justify-center rounded-xl text-white/15 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all text-xs"
                        title="Delete"
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

      {/* ── Floating Action Button ── */}
      <div class="fixed bottom-0 inset-x-0 max-w-md mx-auto px-4 pb-6 pt-8 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/90 to-transparent pointer-events-none z-40">
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          class="w-full pointer-events-auto py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 active:scale-[0.97] text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/40 flex items-center justify-center gap-2.5 text-sm transition-all duration-200 hover:shadow-indigo-500/60"
        >
          <span class="text-xl leading-none font-black">+</span>
          Log Expense
        </button>
      </div>

      {/* ── Modals ── */}
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
