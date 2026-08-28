import { createMemo } from 'solid-js';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ProgressRing = (props: ProgressRingProps) => {
  const size = () => props.size || 140;
  const strokeWidth = () => props.strokeWidth || 12;
  const radius = () => (size() - strokeWidth()) / 2;
  const circumference = () => 2 * Math.PI * radius();

  const clampedPercentage = () => Math.min(Math.max(props.percentage || 0, 0), 100);

  const strokeDashoffset = () =>
    circumference() - (clampedPercentage() / 100) * circumference();

  const colorClass = createMemo(() => {
    const p = props.percentage || 0;
    if (p >= 100) return 'text-rose-500';
    if (p >= 80) return 'text-amber-500';
    return 'text-blue-600';
  });

  return (
    <div class="relative flex flex-col items-center justify-center">
      <svg width={size()} height={size()} class="transform -rotate-90">
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          stroke="currentColor"
          stroke-width={strokeWidth()}
          class="text-slate-100"
          fill="transparent"
        />
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          stroke="currentColor"
          stroke-width={strokeWidth()}
          stroke-dasharray={circumference()}
          stroke-dashoffset={strokeDashoffset()}
          stroke-linecap="round"
          class={`${colorClass()} transition-all duration-700 ease-out`}
          fill="transparent"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="text-2xl font-bold tracking-tight text-slate-800">
          {Math.round(props.percentage || 0)}%
        </span>
        {props.label && (
          <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {props.label}
          </span>
        )}
      </div>
    </div>
  );
};
