import { createSignal } from 'solid-js';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth: string;
  initialAmount?: number;
}

export const IncomeModal = (props: IncomeModalProps) => {
  const [amount, setAmount] = createSignal(props.initialAmount || '');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!amount() || Number(amount()) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_year: props.currentMonth,
          total_amount: Number(amount()),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update income');
      }

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
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-lg font-bold text-slate-800">Monthly Family Income</h3>
              <button
                type="button"
                onClick={props.onClose}
                class="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Month Period
                </label>
                <div class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700">
                  {props.currentMonth}
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Total Income (IDR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000000"
                  value={amount()}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  min="0"
                  required
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
                  disabled={loading()}
                  class="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition"
                >
                  {loading() ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
