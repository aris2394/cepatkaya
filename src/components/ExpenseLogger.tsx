import { createSignal } from 'solid-js';
import type { Category } from '../types';

interface ExpenseLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
}

export const ExpenseLogger = (props: ExpenseLoggerProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [categoryId, setCategoryId] = createSignal('');
  const [amount, setAmount] = createSignal('');
  const [date, setDate] = createSignal(today);
  const [note, setNote] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!categoryId() || !amount() || Number(amount()) <= 0) {
      setError('Please select a category and enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: Number(categoryId()),
          amount: Number(amount()),
          date: date(),
          note: note(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to record expense');
      }

      setAmount('');
      setNote('');
      props.onSuccess();
      props.onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {props.isOpen && (
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-lg font-bold text-slate-800">Log Daily Expense</h3>
                <p class="text-xs text-slate-400">Quick track your actual spending</p>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                class="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} class="mt-4 space-y-3.5">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={categoryId()}
                  onChange={(e) => setCategoryId(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                >
                  <option value="" disabled>Select category</option>
                  {props.categories.map((cat) => (
                    <option value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Amount (IDR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={amount()}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  min="0"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date()}
                  onInput={(e) => setDate(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with team, Groceries"
                  value={note()}
                  onInput={(e) => setNote(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              {error() && (
                <div class="text-xs font-medium text-rose-500 bg-rose-50 p-2.5 rounded-lg">
                  {error()}
                </div>
              )}

              <div class="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading() || props.categories.length === 0}
                  class="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition"
                >
                  {loading() ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
