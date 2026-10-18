import React, { useState, useMemo, useRef } from 'react';
import { ArrowUp, CornerDownLeft, Sparkles, Tag, Calendar, ArrowRightLeft, Plus } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { parseQuickEntry } from '../lib/smartParser';
import { formatCurrency, formatRelativeDate } from '../lib/formatters';

interface QuickEntryProps {
  onAddSuccess?: () => void;
}

export const QuickEntry: React.FC<QuickEntryProps> = ({ onAddSuccess }) => {
  const { categories, rules, addOperation, userSettings } = useBudget();
  const [inputVal, setInputVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time parsing of current input
  const parsed = useMemo(() => {
    return parseQuickEntry(inputVal, categories, rules);
  }, [inputVal, categories, rules]);

  // Find category name and subcategory name for preview
  const previewInfo = useMemo(() => {
    if (!parsed.raw.trim()) return null;

    const cat = categories.find((c) => c.id === parsed.categoryId);
    const sub = parsed.subcategoryId ? categories.find((c) => c.id === parsed.subcategoryId) : null;

    return {
      categoryName: cat ? cat.name : 'Без категории',
      subcategoryName: sub ? sub.name : null,
      color: cat?.color || '#94a3b8',
    };
  }, [parsed, categories]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isSubmitting) return;

    // Check if amount is present
    if (parsed.amount === null || parsed.amount <= 0) {
      // Focus input and inform user gently
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await addOperation({
        type: parsed.type,
        description: parsed.description,
        amount: parsed.amount,
        currency: userSettings.currency || 'RUB',
        categoryId: parsed.categoryId,
        subcategoryId: parsed.subcategoryId || '',
        date: parsed.date,
        source: 'quick_entry',
      });

      setInputVal('');
      if (onAddSuccess) onAddSuccess();
    } catch (err) {
      console.error('Failed to quick add operation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset chips for rapid 1-tap entry
  const quickPresets = [
    { label: 'Кофе 240', text: 'Кофе 240' },
    { label: 'Продукты 1500', text: 'Продукты 1500' },
    { label: 'Бензин 2500', text: 'Бензин 2500' },
    { label: 'Такси 450', text: 'Такси 450' },
    { label: 'Обед 400', text: 'Обед 400' },
    { label: 'Зарплата 95000', text: 'Зарплата 95000' },
  ];

  return (
    <div className="w-full">
      {/* Input container with notebook feel */}
      <div className="relative bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-sm hover:shadow transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
        <form onSubmit={handleSubmit} className="flex items-center px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Например: продукты 850 или кофе 240"
            className="w-full bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 text-base md:text-lg focus:outline-none pr-3"
            autoComplete="off"
            autoCorrect="off"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || parsed.amount === null || isSubmitting}
            aria-label="Записать операцию"
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              inputVal.trim() && parsed.amount !== null
                ? parsed.type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 active:scale-95'
                  : parsed.type === 'transfer'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 active:scale-95'
                  : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white shadow-sm active:scale-95'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Live recognition preview badge */}
        {inputVal.trim() && (
          <div className="px-4 pb-3 pt-1 border-t border-stone-100 dark:border-stone-800/60 flex flex-wrap items-center gap-2 text-xs">
            {parsed.amount !== null ? (
              <span
                className={`font-semibold px-2 py-0.5 rounded-md ${
                  parsed.type === 'income'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : parsed.type === 'transfer'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200'
                }`}
              >
                {parsed.type === 'income' ? '+' : parsed.type === 'expense' ? '−' : '⇄'}{' '}
                {formatCurrency(parsed.amount, userSettings.currency)}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Введите сумму в конце строки
              </span>
            )}

            {previewInfo && (
              <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/60 px-2 py-0.5 rounded-md">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: previewInfo.color }}
                />
                <span>{previewInfo.categoryName}</span>
                {previewInfo.subcategoryName && (
                  <span className="text-stone-400 dark:text-stone-500">
                    / {previewInfo.subcategoryName}
                  </span>
                )}
              </span>
            )}

            {parsed.date && (
              <span className="inline-flex items-center gap-1 text-stone-500 dark:text-stone-400">
                <Calendar className="w-3 h-3 text-stone-400" />
                {formatRelativeDate(parsed.date)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick suggestions pills */}
      {!inputVal.trim() && (
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none py-1 text-xs">
          <span className="text-stone-400 dark:text-stone-500 flex-shrink-0 text-[11px] font-medium mr-1">
            Быстро:
          </span>
          {quickPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setInputVal(preset.text);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
