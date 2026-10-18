import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { Operation, OperationType } from '../types/budget';
import { OperationItem } from './OperationItem';
import { OperationModal } from './OperationModal';
import {
  formatCurrency,
  formatMonthName,
  formatRelativeDate,
  exportOperationsToCSV,
  getCurrentMonthKey,
} from '../lib/formatters';

export const HistoryScreen: React.FC = () => {
  const { operations, categories, selectedMonth, userSettings } = useBudget();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<OperationType | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'selected_month' | 'last_month' | 'last_90' | 'all' | 'custom'>('selected_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);

  // Filter operations based on criteria
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cat = categories.find((c) => c.id === op.categoryId);
        const sub = op.subcategoryId ? categories.find((c) => c.id === op.subcategoryId) : null;
        const matchesDesc = op.description.toLowerCase().includes(q);
        const matchesCat = cat ? cat.name.toLowerCase().includes(q) : false;
        const matchesSub = sub ? sub.name.toLowerCase().includes(q) : false;
        const matchesNote = op.note ? op.note.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesCat && !matchesSub && !matchesNote) return false;
      }

      // 2. Type Filter
      if (selectedType !== 'all' && op.type !== selectedType) {
        return false;
      }

      // 3. Category Filter
      if (selectedCategoryFilter !== 'all') {
        if (op.categoryId !== selectedCategoryFilter && op.subcategoryId !== selectedCategoryFilter) {
          return false;
        }
      }

      // 4. Period Filter
      if (periodFilter === 'selected_month') {
        if (!op.date.startsWith(selectedMonth)) return false;
      } else if (periodFilter === 'last_month') {
        const now = new Date();
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const key = `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2, '0')}`;
        if (!op.date.startsWith(key)) return false;
      } else if (periodFilter === 'last_90') {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        if (op.date < cutoffStr) return false;
      } else if (periodFilter === 'custom') {
        if (customStartDate && op.date < customStartDate) return false;
        if (customEndDate && op.date > customEndDate) return false;
      }

      return true;
    });
  }, [operations, categories, searchQuery, selectedType, selectedCategoryFilter, periodFilter, selectedMonth, customStartDate, customEndDate]);

  // Aggregate totals
  const { totalExpense, totalIncome, netTotal } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const op of filteredOperations) {
      if (op.type === 'expense') exp += op.amount;
      if (op.type === 'income') inc += op.amount;
    }
    return { totalExpense: exp, totalIncome: inc, netTotal: inc - exp };
  }, [filteredOperations]);

  // Group by day for display
  const groupedList = useMemo(() => {
    const groups: { date: string; items: Operation[]; dayExpenseTotal: number }[] = [];
    const map = new Map<string, { date: string; items: Operation[]; dayExpenseTotal: number }>();

    for (const op of filteredOperations) {
      if (!map.has(op.date)) {
        const group = { date: op.date, items: [], dayExpenseTotal: 0 };
        map.set(op.date, group);
        groups.push(group);
      }
      const group = map.get(op.date)!;
      group.items.push(op);
      if (op.type === 'expense') {
        group.dayExpenseTotal += op.amount;
      }
    }

    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [filteredOperations]);

  // CSV Export handler
  const handleExportCSV = () => {
    const csvData = exportOperationsToCSV(filteredOperations, categories);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budget_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            История операций
          </h1>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            поиск и фильтрация расходов
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          title="Экспорт в CSV"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-xs font-semibold transition-colors active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="mt-3 relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию: бензин, кофе, ремонт..."
          className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type Filter Tabs */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 text-xs">
        {[
          { id: 'all', label: 'Все' },
          { id: 'expense', label: 'Расходы' },
          { id: 'income', label: 'Доходы' },
          { id: 'transfer', label: 'Переводы' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl transition-all font-medium ${
              selectedType === tab.id
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period & Category Filters */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {/* Period Selector */}
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as any)}
          className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl px-3 py-2 text-stone-700 dark:text-stone-300 focus:outline-none"
        >
          <option value="selected_month">{formatMonthName(selectedMonth)}</option>
          <option value="last_month">Прошлый месяц</option>
          <option value="last_90">За последние 90 дней</option>
          <option value="all">За всё время</option>
          <option value="custom">Свой период...</option>
        </select>

        {/* Category Selector */}
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl px-3 py-2 text-stone-700 dark:text-stone-300 focus:outline-none truncate"
        >
          <option value="all">Все категории</option>
          <option value="uncategorized">Без категории</option>
          {categories
            .filter((c) => !c.parentId)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
      </div>

      {/* Custom Date Range if active */}
      {periodFilter === 'custom' && (
        <div className="mt-2 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center gap-2 text-xs">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="flex-1 bg-stone-50 dark:bg-stone-800 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700"
          />
          <span className="text-stone-400">—</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="flex-1 bg-stone-50 dark:bg-stone-800 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700"
          />
        </div>
      )}

      {/* Summary Banner */}
      <div className="mt-3 bg-stone-100 dark:bg-stone-850 p-3 rounded-2xl flex items-center justify-between text-xs">
        <span className="text-stone-500 dark:text-stone-400 font-medium">
          Найдено записей: <strong className="text-stone-800 dark:text-stone-200">{filteredOperations.length}</strong>
        </span>
        <div className="flex items-center gap-2 font-semibold">
          {totalExpense > 0 && (
            <span className="text-stone-800 dark:text-stone-200">
              −{formatCurrency(totalExpense, userSettings.currency)}
            </span>
          )}
          {totalIncome > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalIncome, userSettings.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Grouped List of filtered items */}
      <div className="mt-4 space-y-4">
        {filteredOperations.length === 0 ? (
          <div className="py-12 text-center text-stone-400 dark:text-stone-500 text-xs">
            Ничего не найдено по выбранным фильтрам
          </div>
        ) : (
          groupedList.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex items-center justify-between px-2 pt-1 text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {formatRelativeDate(group.date)}
                </span>
                {group.dayExpenseTotal > 0 && (
                  <span className="text-stone-400 dark:text-stone-500 font-medium">
                    расход: {formatCurrency(group.dayExpenseTotal, userSettings.currency)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {group.items.map((op) => (
                  <OperationItem
                    key={op.id}
                    operation={op}
                    categories={categories}
                    currency={userSettings.currency}
                    onClick={() => setSelectedOp(op)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      <OperationModal
        operation={selectedOp}
        onClose={() => setSelectedOp(null)}
      />
    </div>
  );
};
