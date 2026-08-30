import { onMount, createEffect } from 'solid-js';
import { Chart, Title, Tooltip, Legend, Colors, ArcElement } from 'chart.js';
import { Doughnut } from 'solid-chartjs';
import type { CategoryStatus } from '../types';

export const ExpenseChart = (props: { categories: CategoryStatus[] }) => {
  onMount(() => {
    Chart.register(Title, Tooltip, Legend, Colors, ArcElement);
  });

  // Calculate chart data from props
  const chartData = () => {
    // Only show categories that have some spending
    const activeCategories = props.categories.filter(c => c.spent > 0);
    
    if (activeCategories.length === 0) {
       return null;
    }

    return {
      labels: activeCategories.map(c => c.name),
      datasets: [
        {
          label: 'Spent',
          data: activeCategories.map(c => c.spent),
          backgroundColor: [
            '#6366f1', // Indigo
            '#8b5cf6', // Violet
            '#06b6d4', // Cyan
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#f43f5e', // Rose
            '#ec4899', // Pink
          ],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  };

  const isLight = () => typeof document !== 'undefined' && document.documentElement.classList.contains('light-mode');

  const options = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isLight() ? '#475569' : 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 17, 23, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed);
            }
            return label;
          }
        }
      }
    },
    cutout: '70%',
  });

  return (
    <div class="h-64 w-full relative">
      {chartData() ? (
        <Doughnut data={chartData() as any} options={options() as any} />
      ) : (
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center mb-3 text-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
            </svg>
          </div>
          <p class="text-white/40 text-xs text-center px-6">
            No expenses recorded yet. Your chart will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
