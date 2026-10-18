import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import {
  formatMonthName,
  getAdjacentMonthKey,
  getCurrentMonthKey,
  MONTH_NAMES_RU,
} from '../lib/formatters';

export const MonthSelector: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useBudget();
  const currentMonthKey = getCurrentMonthKey();
  const isCurrentMonth = selectedMonth === currentMonthKey;

  const handlePrev = () => {
    setSelectedMonth(getAdjacentMonthKey(selectedMonth, -1));
  };

  const handleNext = () => {
    setSelectedMonth(getAdjacentMonthKey(selectedMonth, 1));
  };

  const handleResetToCurrent = () => {
    setSelectedMonth(currentMonthKey);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePrev}
          aria-label="Предыдущий месяц"
          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="font-semibold text-base sm:text-lg text-stone-900 dark:text-stone-100 tracking-tight">
          {formatMonthName(selectedMonth)}
        </span>

        <button
          onClick={handleNext}
          aria-label="Следующий месяц"
          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          onClick={handleResetToCurrent}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded-full transition-colors"
        >
          Сегодня
        </button>
      )}
    </div>
  );
};
