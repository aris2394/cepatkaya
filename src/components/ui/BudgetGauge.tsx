import { createMemo, createSignal, onMount } from 'solid-js';

interface BudgetGaugeProps {
  percentage: number;
  spent: number;
  total: number;
}

export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const BudgetGauge = (props: BudgetGaugeProps) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setTimeout(() => setMounted(true), 100));

  const percentage = () => Math.min(Math.max(props.percentage || 0, 0), 100);

  const status = createMemo(() => {
    const p = props.percentage || 0;
    if (p >= 100) return {
      bar: 'from-rose-500 to-rose-600',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'shadow-rose-500/20',
      label: 'Over Budget',
      emoji: '🔴'
    };
    if (p >= 80) return {
      bar: 'from-amber-500 to-orange-500',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'shadow-amber-500/20',
      label: 'Warning',
      emoji: '🟡'
    };
    return {
      bar: 'from-rose-500 to-pink-500',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'shadow-rose-500/20',
      label: 'Healthy',
      emoji: '🟢'
    };
  });

  return (
    <div class="w-full space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-white/60 font-medium">
          <span class="text-white font-bold">{formatIDR(props.spent)}</span>
          <span class="text-white/30"> / {formatIDR(props.total)}</span>
        </span>
        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status().badge}`}>
          {props.percentage.toFixed(0)}%
        </span>
      </div>
      {/* Track */}
      <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          class={`h-full rounded-full bg-gradient-to-r ${status().bar} shadow-lg ${status().glow}`}
          style={{
            width: mounted() ? `${percentage()}%` : '0%',
            transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
            'box-shadow': `0 0 10px currentColor`
          }}
        />
      </div>
    </div>
  );
};
