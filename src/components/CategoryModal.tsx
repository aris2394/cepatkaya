import { createSignal } from 'solid-js';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth: string;
}

const PRESET_CATEGORIES = [
  '🍔 Food & Groceries',
  '🏠 Rent & Housing',
  '🚗 Transportation',
  '💳 Debt / Installments',
  '💡 Utilities & Bills',
  '🛡️ Savings & Investment',
  '🎉 Entertainment',
  '💊 Health & Medical',
  '📦 Miscellaneous',
];

export const CategoryModal = (props: CategoryModalProps) => {
  const [name, setName] = createSignal('');
  const [budget, setBudget] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name() || !budget() || Number(budget()) <= 0) {
      setError('Please fill in category name and allocated budget');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name(),
          allocated_budget: Number(budget()),
          month_year: props.currentMonth,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save category');
      }

      setName('');
      setBudget('');
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
              <h3 class="text-lg font-bold text-slate-800">Add Budget Category</h3>
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
                  Preset Categories
                </label>
                <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {PRESET_CATEGORIES.map((preset) => (
                    <button
                      type="button"
                      onClick={() => setName(preset)}
                      class="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Groceries"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Allocated Budget (IDR)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2500000"
                  value={budget()}
                  onInput={(e) => setBudget(e.currentTarget.value)}
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
                  {loading() ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
