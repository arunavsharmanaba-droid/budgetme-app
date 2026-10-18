import React, { useState } from 'react';
import { PlusCircle, UserPlus, Heart, Check, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';

export const HouseholdOnboardingScreen: React.FC = () => {
  const { createHousehold, joinHouseholdByCode } = useBudget();
  const { user, userProfile, logout } = useAuth();

  const pendingCode = sessionStorage.getItem('pending_invite_code') || '';
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(pendingCode ? 'join' : 'choose');
  const [householdName, setHouseholdName] = useState('Наш семейный бюджет');
  const [familyRole, setFamilyRole] = useState(userProfile?.familyRole || (pendingCode ? 'Жена' : 'Муж'));
  const [inviteCode, setInviteCode] = useState(pendingCode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      await createHousehold(householdName, familyRole);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Не удалось создать бюджет');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    const result = await joinHouseholdByCode(inviteCode, familyRole);
    if (!result.success) {
      setErrorMessage(result.error || 'Ошибка при вводе кода приглашения');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="pt-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              Б
            </div>
            <span className="font-bold text-base">Бюджет</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>

        <div className="pt-6 text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Семейный доступ
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
            Здравствуйте, <span className="font-semibold text-stone-800 dark:text-stone-200">{user?.displayName?.split(' ')[0]}</span>! Создайте семейное пространство для двоих или присоединитесь по коду от супруга(и).
          </p>
        </div>
      </div>

      {/* Main Choice Cards or Sub-Forms */}
      <div className="py-6">
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        {mode === 'choose' && (
          <div className="space-y-4">
            {/* Create Card */}
            <button
              onClick={() => {
                setErrorMessage(null);
                setMode('create');
              }}
              className="w-full text-left p-5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Создать семейный бюджет
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Вы станете создателем пространства и сможете сразу отправить приглашение второму участнику.
              </p>
            </button>

            {/* Join Card */}
            <button
              onClick={() => {
                setErrorMessage(null);
                setMode('join');
              }}
              className="w-full text-left p-5 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Присоединиться по приглашению
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Если ваш супруг(а) уже создал(а) бюджет и прислал(а) вам код или ссылку.
              </p>
            </button>
          </div>
        )}

        {/* Create Mode Form */}
        {mode === 'create' && (
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 shadow-sm space-y-4"
          >
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Новый семейный бюджет
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                Название семейного пространства
              </label>
              <input
                type="text"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Например: Семья Ивановых или Наш дом"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Кто вы в семье? (отображается в записях)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Муж', 'Жена', 'Партнер'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFamilyRole(role)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      familyRole === role
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex-1 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать бюджет'}
              </button>
            </div>
          </form>
        )}

        {/* Join Mode Form */}
        {mode === 'join' && (
          <form
            onSubmit={handleJoin}
            className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 shadow-sm space-y-4"
          >
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Вход по приглашению
            </h3>

            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
                Код приглашения
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Например: SEM-4892"
                className="w-full uppercase font-mono tracking-wider bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Кто вы в семье? (отображается в записях)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Жена', 'Муж', 'Партнер'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFamilyRole(role)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      familyRole === role
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex-1 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="flex-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Проверка...' : 'Присоединиться'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-center">
        <p className="text-[11px] text-stone-400">
          Семейный бюджет защищен правилами безопасности Firestore.
        </p>
      </div>
    </div>
  );
};
