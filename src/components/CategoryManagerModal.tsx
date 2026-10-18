import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Tag,
  Palette,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Category, OperationType } from '../types/budget';
import { useBudget } from '../context/BudgetContext';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcon';

interface CategoryManagerModalProps {
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#64748b', // slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ onClose }) => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    resetToDefaultCategories,
  } = useBudget();

  const [activeType, setActiveType] = useState<OperationType>('expense');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // New Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [parentCatForNewSub, setParentCatForNewSub] = useState<string | null>(null);

  // Edit Category State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editParentId, setEditParentId] = useState('');

  // Delete Category with Migration State
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [replacementCatId, setReplacementCatId] = useState('uncategorized');

  // Filter root categories of active type
  const rootCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parentId && c.type === activeType)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, activeType]);

  // Subcategories mapped by parentId
  const subcategoriesMap = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.parentId) {
        if (!map.has(c.parentId)) map.set(c.parentId, []);
        map.get(c.parentId)!.push(c);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [categories]);

  // Handle reorder
  const handleMove = async (catId: string, direction: 'up' | 'down') => {
    const list = [...rootCategories];
    const index = list.findIndex((c) => c.id === catId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    } else {
      return;
    }

    await reorderCategories(list.map((c) => c.id));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await addCategory({
      name: newCatName.trim(),
      type: activeType,
      parentId: parentCatForNewSub || '',
      icon: newCatIcon,
      color: newCatColor,
      sortOrder: (parentCatForNewSub ? (subcategoriesMap.get(parentCatForNewSub)?.length || 0) : rootCategories.length) + 1,
    });

    setNewCatName('');
    setIsAddingCategory(false);
    setParentCatForNewSub(null);
  };

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'Tag');
    setEditColor(cat.color || '#10b981');
    setEditParentId(cat.parentId || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCatId || !editName.trim()) return;

    await updateCategory(editingCatId, {
      name: editName.trim(),
      icon: editIcon,
      color: editColor,
      parentId: editParentId || undefined,
    });

    setEditingCatId(null);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCatId) return;
    await deleteCategory(deletingCatId, replacementCatId);
    setDeletingCatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Категории и подкатегории
            </h3>
            <p className="text-xs text-stone-400">
              структура вашего бюджета
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operation Type Selector */}
        <div className="px-6 pt-3 pb-2">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveType('expense');
                setIsAddingCategory(false);
                setEditingCatId(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                activeType === 'expense'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Расходы
            </button>
            <button
              onClick={() => {
                setActiveType('income');
                setIsAddingCategory(false);
                setEditingCatId(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                activeType === 'income'
                  ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Доходы
            </button>
            <button
              onClick={() => {
                setActiveType('transfer');
                setIsAddingCategory(false);
                setEditingCatId(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                activeType === 'transfer'
                  ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Переводы
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2.5">
          {rootCategories.map((cat, idx) => {
            const isExpanded = expandedCatId === cat.id;
            const subs = subcategoriesMap.get(cat.id) || [];
            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-800 rounded-2xl p-3 transition-all"
              >
                {/* Category Main Row */}
                {isEditing ? (
                  /* Edit inline mode */
                  <div className="space-y-3 p-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />

                    {/* Colors */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full flex-shrink-0 transition-transform ${
                            editColor === c ? 'scale-125 ring-2 ring-stone-900 dark:ring-white' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {/* Icons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {AVAILABLE_ICONS.slice(0, 10).map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditIcon(iconName)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            editIcon === iconName
                              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          <CategoryIcon name={iconName} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate block">
                          {cat.name}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {subs.length > 0 ? `${subs.length} подкатегорий` : 'Без подкатегорий'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Move up/down */}
                      <button
                        onClick={() => handleMove(cat.id, 'up')}
                        disabled={idx === 0}
                        title="Поднять выше"
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(cat.id, 'down')}
                        disabled={idx === rootCategories.length - 1}
                        title="Опустить ниже"
                        className="p-1 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeletingCatId(cat.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Expand / Collapse */}
                      <button
                        onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        className="p-1 text-stone-400 hover:text-stone-600"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Subcategories Section */}
                {isExpanded && !isEditing && (
                  <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/60 pl-4 space-y-2">
                    {subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <span className="text-stone-700 dark:text-stone-300 font-medium">
                          {sub.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(sub)}
                            className="p-1 text-stone-400 hover:text-stone-600"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeletingCatId(sub.id)}
                            className="p-1 text-rose-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add subcategory button */}
                    <button
                      onClick={() => {
                        setParentCatForNewSub(cat.id);
                        setIsAddingCategory(true);
                      }}
                      className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить подкатегорию</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category Form or Button */}
          {isAddingCategory ? (
            <form
              onSubmit={handleCreateCategory}
              className="bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 space-y-3 mt-3"
            >
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase">
                {parentCatForNewSub ? 'Новая подкатегория' : 'Новая категория'}
              </h4>

              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Название (например: Спортивное питание)"
                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm"
              />

              {/* Color picker */}
              {!parentCatForNewSub && (
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Цвет</label>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`w-6 h-6 rounded-full flex-shrink-0 transition-transform ${
                          newCatColor === c ? 'scale-125 ring-2 ring-stone-900 dark:ring-white' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Icon selector */}
              {!parentCatForNewSub && (
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">Иконка</label>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {AVAILABLE_ICONS.slice(0, 10).map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCatIcon(iconName)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          newCatIcon === iconName
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                            : 'bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        <CategoryIcon name={iconName} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setParentCatForNewSub(null);
                  }}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl text-xs font-semibold"
                >
                  Создать
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setParentCatForNewSub(null);
                setIsAddingCategory(true);
              }}
              className="w-full py-3 border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Создать новую категорию</span>
            </button>
          )}
        </div>

        {/* Delete with Migration Modal Dialog */}
        {deletingCatId && (
          <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Удаление категории
                </h4>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">
                Чтобы не потерять историю расходов, выберите категорию, в которую будут перенесены операции:
              </p>

              <select
                value={replacementCatId}
                onChange={(e) => setReplacementCatId(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="uncategorized">Оставить «Без категории»</option>
                {rootCategories
                  .filter((c) => c.id !== deletingCatId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCatId(null)}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-stone-700"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCategory}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                >
                  Удалить и перенести
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
