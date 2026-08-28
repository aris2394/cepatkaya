import { createMemo, createSignal, onMount } from 'solid-js';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const ProgressRing = (props: ProgressRingProps) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setTimeout(() => setMounted(true), 50));

  const size = () => props.size || 148;
  const strokeWidth = () => props.strokeWidth || 13;
  const radius = () => (size() - strokeWidth()) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const clampedPct = () => Math.min(Math.max(props.percentage || 0, 0), 100);

  const strokeDashoffset = () =>
    mounted()
      ? circumference() - (clampedPct() / 100) * circumference()
      : circumference();

  const colorStops = createMemo(() => {
    const p = props.percentage || 0;
    if (p >= 100) return { start: '#f43f5e', end: '#e11d48', glow: 'rgba(244,63,94,0.4)' };
    if (p >= 80) return { start: '#f59e0b', end: '#d97706', glow: 'rgba(245,158,11,0.4)' };
    return { start: '#6366f1', end: '#4f46e5', glow: 'rgba(99,102,241,0.4)' };
  });

  const gradId = `ring-grad-${Math.random().toString(36).slice(2)}`;

  return (
    <div class="relative flex flex-col items-center justify-center">
      <svg
        width={size()} height={size()}
        class="transform -rotate-90 drop-shadow-xl"
        style={{ filter: `drop-shadow(0 0 12px ${colorStops().glow})` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color={colorStops().start} />
            <stop offset="100%" stop-color={colorStops().end} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size() / 2} cy={size() / 2} r={radius()}
          stroke="rgba(255,255,255,0.06)" stroke-width={strokeWidth()}
          fill="transparent"
        />
        {/* Progress */}
        <circle
          cx={size() / 2} cy={size() / 2} r={radius()}
          stroke={`url(#${gradId})`}
          stroke-width={strokeWidth()}
          stroke-dasharray={circumference()}
          stroke-dashoffset={strokeDashoffset()}
          stroke-linecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-2xl font-black tracking-tight text-white">
          {Math.round(props.percentage || 0)}%
        </span>
        {props.label && (
          <span class="text-[10px] font-semibold uppercase tracking-widest text-white/40 mt-0.5">
            {props.label}
          </span>
        )}
      </div>
    </div>
  );
};
