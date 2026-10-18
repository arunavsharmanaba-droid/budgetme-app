import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Trash2,
  Check,
  Calendar,
  Sparkles,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Category, Operation, OperationType } from '../types/budget';
import { useBudget } from '../context/BudgetContext';
import { CategoryIcon } from './CategoryIcon';

interface OperationModalProps {
  operation: Operation | null;
  onClose: () => void;
}

export const OperationModal: React.FC<OperationModalProps> = ({ operation, onClose }) => {
  const { categories, updateOperation, deleteOperation, addRule, userSettings } = useBudget();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<OperationType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [createRuleCheck, setCreateRuleCheck] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (operation) {
      setDescription(operation.description);
      setAmount(operation.amount.toString());
      setType(operation.type);
      setCategoryId(operation.categoryId);
      setSubcategoryId(operation.subcategoryId || '');
      setDate(operation.date);
      setNote(operation.note || '');
      setCreateRuleCheck(false);
      setShowConfirmDelete(false);
    }
  }, [operation]);

  // Root categories of matching type
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId && c.type === type);
  }, [categories, type]);

  // Subcategories for currently selected parent
  const availableSubcategories = useMemo(() => {
    if (!categoryId) return [];
    return categories.filter((c) => c.parentId === categoryId);
  }, [categories, categoryId]);

  if (!operation) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;

    await updateOperation(operation.id, {
      description: description.trim(),
      amount: numAmount,
      type,
      categoryId,
      subcategoryId: subcategoryId || '',
      date,
      note: note.trim() || undefined,
    });

    // Optionally save auto-categorization rule
    if (createRuleCheck && description.trim() && categoryId) {
      const keyword = description.trim().toLowerCase();
      await addRule({
        keyword,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        type,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteOperation(operation.id);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Редактирование операции
          </h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Operation Type Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryId('');
                setSubcategoryId('');
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              <span>Расход</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryId('');
                setSubcategoryId('');
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Доход</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategoryId('');
                setSubcategoryId('');
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'transfer'
                  ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
              <span>Перевод</span>
            </button>
          </div>

          {/* Amount & Currency */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Сумма ({userSettings.currency || 'RUB'})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xl font-bold bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Описание операции
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Например: Продукты в Перекрестке"
              className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Дата операции
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Категория
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-stone-200 dark:border-stone-700 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setCategoryId('uncategorized');
                  setSubcategoryId('');
                }}
                className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                  categoryId === 'uncategorized' || !categoryId
                    ? 'bg-stone-200 dark:bg-stone-700 font-semibold'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-stone-300 dark:bg-stone-600 flex items-center justify-center">
                  <span className="text-[10px]">?</span>
                </div>
                <span className="truncate">Без категории</span>
              </button>

              {rootCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setSubcategoryId('');
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                    categoryId === c.id
                      ? 'bg-stone-200 dark:bg-stone-700 font-semibold'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${c.color}25`, color: c.color }}
                  >
                    <CategoryIcon name={c.icon} className="w-3 h-3" />
                  </div>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory */}
          {availableSubcategories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                Подкатегория (необязательно)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubcategoryId('')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    !subcategoryId
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  Общая
                </button>
                {availableSubcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubcategoryId(sub.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      subcategoryId === sub.id
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Примечание (необязательно)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Дополнительный комментарий"
              className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Auto-rule prompt checkbox */}
          {description.trim() && categoryId && categoryId !== 'uncategorized' && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={createRuleCheck}
                onChange={(e) => setCreateRuleCheck(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs text-stone-600 dark:text-stone-300">
                <span className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" /> Запомнить правило
                </span>
                <span>
                  Всегда определять «{description.trim().toLowerCase()}» как эту категорию
                </span>
              </div>
            </label>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800">
            {showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
                >
                  Удалить точно?
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2.5 py-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 text-xs font-medium"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить</span>
              </button>
            )}

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 ml-auto"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
