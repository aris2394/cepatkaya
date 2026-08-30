import { createSignal, Show } from 'solid-js';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth: string;
  initialAmount?: number;
}

export const IncomeModal = (props: IncomeModalProps) => {
  const [amount, setAmount] = createSignal<number | string>(props.initialAmount || '');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

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
        body: JSON.stringify({ month_year: props.currentMonth, total_amount: Number(amount()) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update income');
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        props.onSuccess();
        props.onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/8 focus:border-indigo-500/30 transition-all placeholder:text-white/25 text-sm";

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-in"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div class="bg-[#161921] border border-white/8 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
          {/* Icon */}
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-4 mx-auto">
            💰
          </div>

          <div class="text-center mb-5">
            <h3 class="text-lg font-black text-white">Set Monthly Income</h3>
            <p class="text-xs text-white/35 mt-1">{props.currentMonth}</p>
          </div>

          <Show when={success()}>
            <div class="flex flex-col items-center py-6 animate-scale-in">
              <div class="text-4xl mb-2">✅</div>
              <p class="text-white font-bold text-sm">Income saved!</p>
            </div>
          </Show>

          <Show when={!success()}>
            <form onSubmit={handleSubmit} class="space-y-4">
              <div>
                <label class="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Total Income (IDR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15,000,000"
                  value={amount()}
                  onInput={(e) => setAmount(e.currentTarget.value)}
                  class={inputClass}
                  min="0"
                  required
                />
              </div>

              <Show when={error()}>
                <div class="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                  ⚠️ {error()}
                </div>
              </Show>

              <div class="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="flex-1 py-3 rounded-2xl bg-white/5 border border-white/8 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading()}
                  class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-black text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 transition-all active:scale-95"
                >
                  {loading() ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </Show>
  );
};
