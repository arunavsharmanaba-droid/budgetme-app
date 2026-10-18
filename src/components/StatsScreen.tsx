import React, { useMemo, useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  PieChart,
  Calendar,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  ArrowDownRight,
  Flame,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { MonthSelector } from './MonthSelector';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, formatMonthName, getAdjacentMonthKey } from '../lib/formatters';

export const StatsScreen: React.FC = () => {
  const { operations, categories, selectedMonth, userSettings } = useBudget();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Previous month key for comparison
  const prevMonthKey = useMemo(() => getAdjacentMonthKey(selectedMonth, -1), [selectedMonth]);

  // Current month stats
  const currentMonthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap = new Map<string, { total: number; subcategories: Map<string, number> }>();
    const dayMap = new Map<number, number>();
    const expensesList: { id: string; description: string; amount: number; date: string; categoryId: string }[] = [];

    // Days in current selected month
    const [y, m] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap.set(d, 0);
    }

    for (const op of operations) {
      if (op.date.startsWith(selectedMonth)) {
        if (op.type === 'income') {
          income += op.amount;
        } else if (op.type === 'expense') {
          expense += op.amount;
          expensesList.push({
            id: op.id,
            description: op.description,
            amount: op.amount,
            date: op.date,
            categoryId: op.categoryId,
          });

          // Category aggregation
          const cId = op.categoryId || 'uncategorized';
          if (!catMap.has(cId)) {
            catMap.set(cId, { total: 0, subcategories: new Map() });
          }
          const catEntry = catMap.get(cId)!;
          catEntry.total += op.amount;

          if (op.subcategoryId) {
            const currentSub = catEntry.subcategories.get(op.subcategoryId) || 0;
            catEntry.subcategories.set(op.subcategoryId, currentSub + op.amount);
          }

          // Day aggregation
          const dayNum = parseInt(op.date.split('-')[2], 10);
          if (dayMap.has(dayNum)) {
            dayMap.set(dayNum, (dayMap.get(dayNum) || 0) + op.amount);
          }
        }
      }
    }

    // Sort categories by total descending
    const categoryBreakdown = Array.from(catMap.entries()).map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      const subList = Array.from(data.subcategories.entries()).map(([subId, subTotal]) => {
        const sub = categories.find((c) => c.id === subId);
        return {
          id: subId,
          name: sub ? sub.name : 'Подкатегория',
          total: subTotal,
          percentOfCat: data.total > 0 ? (subTotal / data.total) * 100 : 0,
        };
      });
      subList.sort((a, b) => b.total - a.total);

      return {
        id: catId,
        name: cat ? cat.name : 'Без категории',
        icon: cat?.icon,
        color: cat?.color || '#94a3b8',
        total: data.total,
        percentage: expense > 0 ? (data.total / expense) * 100 : 0,
        subcategories: subList,
      };
    });
    categoryBreakdown.sort((a, b) => b.total - a.total);

    // Top 5 largest expenses
    expensesList.sort((a, b) => b.amount - a.amount);
    const topExpenses = expensesList.slice(0, 5);

    // Day dynamics array
    const dailyDynamics = Array.from(dayMap.entries()).map(([day, amount]) => ({
      day,
      amount,
    }));

    return {
      income,
      expense,
      balance: income - expense,
      categoryBreakdown,
      topExpenses,
      dailyDynamics,
      daysInMonth,
    };
  }, [operations, selectedMonth, categories]);

  // Previous month stats for comparison
  const prevMonthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const op of operations) {
      if (op.date.startsWith(prevMonthKey)) {
        if (op.type === 'income') income += op.amount;
        if (op.type === 'expense') expense += op.amount;
      }
    }
    return { income, expense };
  }, [operations, prevMonthKey]);

  // Compare expense with previous month
  const expenseComparison = useMemo(() => {
    if (prevMonthStats.expense === 0) return null;
    const diff = currentMonthStats.expense - prevMonthStats.expense;
    const percent = ((diff / prevMonthStats.expense) * 100).toFixed(1);
    return {
      diff,
      percent: Math.abs(parseFloat(percent)),
      isHigher: diff > 0,
    };
  }, [currentMonthStats.expense, prevMonthStats.expense]);

  // Max day spending for chart scale
  const maxDaySpending = useMemo(() => {
    return Math.max(...currentMonthStats.dailyDynamics.map((d) => d.amount), 1);
  }, [currentMonthStats.dailyDynamics]);

  const currency = userSettings.currency || 'RUB';

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Статистика
          </h1>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            анализ расходов и динамика
          </p>
        </div>
      </div>

      {/* Month selector */}
      <MonthSelector />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Расходы</span>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
            {formatCurrency(currentMonthStats.expense, currency)}
          </div>
          {expenseComparison && (
            <div className="flex items-center gap-1 mt-1 text-[11px]">
              {expenseComparison.isHigher ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{expenseComparison.percent}% к пред.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5" /> −{expenseComparison.percent}% к пред.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Доходы</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(currentMonthStats.income, currency)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            остаток: {formatCurrency(currentMonthStats.balance, currency)}
          </div>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Расходы по категориям
          </h2>
          <span className="text-xs text-stone-400 font-medium">
            {currentMonthStats.categoryBreakdown.length} категорий
          </span>
        </div>

        {currentMonthStats.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">
            Нет данных о расходах за этот месяц
          </p>
        ) : (
          <div className="space-y-3">
            {currentMonthStats.categoryBreakdown.map((cat) => {
              const isExpanded = expandedCatId === cat.id;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <button
                    onClick={() =>
                      cat.subcategories.length > 0 &&
                      setExpandedCatId(isExpanded ? null : cat.id)
                    }
                    className="w-full flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {cat.name}
                      </span>
                      {cat.subcategories.length > 0 && (
                        <span className="text-[10px] text-stone-400 group-hover:text-stone-600">
                          {isExpanded ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronRight className="w-3 h-3 inline" />}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-stone-400 font-medium">
                        {cat.percentage.toFixed(0)}%
                      </span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(cat.total, currency)}
                      </span>
                    </div>
                  </button>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>

                  {/* Subcategories Breakdown Accordion */}
                  {isExpanded && cat.subcategories.length > 0 && (
                    <div className="pl-9 pr-2 py-2 space-y-1 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-xs">
                      {cat.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between text-stone-600 dark:text-stone-300 py-0.5"
                        >
                          <span className="truncate">{sub.name}</span>
                          <div className="flex items-center gap-2 font-medium">
                            <span className="text-[10px] text-stone-400">
                              {sub.percentOfCat.toFixed(0)}%
                            </span>
                            <span>{formatCurrency(sub.total, currency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Dynamics Chart */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
        <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
          Динамика расходов по дням
        </h2>
        <div className="pt-4 pb-1">
          <div className="flex items-end gap-1 h-24 w-full">
            {currentMonthStats.dailyDynamics.map((item) => {
              const heightPercent =
                maxDaySpending > 0 ? (item.amount / maxDaySpending) * 100 : 0;
              return (
                <div
                  key={item.day}
                  title={`${item.day} числа: ${formatCurrency(item.amount, currency)}`}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end"
                >
                  <div
                    className={`w-full rounded-xs transition-all ${
                      item.amount > 0
                        ? 'bg-emerald-500/80 group-hover:bg-emerald-500'
                        : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                    style={{
                      height: `${Math.max(heightPercent, 4)}%`,
                    }}
                  />
                  {item.day % 5 === 0 && (
                    <span className="text-[9px] text-stone-400 mt-1">
                      {item.day}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 5 Largest Expenses */}
      {currentMonthStats.topExpenses.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
          <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-3">
            Самые крупные расходы
          </h2>
          <div className="space-y-2.5">
            {currentMonthStats.topExpenses.map((exp, idx) => {
              const cat = categories.find((c) => c.id === exp.categoryId);
              return (
                <div
                  key={exp.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-stone-800/60 last:border-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-[10px] text-stone-500">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {exp.description}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {cat?.name || 'Без категории'} · {exp.date}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100 ml-2">
                    {formatCurrency(exp.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
