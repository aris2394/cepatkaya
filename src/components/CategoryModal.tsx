import { createSignal, Show, createEffect } from 'solid-js';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSuccess: () => void;
  currentMonth: string;
  editData?: { id: number; name: string; allocated_budget: number };
}

const PRESET_CATEGORIES = [
  { icon: '🍔', label: 'Food & Groceries' },
  { icon: '🏠', label: 'Rent & Housing' },
  { icon: '🚗', label: 'Transportation' },
  { icon: '💳', label: 'Debt / Installments' },
  { icon: '💡', label: 'Utilities & Bills' },
  { icon: '🛡️', label: 'Savings & Investment' },
  { icon: '🎉', label: 'Entertainment' },
  { icon: '💊', label: 'Health & Medical' },
  { icon: '📦', label: 'Miscellaneous' },
  { icon: '👕', label: 'Clothing' },
  { icon: '📚', label: 'Education' },
  { icon: '✈️', label: 'Travel' },
];

export const CategoryModal = (props: CategoryModalProps) => {
  const [name, setName] = createSignal('');
  const [budget, setBudget] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal(false);

  createEffect(() => {
    if (props.isOpen && props.editData) {
      setName(props.editData.name);
      setBudget(props.editData.allocated_budget.toString());
    } else if (props.isOpen && !props.editData) {
      setName('');
      setBudget('');
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name() || !budget() || Number(budget()) <= 0) {
      setError('Please fill in category name and allocated budget');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEdit = !!props.editData;
      const res = await fetch('/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.editData?.id,
          name: name(),
          allocated_budget: Number(budget()),
          month_year: props.currentMonth,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save category');
      }
      setSuccess(true);
      setTimeout(() => {
        setName('');
        setBudget('');
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

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:bg-white/8 focus:border-rose-500/30 transition-all placeholder:text-white/25 text-sm";

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-end justify-center animate-backdrop-in"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div class="bg-[#161921] border border-white/8 rounded-t-[2rem] w-full max-w-md p-6 pb-8 shadow-2xl animate-sheet-in">
          {/* Handle */}
          <div class="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-lg font-black text-white">{props.editData ? 'Edit Budget Category' : 'Add Budget Category'}</h3>
              <p class="text-xs text-white/35 mt-0.5">{props.currentMonth}</p>
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
              <p class="text-white font-bold">{props.editData ? 'Category updated!' : 'Category created!'}</p>
            </div>
          </Show>

          <Show when={!success()}>
            <form onSubmit={handleSubmit} class="space-y-4">
              {/* Preset chips */}
              <div>
                <label class="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Quick Presets
                </label>
                <div class="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1 scrollbar-hide">
                  {PRESET_CATEGORIES.map((preset) => (
                    <button
                      type="button"
                      onClick={() => setName(`${preset.icon} ${preset.label}`)}
                      class={`px-3 py-1.5 text-xs rounded-xl border transition-all active:scale-95 font-medium ${
                        name() === `${preset.icon} ${preset.label}`
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-white/5 border-white/8 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/15'
                      }`}
                    >
                      {preset.icon} {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🍔 Food & Groceries"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  class={inputClass}
                  required
                />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Allocated Budget (IDR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2,500,000"
                  value={budget()}
                  onInput={(e) => setBudget(e.currentTarget.value)}
                  class={inputClass}
                  min="0"
                  required
                />
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
                  disabled={loading()}
                  class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-sm font-black text-white shadow-lg shadow-rose-500/30 hover:from-rose-400 hover:to-pink-500 disabled:opacity-40 transition-all active:scale-95"
                >
                  {loading() ? 'Saving...' : (props.editData ? 'Update Category' : 'Add Category')}
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </Show>
  );
};
