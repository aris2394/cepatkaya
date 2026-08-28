import { createMemo } from 'solid-js';

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
  const percentage = () => Math.min(Math.max(props.percentage || 0, 0), 100);

  const status = createMemo(() => {
    const p = props.percentage || 0;
    if (p >= 100) return { color: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Over Budget' };
    if (p >= 80) return { color: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Warning' };
    return { color: 'bg-blue-600', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Healthy' };
  });

  return (
    <div class="w-full space-y-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="font-medium text-slate-600">
          {formatIDR(props.spent)} <span class="text-slate-400 font-normal">/ {formatIDR(props.total)}</span>
        </span>
        <span class={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status().badge}`}>
          {props.percentage.toFixed(0)}%
        </span>
      </div>
      <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div
          class={`h-full rounded-full ${status().color} transition-all duration-500 ease-out`}
          style={{ width: `${percentage()}%` }}
        />
      </div>
    </div>
  );
};
