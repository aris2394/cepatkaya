import { createSignal, Show, For, createEffect } from 'solid-js';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMonth: string;
}

interface Tpl {
  id: number;
  name: string;
  allocated_budget: number;
  created_by_name?: string;
}

const fmtIDR = (n: number) =>
  'Rp ' + Math.round(n).toLocaleString('id-ID');

export const TemplateManager = (props: TemplateManagerProps) => {
  const [templates, setTemplates] = createSignal<Tpl[]>([]);
  const [name, setName] = createSignal('');
  const [budget, setBudget] = createSignal('');
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setBudget('');
    setEditingId(null);
    setError('');
  };

  createEffect(() => {
    if (props.isOpen) {
      resetForm();
      load();
    }
  });

  const startEdit = (t: Tpl) => {
    setEditingId(t.id);
    setName(t.name);
    setBudget(t.allocated_budget.toString());
    setError('');
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!name() || budget() === '' || Number(budget()) < 0) {
      setError('Please fill in a name and a valid budget');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const isEdit = editingId() !== null;
      const res = await fetch('/api/templates', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId(),
          name: name(),
          allocated_budget: Number(budget()),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save template');
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    setBusy(true);
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    if (templates().length === 0) return;
    if (!confirm(`Apply all ${templates().length} templates to ${props.currentMonth}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/categories/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_year: props.currentMonth }),
      });
      if (res.ok) {
        props.onSuccess();
        props.onClose();
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to apply templates');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFromCurrentMonth = async () => {
    if (!confirm(`Simpan seluruh kategori bulan ${props.currentMonth} sebagai daftar template baru?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_year: props.currentMonth }),
      });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Gagal menyimpan template dari bulan ini');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:bg-white/8 focus:border-rose-500/30 transition-all placeholder:text-white/25 text-sm';

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-end justify-center animate-backdrop-in"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div class="bg-[#161921] border border-white/8 rounded-t-[2rem] w-full max-w-md p-6 pb-8 shadow-2xl animate-sheet-in max-h-[88vh] flex flex-col">
          {/* Handle */}
          <div class="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-black text-white">Category Templates</h3>
              <p class="text-xs text-white/35 mt-0.5">Reusable presets for any month</p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          {/* Template list */}
          <div class="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2 mb-3 min-h-[80px]">
            <Show when={loading()}>
              <div class="space-y-2">
                {[1, 2, 3].map(() => (
                  <div class="shimmer h-12 w-full rounded-2xl" />
                ))}
              </div>
            </Show>
            <Show when={!loading() && templates().length === 0}>
              <div class="text-center py-6">
                <div class="text-3xl mb-2">📋</div>
                <p class="text-white/30 text-xs">No templates yet. Add your first below.</p>
              </div>
            </Show>
            <For each={templates()}>
              {(t) => (
                <div class="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition">
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-white text-sm truncate">{t.name}</div>
                    <div class="flex items-center gap-2 text-[11px] text-white/40">
                      <span>{fmtIDR(t.allocated_budget)}</span>
                      <Show when={t.created_by_name}>
                        <span class="text-[10px] text-rose-300/60 font-medium">by {t.created_by_name}</span>
                      </Show>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Add / edit form */}
          <div class="border-t border-white/8 pt-4 space-y-3">
            <Show when={editingId() !== null}>
              <div class="text-[10px] font-bold text-rose-300 uppercase tracking-widest">Editing template</div>
            </Show>
            <form onSubmit={handleSave} class="space-y-3">
              <input
                type="text"
                placeholder="e.g. 🍔 Food & Groceries"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class={inputClass}
                required
              />
              <input
                type="number"
                placeholder="Budget (IDR) e.g. 2500000"
                value={budget()}
                onInput={(e) => setBudget(e.currentTarget.value)}
                class={inputClass}
                min="0"
                required
              />
              <Show when={error()}>
                <div class="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  ⚠️ {error()}
                </div>
              </Show>
              <div class="flex gap-2">
                <Show when={editingId() !== null}>
                  <button
                    type="button"
                    onClick={resetForm}
                    class="px-3 py-3 rounded-2xl bg-white/5 border border-white/8 text-xs font-bold text-white/60 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                </Show>
                <button
                  type="submit"
                  disabled={busy()}
                  class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-sm font-black text-white shadow-lg shadow-rose-500/30 hover:from-rose-400 hover:to-pink-500 disabled:opacity-40 transition-all active:scale-95"
                >
                  {busy() ? 'Saving…' : (editingId() !== null ? 'Update Template' : 'Add Template')}
                </button>
              </div>
            </form>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={busy() || templates().length === 0}
                class="flex-1 py-3 rounded-2xl bg-white/5 border border-white/8 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition active:scale-95 disabled:opacity-40"
              >
                ✨ Apply to {props.currentMonth}
              </button>
              <button
                type="button"
                onClick={handleSaveFromCurrentMonth}
                disabled={busy()}
                class="flex-1 py-3 rounded-2xl bg-white/5 border border-white/8 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition active:scale-95 disabled:opacity-40"
              >
                💾 Save {props.currentMonth} as Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
