import { createSignal, For, Show } from 'solid-js';
import type { DashboardSummary } from '../types';
import { ProgressRing } from './ui/ProgressRing';
import { BudgetGauge, formatIDR } from './ui/BudgetGauge';
import { IncomeModal } from './IncomeModal';
import { CategoryModal } from './CategoryModal';
import { TemplateManager } from './TemplateManager';
import { UserManager } from './UserManager';
import { ExpenseLogger } from './ExpenseLogger';
import { ExpenseChart } from './ExpenseChart';

const SkeletonCard = () => (
  <div class="theme-card rounded-3xl p-5 space-y-3">
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

  // Modals state
  const [isIncomeModalOpen, setIsIncomeModalOpen] = createSignal(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = createSignal(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = createSignal(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = createSignal(false);
  const [isUserManagerOpen, setIsUserManagerOpen] = createSignal(false);
  const [deletingId, setDeletingId] = createSignal<number | null>(null);
  const [editingCategory, setEditingCategory] = createSignal<any>(null);
  const [editingExpense, setEditingExpense] = createSignal<any>(null);

  // Collapsible sections state
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = createSignal(
    typeof window !== 'undefined' ? localStorage.getItem('ck_cat_collapsed') === 'true' : false
  );
  const [isExpensesCollapsed, setIsExpensesCollapsed] = createSignal(
    typeof window !== 'undefined' ? localStorage.getItem('ck_exp_collapsed') === 'true' : false
  );

  const toggleCategoriesCollapse = () => {
    const next = !isCategoriesCollapsed();
    setIsCategoriesCollapsed(next);
    if (typeof window !== 'undefined') localStorage.setItem('ck_cat_collapsed', String(next));
  };

  const toggleExpensesCollapse = () => {
    const next = !isExpensesCollapsed();
    setIsExpensesCollapsed(next);
    if (typeof window !== 'undefined') localStorage.setItem('ck_exp_collapsed', String(next));
  };

  // Theme state switcher (Dark / Light mode)
  const [theme, setTheme] = createSignal(
    typeof window !== 'undefined' ? localStorage.getItem('ck_theme') || 'dark' : 'dark'
  );

  const applyThemeClass = (mode: string) => {
    if (typeof document !== 'undefined') {
      if (mode === 'light') {
        document.documentElement.classList.add('light-mode');
      } else {
        document.documentElement.classList.remove('light-mode');
      }
    }
  };

  applyThemeClass(theme());

  const toggleTheme = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ck_theme', next);
    }
    applyThemeClass(next);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setTimeout(() => setEditingCategory(null), 300);
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setTimeout(() => setEditingExpense(null), 300);
  };

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
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      fetchData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Hapus kategori ini beserta seluruh pengeluarannya?')) return;
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const [rolling, setRolling] = createSignal(false);
  const [loadingPresets, setLoadingPresets] = createSignal(false);

  const getPreviousMonth = () => {
    const [y, m] = selectedMonth().split('-').map(Number);
    const p = new Date(y, m - 1, 0); // last day of previous month
    return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleRollover = async () => {
    if (!confirm('Salin kategori & anggaran dari bulan lalu ke bulan ini?')) return;
    setRolling(true);
    try {
      const res = await fetch('/api/categories/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_year: selectedMonth(), from_month: getPreviousMonth() }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRolling(false);
    }
  };

  const handleLoadPresets = async () => {
    if (!confirm('Muat kategori preset default untuk bulan ini?')) return;
    setLoadingPresets(true);
    try {
      const res = await fetch('/api/categories/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_year: selectedMonth() }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Keluar dari aplikasi?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const overBudgetCats = () => (data()?.categories || []).filter((c) => c.percentage >= 100);
  const warningCats = () =>
    (data()?.categories || []).filter((c) => c.percentage >= 80 && c.percentage < 100);

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

  const netCashflow = () => {
    const d = data();
    if (!d) return 0;
    return d.total_income - d.total_spent;
  };

  const topSpendingCat = () => {
    const cats = data()?.categories || [];
    if (cats.length === 0) return null;
    return [...cats].sort((a, b) => b.spent - a.spent)[0];
  };

  const healthStatus = () => {
    const d = data();
    if (!d || d.total_allocated === 0) return { label: 'Siap Diatur ⚪', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    if (d.total_spent > d.total_allocated) return { label: 'Over Budget 🔴', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    if (d.total_spent >= 0.8 * d.total_allocated) return { label: 'Waspada 🟡', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Sehat 🟢', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  return (
    <div class="max-w-md mx-auto min-h-screen theme-bg pb-36 relative overflow-x-hidden transition-colors duration-300">
      {/* Background ambient glow */}
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 -left-20 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl" />
        <div class="absolute top-60 -right-20 w-64 h-64 bg-pink-600/8 rounded-full blur-3xl" />
        <div class="absolute bottom-40 left-10 w-48 h-48 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      {/* ── Header Section ── */}
      <header class="relative px-5 pt-8 pb-4 space-y-4">
        {/* Top bar: Brand + Controls */}
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="CepatKaya Logo" class="w-10 h-10 object-contain drop-shadow-[0_4px_8px_rgba(244,63,94,0.3)] shrink-0" />
            <div class="min-w-0">
              <h1 class="text-base font-black tracking-tight theme-text-primary leading-tight truncate">CepatKaya</h1>
              <p class="text-[11px] theme-text-muted font-medium truncate">Family Financial Monitor</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme() === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              class="w-9 h-9 flex items-center justify-center rounded-xl theme-card-item theme-text-primary hover:scale-105 transition-all text-sm"
            >
              {theme() === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setIsUserManagerOpen(true)}
              title="Kelola Akun Admin"
              class="px-2.5 py-1.5 flex items-center gap-1 rounded-xl theme-card-item theme-text-primary hover:scale-105 transition-all text-xs font-semibold"
            >
              <span>👤</span>
              <span class="hidden sm:inline">Akun</span>
            </button>
            <button
              onClick={handleLogout}
              title="Keluar"
              class="w-9 h-9 flex items-center justify-center rounded-xl theme-card-item text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
            >
              ⎋
            </button>
          </div>
        </div>

        {/* Month Picker Row */}
        <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl theme-card">
          <span class="text-xs font-bold theme-text-secondary flex items-center gap-1.5 pl-1">
            <span>📅</span> Bulan Anggaran:
          </span>
          <input
            type="month"
            value={selectedMonth()}
            onChange={(e) => handleMonthChange(e.currentTarget.value)}
            class="px-3 py-1.5 rounded-xl text-xs font-bold theme-input focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer transition"
          />
        </div>

        {/* Monthly Income Banner */}
        <div class="theme-card rounded-2xl p-4 flex items-center justify-between animate-fade-up">
          <div>
            <div class="text-[10px] font-bold theme-text-muted uppercase tracking-widest mb-1">Monthly Income</div>
            <div class="text-2xl font-black theme-text-primary animate-number">
              {loading() ? (
                <div class="shimmer h-7 w-36 rounded-lg" />
              ) : (
                formatIDR(data()?.total_income || 0)
              )}
            </div>
          </div>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            class="px-3.5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-500/25 active:scale-95 transition-all hover:scale-105"
          >
            Set Income
          </button>
        </div>
      </header>

      {/* ── Budget Alerts ── */}
      <Show when={!loading() && (overBudgetCats().length > 0 || warningCats().length > 0)}>
        <div class="px-5 mb-4 space-y-2">
          <Show when={overBudgetCats().length > 0}>
            <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5">
              <span class="text-base leading-none mt-0.5">🔴</span>
              <span><b>{overBudgetCats().length}</b> kategori melebihi anggaran: {overBudgetCats().map((c) => c.name).join(', ')}</span>
            </div>
          </Show>
          <Show when={warningCats().length > 0}>
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold flex items-start gap-2.5">
              <span class="text-base leading-none mt-0.5">🟡</span>
              <span><b>{warningCats().length}</b> kategori mendekati batas (&gt;80%): {warningCats().map((c) => c.name).join(', ')}</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* ── Main Dashboard Content ── */}
      <main class="px-5 space-y-4">

        {/* 1. Overview Card */}
        <div class="theme-card rounded-3xl p-5 animate-fade-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold theme-text-primary">Budget Overview</h2>
              <p class="text-[11px] theme-text-muted">{selectedMonth()}</p>
            </div>
            <Show when={!loading() && data()}>
              <div class="flex items-center gap-2">
                <span class={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${healthStatus().color}`}>
                  {healthStatus().label}
                </span>
                <div class="text-right">
                  <div class="text-[10px] theme-text-muted uppercase tracking-wider">Savings Rate</div>
                  <div class={`text-sm font-black ${savingsRate() > 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {savingsRate().toFixed(0)}%
                  </div>
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
                  { label: 'Allocated', value: data()?.total_allocated || 0, color: 'theme-text-primary' },
                  { label: 'Spent', value: data()?.total_spent || 0, color: 'text-rose-500' },
                  { label: 'Remaining', value: data()?.total_remaining_budget || 0, color: (data()?.total_remaining_budget || 0) < 0 ? 'text-rose-500' : 'text-emerald-500' },
                ].map((item, i) => (
                  <div class="animate-fade-up">
                    <span class="text-[10px] font-semibold theme-text-muted uppercase tracking-widest block mb-0.5">{item.label}</span>
                    <span class={`text-sm font-black ${item.color}`}>{formatIDR(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Show>

          {/* Financial Cashflow Summary Grid */}
          <Show when={!loading() && data()}>
            <div class="mt-4 pt-4 border-t theme-card-item border-x-0 border-b-0 border-t-1 grid grid-cols-2 gap-3">
              <div class="p-3 rounded-2xl theme-card-item">
                <span class="text-[10px] font-semibold theme-text-muted uppercase tracking-wider block mb-1">Net Cashflow</span>
                <span class={`text-sm font-black ${netCashflow() >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {netCashflow() >= 0 ? '+' : ''}{formatIDR(netCashflow())}
                </span>
              </div>
              <div class="p-3 rounded-2xl theme-card-item">
                <span class="text-[10px] font-semibold theme-text-muted uppercase tracking-wider block mb-1">Top Expense</span>
                <span class="text-xs font-bold theme-text-primary truncate block">
                  {topSpendingCat() ? `${topSpendingCat()?.name}` : 'Belum Ada'}
                </span>
              </div>
            </div>
          </Show>

          {/* Unallocated warning */}
          <Show when={!loading() && data() && data()!.remaining_unallocated > 0}>
            <div class="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-fade-up">
              <div class="flex items-center gap-2 text-xs text-amber-500">
                <span class="text-base">⚠️</span>
                <span>Unallocated: <b>{formatIDR(data()!.remaining_unallocated)}</b></span>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                class="text-amber-500 font-bold text-[11px] underline underline-offset-2 hover:text-amber-600 transition"
              >
                Allocate →
              </button>
            </div>
          </Show>
        </div>

        {/* 2. Expense Analytics Card */}
        <div class="theme-card rounded-3xl p-5 animate-fade-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold theme-text-primary">Expense Analytics</h2>
              <p class="text-[11px] theme-text-muted">Where your money goes</p>
            </div>
          </div>
          
          <Show when={loading()}>
            <div class="flex items-center justify-center py-8 h-64">
              <div class="shimmer w-48 h-48 rounded-full" />
            </div>
          </Show>
          
          <Show when={!loading() && data()}>
            <div class="py-2">
              <ExpenseChart categories={data()?.categories || []} />
            </div>
          </Show>
        </div>

        {/* 3. Category Budgets Card (Collapsible) */}
        <div class="theme-card rounded-3xl p-5 animate-fade-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold theme-text-primary">Category Budgets</h2>
              <p class="text-[11px] theme-text-muted">Real-time spending limits</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={toggleCategoriesCollapse}
                class="px-2.5 py-1 text-[11px] font-bold theme-card-item theme-text-secondary rounded-lg transition active:scale-95"
              >
                {isCategoriesCollapsed() ? '▼ Tampilkan' : '▲ Sembunyikan'}
              </button>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                class="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-xs font-bold border border-rose-500/20 transition-all active:scale-95"
              >
                <span class="text-sm leading-none">+</span> Add
              </button>
            </div>
          </div>

          <Show when={!isCategoriesCollapsed()}>
            <div class="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={handleRollover}
                disabled={rolling()}
                class="flex items-center gap-1 px-3 py-1.5 theme-card-item theme-text-secondary hover:theme-text-primary rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
              >
                {rolling() ? 'Copying…' : '↻ Copy last month'}
              </button>
              <button
                onClick={handleLoadPresets}
                disabled={loadingPresets()}
                class="flex items-center gap-1 px-3 py-1.5 theme-card-item theme-text-secondary hover:theme-text-primary rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
              >
                {loadingPresets() ? 'Loading…' : '✨ Load presets'}
              </button>
              <button
                onClick={() => setIsTemplateManagerOpen(true)}
                class="flex items-center gap-1 px-3 py-1.5 theme-card-item theme-text-secondary hover:theme-text-primary rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                📋 Templates
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
                    <p class="theme-text-muted text-xs">Belum ada kategori anggaran</p>
                    <div class="flex flex-col items-center gap-2 mt-3">
                      <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        class="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold border border-rose-500/20 hover:bg-rose-500/20 transition"
                      >
                        Buat Kategori Pertama
                      </button>
                      <button
                        onClick={handleLoadPresets}
                        disabled={loadingPresets()}
                        class="px-4 py-2 theme-card-item theme-text-secondary rounded-xl text-xs font-bold hover:theme-text-primary transition disabled:opacity-40"
                      >
                        {loadingPresets() ? 'Loading…' : '✨ Muat Presets'}
                      </button>
                    </div>
                  </div>
                </Show>
              }
            >
              <div class="space-y-3">
                <For each={data()?.categories}>
                  {(cat, i) => (
                    <div class="group p-4 rounded-2xl theme-card-item space-y-2.5 hover:scale-[1.01] transition-all animate-fade-up">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-bold theme-text-primary text-sm truncate flex-1">{cat.name}</span>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class={`text-xs font-bold whitespace-nowrap ${cat.remaining < 0 ? 'text-rose-500' : 'theme-text-muted'}`}>
                            {cat.remaining < 0
                              ? `Exceeded ${formatIDR(Math.abs(cat.remaining))}`
                              : `${formatIDR(cat.remaining)} left`}
                          </span>
                          <div class="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                              class="w-7 h-7 flex items-center justify-center rounded-lg theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id!)}
                              class="w-7 h-7 flex items-center justify-center rounded-lg theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                      <BudgetGauge percentage={cat.percentage} spent={cat.spent} total={cat.allocated_budget} />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>

        {/* 4. Recent Expenses Card (Collapsible) */}
        <div class="theme-card rounded-3xl p-5 animate-fade-up">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-sm font-bold theme-text-primary">Recent Expenses</h2>
              <p class="text-[11px] theme-text-muted">Latest transactions</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={toggleExpensesCollapse}
                class="px-2.5 py-1 text-[11px] font-bold theme-card-item theme-text-secondary rounded-lg transition active:scale-95"
              >
                {isExpensesCollapsed() ? '▼ Tampilkan' : '▲ Sembunyikan'}
              </button>
              <span class="px-2.5 py-1 theme-card-item theme-text-muted rounded-lg text-[10px] font-semibold">
                {data()?.recent_expenses?.length || 0} records
              </span>
            </div>
          </div>

          <Show when={!isExpensesCollapsed()}>
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
                    <p class="theme-text-muted text-xs">Belum ada pengeluaran dicatat</p>
                  </div>
                </Show>
              }
            >
              <div class="divide-y divide-gray-500/10">
                <For each={data()?.recent_expenses}>
                  {(exp, i) => (
                    <div class={`py-3.5 flex items-center justify-between gap-2 group animate-fade-up transition-opacity ${deletingId() === exp.id ? 'opacity-30' : ''}`}>
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        {/* Category icon */}
                        <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-base flex-shrink-0">
                          💳
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="font-semibold theme-text-primary text-sm leading-tight truncate">{exp.category_name}</div>
                          <div class="text-[11px] theme-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                            <span class="whitespace-nowrap">{exp.date}</span>
                            {exp.created_by_name && (
                              <>
                                <span class="theme-text-muted opacity-40 shrink-0">•</span>
                                <span class="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md">by {exp.created_by_name}</span>
                              </>
                            )}
                            {exp.note && <><span class="theme-text-muted opacity-40 shrink-0">•</span><span class="truncate">{exp.note}</span></>}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <span class="font-black text-sm text-rose-500 whitespace-nowrap">-{formatIDR(exp.amount)}</span>
                        <div class="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-1">
                          <button
                            onClick={() => { setEditingExpense(exp); setIsExpenseModalOpen(true); }}
                            class="w-7 h-7 flex items-center justify-center rounded-xl theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id!)}
                            class="w-7 h-7 flex items-center justify-center rounded-xl theme-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </main>

      {/* ── Floating Action Button ── */}
      <div class="fixed bottom-0 inset-x-0 max-w-md mx-auto px-4 pb-6 pt-6 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/90 to-transparent dark:from-[#0f1117] pointer-events-none z-40">
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          class="w-full pointer-events-auto py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 active:scale-[0.97] text-white font-black rounded-2xl shadow-2xl shadow-rose-500/40 flex items-center justify-center gap-2.5 text-sm transition-all duration-200 hover:shadow-rose-500/60"
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
        onClose={handleCloseCategoryModal}
        onSuccess={fetchData}
        currentMonth={selectedMonth()}
        editData={editingCategory()}
      />
      <TemplateManager
        isOpen={isTemplateManagerOpen()}
        onClose={() => setIsTemplateManagerOpen(false)}
        onSuccess={fetchData}
        currentMonth={selectedMonth()}
      />
      <UserManager
        isOpen={isUserManagerOpen()}
        onClose={() => setIsUserManagerOpen(false)}
      />
      <ExpenseLogger
        isOpen={isExpenseModalOpen()}
        onClose={handleCloseExpenseModal}
        onSuccess={fetchData}
        categories={data()?.categories || []}
        editData={editingExpense()}
      />
    </div>
  );
};
