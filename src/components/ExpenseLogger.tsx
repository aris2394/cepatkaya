import { createSignal, Show, createEffect } from 'solid-js';
import type { Category } from '../types';

interface ExpenseLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSuccess: () => void;
  categories: Category[];
  editData?: { id: number; category_id: number; amount: number; date: string; note: string };
}

export const ExpenseLogger = (props: ExpenseLoggerProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [categoryId, setCategoryId] = createSignal('');
  const [amount, setAmount] = createSignal('');
  const [date, setDate] = createSignal(today);
  const [note, setNote] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

  createEffect(() => {
    if (props.isOpen && props.editData) {
      setCategoryId(props.editData.category_id.toString());
      setAmount(props.editData.amount.toString());
      setDate(props.editData.date);
      setNote(props.editData.note || '');
    } else if (props.isOpen && !props.editData) {
      setCategoryId('');
      setAmount('');
      setDate(today);
      setNote('');
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!categoryId() || !amount() || Number(amount()) <= 0) {
      setError('Please select a category and enter a valid amount');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEdit = !!props.editData;
      const res = await fetch('/api/expenses', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.editData?.id,
          category_id: Number(categoryId()),
          amount: Number(amount()),
          date: date(),
          note: note(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save expense');
      }

      setSuccess(true);
      setTimeout(() => {
        setAmount('');
        setNote('');
        setSuccess(false);
        props.onSuccess();
        props.onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/8 focus:border-indigo-500/30 transition-all placeholder:text-white/25 text-sm";
  const labelClass = "block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5";

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-end justify-center animate-backdrop-in"
        style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        {/* Sheet */}
        <div class="bg-[#161921] border border-white/8 rounded-t-[2rem] w-full max-w-md p-6 pb-8 shadow-2xl animate-sheet-in">
          {/* Handle */}
          <div class="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-lg font-black text-white">{props.editData ? 'Edit Expense' : 'Log Expense'}</h3>
              <p class="text-xs text-white/35 mt-0.5">Track your daily spending</p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          <Show when={success()}>
            <div class="flex flex-col items-center justify-center py-8 animate-scale-in">
              <div class="text-5xl mb-3">✅</div>
              <p class="text-white font-bold">{props.editData ? 'Expense updated!' : 'Expense recorded!'}</p>
            </div>
          </Show>

          <Show when={!success()}>
            <form onSubmit={handleSubmit} class="space-y-4">
              <div>
                <label class={labelClass}>Category</label>
                <select
                  value={categoryId()}
                  onChange={(e) => setCategoryId(e.currentTarget.value)}
                  class={inputClass}
                  required
                >
                  <option value="" disabled style="background:#161921">Select category</option>
                  {props.categories.map((cat) => (
                    <option value={cat.id} style="background:#161921">{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label class={labelClass}>Amount (IDR)</label>
                <input
                  type="number"
                  placeholder="e.g. 50,000"
                  value={amount()}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                  class={inputClass}
                  min="0"
                  required
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class={labelClass}>Date</label>
                  <input
                    type="date"
                    value={date()}
                    onInput={(e) => setDate(e.currentTarget.value)}
                    class={inputClass}
                    required
                  />
                </div>
                <div>
                  <label class={labelClass}>Note (optional)</label>
                  <input
                    type="text"
                    placeholder="Lunch, Groceries..."
                    value={note()}
                    onInput={(e) => setNote(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
              </div>

              <Show when={error()}>
                <div class="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl animate-scale-in">
                  ⚠️ {error()}
                </div>
              </Show>

              <div class="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/8 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading() || props.categories.length === 0}
                  class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 transition-all active:scale-95"
                >
                  {loading() ? (
                    <span class="flex items-center justify-center gap-2">
                      <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" style="animation: spin 0.6s linear infinite" />
                      Saving...
                    </span>
                  ) : (props.editData ? 'Update Expense' : 'Add Expense')}
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </Show>
  );
};
