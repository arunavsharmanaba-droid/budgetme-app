import React, { useMemo, useState } from 'react';
import { Sparkles, Moon, Sun, ArrowRight } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MonthSelector } from './MonthSelector';
import { BalanceCard } from './BalanceCard';
import { QuickEntry } from './QuickEntry';
import { OperationItem } from './OperationItem';
import { OperationModal } from './OperationModal';
import { InvitePartnerModal } from './InvitePartnerModal';
import { Operation } from '../types/budget';
import { formatCurrency, formatRelativeDate } from '../lib/formatters';

interface HomeScreenProps {
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenHistory, onOpenSettings }) => {
  const { operations, categories, selectedMonth, userSettings, household, members } = useBudget();
  const { user } = useAuth();
  const { isDark, setTheme, theme } = useTheme();

  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Filter operations for selected month and group by day
  const { monthOps, groupedByDay } = useMemo(() => {
    const list = operations.filter((op) => op.date.startsWith(selectedMonth));
    
    // Group by day (YYYY-MM-DD)
    const groups: { date: string; items: Operation[]; dayExpenseTotal: number }[] = [];
    const map = new Map<string, { date: string; items: Operation[]; dayExpenseTotal: number }>();

    for (const op of list) {
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

    // Sort days descending
    groups.sort((a, b) => b.date.localeCompare(a.date));

    return {
      monthOps: list,
      groupedByDay: groups,
    };
  }, [operations, selectedMonth]);

  const toggleTheme = () => {
    if (theme === 'dark' || (theme === 'system' && isDark)) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
            Б
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                Бюджет
              </h1>
              {household && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
                >
                  <span>{members.length === 2 ? '👫 2 в семье' : '👤 +1 супруг'}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate max-w-[170px]">
              {household ? household.name : 'семейный блокнот'}
            </p>
          </div>
        </div>

        {/* Right Header actions: Theme toggle and Auth */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            aria-label="Сменить тему"
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 p-1 pl-2 bg-stone-100 dark:bg-stone-800/80 rounded-xl text-xs text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-200 transition-colors"
            >
              <span className="truncate max-w-[80px]">
                {user.displayName?.split(' ')[0] || 'Профиль'}
              </span>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-6 h-6 rounded-lg object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
              )}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              Семья
            </div>
          )}
        </div>
      </header>

      {/* Month selector & Balance Overview */}
      <section className="mt-2 space-y-2.5">
        <MonthSelector />
        <BalanceCard />
      </section>

      {/* Quick Entry Box */}
      <section className="mt-4">
        <QuickEntry />
      </section>

      {/* Operations List Header */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider text-xs">
            Записи месяца ({monthOps.length})
          </h2>
          {monthOps.length > 5 && onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
            >
              <span>Все записи</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Empty state */}
        {monthOps.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center mt-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">
              В этом месяце пока пусто
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
              Внесите первую запись за 2 секунды. Напишите, например: «Продукты 850» или «Кофе 240»
            </p>
          </div>
        ) : (
          /* Day grouped operations list */
          <div className="space-y-4">
            {groupedByDay.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Day Header with day expenses sum */}
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

                {/* Day Items */}
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
            ))}
          </div>
        )}
      </section>

      {/* Edit modal */}
      <OperationModal
        operation={selectedOp}
        onClose={() => setSelectedOp(null)}
      />

      {/* Invite partner modal */}
      {isInviteModalOpen && (
        <InvitePartnerModal onClose={() => setIsInviteModalOpen(false)} />
      )}
    </div>
  );
};
