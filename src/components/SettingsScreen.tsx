import React, { useState, useRef } from 'react';
import {
  User,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  FolderTree,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CategoryManagerModal } from './CategoryManagerModal';
import { InvitePartnerModal } from './InvitePartnerModal';
import { exportOperationsToCSV } from '../lib/formatters';

const CURRENCIES = [
  { code: 'RUB', label: 'Российский рубль (₽)' },
  { code: 'USD', label: 'Доллар США ($)' },
  { code: 'EUR', label: 'Евро (€)' },
  { code: 'KZT', label: 'Казахстанский тенге (₸)' },
  { code: 'BYN', label: 'Белорусский рубль (Br)' },
  { code: 'UAH', label: 'Украинская гривна (₴)' },
  { code: 'AMD', label: 'Армянский драм (֏)' },
  { code: 'GEL', label: 'Грузинский лари (₾)' },
];

export const SettingsScreen: React.FC = () => {
  const {
    household,
    members,
    leaveHousehold,
    userSettings,
    updateSettings,
    categories,
    operations,
    rules,
    addRule,
    deleteRule,
    exportBackup,
    importBackup,
    resetToDefaultCategories,
  } = useBudget();

  const { user, userProfile, updateUserProfile, signInWithGoogle, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInvitePartnerOpen, setIsInvitePartnerOpen] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCatId, setNewRuleCatId] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurrencyChange = async (newCurr: string) => {
    await updateSettings({ currency: newCurr });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim() || !newRuleCatId) return;

    const cat = categories.find((c) => c.id === newRuleCatId);
    if (!cat) return;

    await addRule({
      keyword: newRuleKeyword.trim().toLowerCase(),
      categoryId: cat.parentId ? cat.parentId : cat.id,
      subcategoryId: cat.parentId ? cat.id : undefined,
      type: cat.type,
    });

    setNewRuleKeyword('');
    setNewRuleCatId('');
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupStatus('Резервная копия сохранена');
    setTimeout(() => setBackupStatus(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvStr = exportOperationsToCSV(operations, categories);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_operations_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importBackup(content);
      if (success) {
        setBackupStatus('Данные успешно восстановлены!');
      } else {
        setBackupStatus('Ошибка при чтении резервной копии');
      }
      setTimeout(() => setBackupStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-4 space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Настройки
        </h1>
        <p className="text-[11px] text-stone-400 dark:text-stone-500">
          синхронизация, категории и резервные копии
        </p>
      </div>

      {backupStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{backupStatus}</span>
        </div>
      )}

      {/* Account / Cloud Sync */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Облачная синхронизация
              </h2>
              <p className="text-[11px] text-stone-400">
                {user ? 'Синхронизировано с Google аккаунтом' : 'Локальный режим на телефоне'}
              </p>
            </div>
          </div>
        </div>

        {user ? (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {user.displayName || 'Пользователь'}
                </p>
                <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
              Войдите с Google, чтобы данные автоматически сохранялись в защищенном облаке Firestore и были доступны на всех ваших устройствах.
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Войти через Google</span>
            </button>
          </div>
        )}
      </section>

      {/* Family Household Section */}
      {household && (
        <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Семейный бюджет
                </h2>
                <p className="text-[11px] text-stone-400">
                  {household.name} · {members.length} участников
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsInvitePartnerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Пригласить</span>
            </button>
          </div>

          {/* Members preview */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold uppercase text-stone-400">
              Участники общего бюджета:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    {m.displayName?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {m.displayName}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {m.familyRole || (m.role === 'owner' ? 'Создатель' : 'Супруг')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User's own family role switcher */}
          <div className="pt-1">
            <span className="block text-[10px] font-semibold uppercase text-stone-400 mb-1.5">
              Ваша роль в записях:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {['Муж', 'Жена', 'Партнер'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateUserProfile({ familyRole: role })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    userProfile?.familyRole === role
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Leave household */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <button
              onClick={() => {
                if (window.confirm('Вы уверены, что хотите выйти из этого семейного пространства?')) {
                  leaveHousehold();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium"
            >
              Покинуть семейный бюджет
            </button>
          </div>
        </section>
      )}

      {/* Categories & Subcategories Manager button */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Категории
              </h2>
              <p className="text-[11px] text-stone-400">
                {categories.length} категорий и подкатегорий
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Настроить
          </button>
        </div>
      </section>

      {/* Auto-categorization Rules */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Правила автокатегоризации
            </h2>
            <p className="text-[11px] text-stone-400">
              ключевые слова для мгновенного распознавания
            </p>
          </div>
        </div>

        {/* Form to add rule */}
        <form onSubmit={handleCreateRule} className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newRuleKeyword}
              onChange={(e) => setNewRuleKeyword(e.target.value)}
              placeholder="Слово (напр. роллы, ozon, латте)"
              className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
            />
            <select
              value={newRuleCatId}
              onChange={(e) => setNewRuleCatId(e.target.value)}
              className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 focus:outline-none truncate"
            >
              <option value="">Выберите категорию...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `  ↳ ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newRuleKeyword.trim() || !newRuleCatId}
              className="p-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Existing custom rules */}
        {rules.length > 0 ? (
          <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto">
            {rules.map((rule) => {
              const cat = categories.find((c) => c.id === rule.categoryId);
              const sub = rule.subcategoryId
                ? categories.find((c) => c.id === rule.subcategoryId)
                : null;

              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between text-xs p-2 bg-stone-50 dark:bg-stone-800/50 rounded-xl"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      «{rule.keyword}»
                    </span>
                    <span className="text-stone-400 ml-1.5">
                      → {cat?.name || 'Категория'}
                      {sub && ` / ${sub.name}`}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 text-stone-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-stone-400 italic">
            Правила создаются автоматически при редактировании записей или вручную выше.
          </p>
        )}
      </section>

      {/* Currency & Theme */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-4">
        {/* Currency selection */}
        <div>
          <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
            Основная валюта
          </label>
          <select
            value={userSettings.currency || 'RUB'}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme selection */}
        <div>
          <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
            Тема оформления
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs font-medium">
            <button
              onClick={() => setTheme('light')}
              className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Светлая</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Тёмная</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                theme === 'system'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-stone-400" />
              <span>Авто</span>
            </button>
          </div>
        </div>
      </section>

      {/* Backup and Data Management */}
      <section className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          Экспорт и резервные копии
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Скачать JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Загрузить JSON</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleExportCSV}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Экспортировать все операции в CSV (Excel)</span>
        </button>

        {/* Reset categories button */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={() => {
              if (window.confirm('Сбросить категории до начальных стандартных?')) {
                resetToDefaultCategories();
              }
            }}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Сбросить категории до исходных по умолчанию</span>
          </button>
        </div>
      </section>

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <CategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />
      )}

      {/* Invite Partner Modal */}
      {isInvitePartnerOpen && (
        <InvitePartnerModal onClose={() => setIsInvitePartnerOpen(false)} />
      )}
    </div>
  );
};
