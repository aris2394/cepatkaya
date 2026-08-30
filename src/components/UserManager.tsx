import { createSignal, Show, For, createEffect } from 'solid-js';

interface UserItem {
  id: number;
  username: string;
  display_name: string;
  is_active: number;
  created_at: string;
}

interface UserManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManager = (props: UserManagerProps) => {
  const [users, setUsers] = createSignal<UserItem[]>([]);
  const [currentUser, setCurrentUser] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');

  // Form states
  const [username, setUsername] = createSignal('');
  const [displayName, setDisplayName] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [editingId, setEditingId] = createSignal<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCurrentUser(data.currentUser || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setEditingId(null);
    setError('');
  };

  createEffect(() => {
    if (props.isOpen) {
      resetForm();
      setSuccessMsg('');
      load();
    }
  });

  const startEdit = (u: UserItem) => {
    setEditingId(u.id);
    setUsername(u.username);
    setDisplayName(u.display_name);
    setPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const isEdit = editingId() !== null;
      if (!isEdit && (!username() || !password() || !displayName())) {
        setError('Mohon lengkapi username, display name, dan password');
        return;
      }

      const res = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId(),
          username: username(),
          display_name: displayName(),
          password: password() || undefined,
        }),
      });

      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || 'Gagal menyimpan data akun');
      }

      setSuccessMsg(isEdit ? 'Akun berhasil diperbarui!' : 'Akun baru berhasil ditambahkan!');
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  const toggleUserActive = async (u: UserItem) => {
    const nextActive = u.is_active === 1 ? 0 : 1;
    const actionStr = nextActive === 1 ? 'mengaktifkan' : 'menonaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionStr} akun ${u.display_name}?`)) return;

    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.id,
          is_active: nextActive,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || 'Gagal mengubah status akun');
      }
      await load();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
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
              <h3 class="text-lg font-black text-white">Kelola Akun Admin</h3>
              <p class="text-xs text-white/35 mt-0.5">Pengaturan akun & akses Multi-Admin</p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          {/* User List */}
          <div class="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2 mb-4 min-h-[100px]">
            <Show when={loading()}>
              <div class="space-y-2">
                <div class="shimmer h-14 w-full rounded-2xl" />
                <div class="shimmer h-14 w-full rounded-2xl" />
              </div>
            </Show>

            <For each={users()}>
              {(u) => (
                <div class="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white text-sm truncate">{u.display_name}</span>
                      <span class="text-[10px] text-white/30 font-mono">(@{u.username})</span>
                      <Show when={currentUser()?.id === u.id}>
                        <span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-extrabold uppercase">Anda</span>
                      </Show>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class={`text-[10px] font-semibold ${u.is_active === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {u.is_active === 1 ? '● Aktif' : '○ Nonaktif'}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(u)}
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm"
                      title="Edit Akun"
                    >
                      ✏️
                    </button>

                    <Show when={currentUser()?.id !== u.id}>
                      <button
                        onClick={() => toggleUserActive(u)}
                        class={`w-7 h-7 flex items-center justify-center rounded-lg transition-all text-sm ${
                          u.is_active === 1
                            ? 'text-white/30 hover:text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={u.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {u.is_active === 1 ? '🚫' : '✅'}
                      </button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Form section */}
          <div class="border-t border-white/8 pt-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white/60">
                {editingId() !== null ? '✏️ Edit Akun' : '➕ Tambah Akun Admin Baru'}
              </span>
              <Show when={editingId() !== null}>
                <button
                  type="button"
                  onClick={resetForm}
                  class="text-[10px] text-rose-400 hover:underline font-bold"
                >
                  Batal Edit
                </button>
              </Show>
            </div>

            <form onSubmit={handleSave} class="space-y-2.5">
              <Show when={editingId() === null}>
                <input
                  type="text"
                  placeholder="Username (misal: istri)"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                  class={inputClass}
                  required
                />
              </Show>

              <input
                type="text"
                placeholder="Nama Tampilan (misal: Istri / Aris)"
                value={displayName()}
                onInput={(e) => setDisplayName(e.currentTarget.value)}
                class={inputClass}
                required
              />

              <input
                type="password"
                placeholder={editingId() !== null ? 'Kosongkan jika tak ingin ubah password' : 'Password'}
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class={inputClass}
                required={editingId() === null}
              />

              <Show when={error()}>
                <div class="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  ⚠️ {error()}
                </div>
              </Show>

              <Show when={successMsg()}>
                <div class="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  ✅ {successMsg()}
                </div>
              </Show>

              <button
                type="submit"
                disabled={busy()}
                class="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-sm font-black text-white shadow-lg shadow-rose-500/30 hover:from-rose-400 hover:to-pink-500 disabled:opacity-40 transition-all active:scale-95"
              >
                {busy() ? 'Menyimpan…' : editingId() !== null ? 'Simpan Perubahan' : 'Tambah Akun'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
};
