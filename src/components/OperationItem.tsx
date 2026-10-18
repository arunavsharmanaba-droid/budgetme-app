import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { Category, Operation } from '../types/budget';
import { formatCurrency } from '../lib/formatters';
import { CategoryIcon } from './CategoryIcon';

interface OperationItemProps {
  operation: Operation;
  categories: Category[];
  currency?: string;
  onClick: () => void;
}

export const OperationItem: React.FC<OperationItemProps> = ({
  operation,
  categories,
  currency = 'RUB',
  onClick,
}) => {
  const cat = categories.find((c) => c.id === operation.categoryId);
  const sub = operation.subcategoryId
    ? categories.find((c) => c.id === operation.subcategoryId)
    : null;

  const isIncome = operation.type === 'income';
  const isTransfer = operation.type === 'transfer';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200/70 dark:border-stone-800/80 transition-all flex items-center justify-between gap-3 group active:scale-[0.99] shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Category Icon Badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{
            backgroundColor: cat?.color ? `${cat.color}15` : '#f1f5f9',
            color: cat?.color || '#64748b',
          }}
        >
          <CategoryIcon name={cat?.icon} className="w-5 h-5" />
        </div>

        {/* Text Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
              {operation.description}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            <span className="truncate">{cat?.name || 'Без категории'}</span>
            {sub && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="text-stone-400 dark:text-stone-500 truncate">{sub.name}</span>
              </>
            )}
            {operation.authorName && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-medium text-stone-600 dark:text-stone-300 truncate max-w-[90px]">
                  {operation.authorName}
                </span>
              </>
            )}
            {operation.note && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="italic text-stone-400 truncate max-w-[80px]">{operation.note}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Amount and Type Marker */}
      <div className="flex flex-col items-end flex-shrink-0">
        <div
          className={`text-sm sm:text-base font-bold tracking-tight flex items-center gap-1 ${
            isIncome
              ? 'text-emerald-600 dark:text-emerald-400'
              : isTransfer
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          <span>
            {isIncome ? '+' : isTransfer ? '' : '−'}
            {formatCurrency(operation.amount, currency)}
          </span>
          {isIncome ? (
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 inline" />
          ) : isTransfer ? (
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500 inline" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 inline" />
          )}
        </div>
      </div>
    </button>
  );
};
