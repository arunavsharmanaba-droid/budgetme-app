import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Wallet, ArrowRightLeft } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../lib/formatters';

export const BalanceCard: React.FC = () => {
  const { operations, selectedMonth, userSettings } = useBudget();

  // Filter operations for selected month
  const { totalIncome, totalExpense, balance, transferCount } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfers = 0;

    for (const op of operations) {
      if (op.date.startsWith(selectedMonth)) {
        if (op.type === 'income') {
          income += op.amount;
        } else if (op.type === 'expense') {
          expense += op.amount;
        } else if (op.type === 'transfer') {
          // Internal transfers are not counted as budget income/expense to avoid double counting
          transfers++;
        }
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      transferCount: transfers,
    };
  }, [operations, selectedMonth]);

  const currency = userSettings.currency || 'RUB';

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {/* Остаток / Баланс */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">
            Остаток
          </span>
          <Wallet className="w-3.5 h-3.5 text-stone-400" />
        </div>
        <div>
          <div
            className={`text-base sm:text-lg font-bold tracking-tight truncate ${
              balance > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : balance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-stone-800 dark:text-stone-200'
            }`}
          >
            {balance > 0 ? '+' : ''}
            {formatCurrency(balance, currency)}
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
            доход − расход
          </p>
        </div>
      </div>

      {/* Доходы */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">
            Доходы
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(totalIncome, currency)}
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
            за месяц
          </p>
        </div>
      </div>

      {/* Расходы */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
          <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">
            Расходы
          </span>
          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 truncate">
            {formatCurrency(totalExpense, currency)}
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
            за месяц
          </p>
        </div>
      </div>
    </div>
  );
};
