import React from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../lib/formatters';

export const UndoToast: React.FC = () => {
  const { lastAddedOp, undoLastOperation, clearLastAddedOp, userSettings } = useBudget();

  if (!lastAddedOp) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-stone-800 dark:border-stone-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-stone-300 dark:text-stone-600 truncate">
              Записано
            </p>
            <p className="text-sm font-medium truncate">
              {lastAddedOp.description}{' '}
              <span className="font-semibold">
                {formatCurrency(lastAddedOp.amount, userSettings.currency)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={undoLastOperation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-xs font-semibold tracking-wide transition-all active:scale-95 text-amber-300 dark:text-amber-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Отменить</span>
          </button>
          <button
            onClick={clearLastAddedOp}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 dark:hover:text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
